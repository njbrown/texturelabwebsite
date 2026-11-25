import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import sharp, { type OutputInfo } from 'sharp'
import db from '@adonisjs/lucid/services/db'
import Texture from '#models/texture'
import TextureImage from '#models/texture_image'
import type { ImageSource } from '#models/texture_image'
import TextureOutput from '#models/texture_output'
import TextureCategory from '#models/texture_category'
import { renderMarkdown } from '#services/markdown_service'
import {
  publicUrl,
  putPrivate,
  putPublic,
  removePrefix,
  remove,
  storageKeys,
} from '#services/storage_service'
import type { TextureMetadata } from '#services/texture_metadata_service'
import { OG_HEIGHT, OG_WIDTH, ogImageVersion } from '#services/og_image_service'

/**
 * Every texture on the site is CC0 for now; a per-texture license can come
 * later.
 */
export const TEXTURE_LICENSE = {
  name: 'CC0 1.0',
  url: 'https://creativecommons.org/publicdomain/zero/1.0/',
}

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const IMAGE_MAX_SIZE = 2048
const THUMB_SIZE = 512

export class TextureServiceError extends Error {}

/*
|--------------------------------------------------------------------------
| Slugs
|--------------------------------------------------------------------------
*/

export function slugify(value: string) {
  return (
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'texture'
  )
}

/** A file name like `GoldLinedMarbleTiles.texture` → "Gold Lined Marble Tiles". */
export function titleFromFileName(name: string) {
  const base = name.replace(/\.texture$/i, '').replace(/[_-]+/g, ' ')
  const spaced = base.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim()
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : 'Untitled'
}

export async function uniqueSlug(base: string, ignoreId?: string) {
  const root = slugify(base)

  for (let n = 1; ; n++) {
    const slug = n === 1 ? root : `${root}-${n}`
    const taken = await Texture.query()
      .where('slug', slug)
      .if(ignoreId, (query) => query.whereNot('id', ignoreId!))
      .first()
    if (!taken) return slug
  }
}

/*
|--------------------------------------------------------------------------
| Source files and metadata
|--------------------------------------------------------------------------
*/

function metadataAttributes(meta: TextureMetadata) {
  return {
    sourceSha256: meta.sha256,
    sourceBytes: meta.bytes,
    libraryVersion: meta.libraryVersion,
    appVersion: meta.appVersion,
    resolution: meta.resolution,
    nodeCount: meta.nodeCount,
    connectionCount: meta.connectionCount,
    channels: meta.channels,
    variables: meta.variables,
    presets: meta.presets,
    activePreset: meta.activePreset,
    warnings: meta.warnings,
  }
}

type TextureFields = {
  title: string
  slug?: string | null
  description?: string | null
  categoryId?: string | null
  tags?: string[]
  featured?: boolean
  sortOrder?: number
}

export async function createTexture(
  contents: Uint8Array,
  fileName: string,
  meta: TextureMetadata,
  fields: TextureFields
) {
  // The key needs the id, so the row is created first with a placeholder.
  const texture = await Texture.create({
    title: fields.title,
    slug: await uniqueSlug(fields.slug || fields.title),
    description: fields.description ?? null,
    categoryId: fields.categoryId ?? null,
    tags: fields.tags ?? [],
    featured: fields.featured ?? false,
    sortOrder: fields.sortOrder ?? 0,
    status: 'draft',
    outputsRevision: 0,
    outputsSha256: null,
    downloadCount: 0,
    sourceKey: '',
    sourceName: fileName,
    ...metadataAttributes(meta),
  })

  try {
    texture.sourceKey = storageKeys.source(texture.id, meta.sha256)
    await putPrivate(texture.sourceKey, contents, 'application/json')
    await texture.save()
  } catch (error) {
    await texture.delete()
    throw error
  }

  return texture
}

/**
 * Swap in a new version of the file. Outputs rendered from the old one stay
 * visible until they are re-rendered; `outputsStale` flags them in /ops.
 */
export async function replaceSource(
  texture: Texture,
  contents: Uint8Array,
  fileName: string,
  meta: TextureMetadata
) {
  const previousKey = texture.sourceKey
  const key = storageKeys.source(texture.id, meta.sha256)

  await putPrivate(key, contents, 'application/json')
  texture.merge({ sourceKey: key, sourceName: fileName, ...metadataAttributes(meta) })
  await texture.save()

  if (previousKey && previousKey !== key) await remove(previousKey)
}

export async function deleteTexture(texture: Texture) {
  await texture.delete()
  for (const prefix of storageKeys.texture(texture.id)) {
    await removePrefix(prefix)
  }
}

/*
|--------------------------------------------------------------------------
| Outputs (rendered in the admin's browser)
|--------------------------------------------------------------------------
*/

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const PNG_COLOR_TYPES: Record<number, string> = { 0: 'grey', 2: 'rgb', 6: 'rgba' }

/**
 * Width, height, bit depth and color type straight from the IHDR chunk, so
 * what the site states about an output is what's in the file.
 */
export function readPngHeader(bytes: Uint8Array) {
  const isPng = PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)
  const ihdr = String.fromCharCode(...bytes.slice(12, 16))
  if (!isPng || ihdr !== 'IHDR' || bytes.byteLength < 33) return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const colorType = PNG_COLOR_TYPES[bytes[25]]
  if (!colorType) return null

  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    bitDepth: bytes[24],
    colorType,
  }
}

export type OutputUpload = { channel: string; bytes: Uint8Array }

/**
 * A 512px webp of a map, for grids and card hovers; the PNG itself can be
 * several MB.
 */
export async function outputThumbnail(png: Uint8Array) {
  return sharp(png)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
    .toColourspace('srgb')
    .webp({ quality: 82 })
    .toBuffer()
}

/**
 * Store a full set of outputs as a new revision and drop the previous one.
 * `renderedFrom` is the source hash the browser rendered; it must still be the
 * current file, or the outputs would describe a different graph.
 */
export async function storeOutputs(
  texture: Texture,
  uploads: OutputUpload[],
  renderedFrom: string,
  renderTargetFormat: string | null
) {
  if (renderedFrom !== texture.sourceSha256) {
    throw new TextureServiceError(
      'The .texture file changed while this render was running. Render again.'
    )
  }

  const expected = new Map(texture.channels.map((c) => [c.channel, c]))
  const seen = new Set<string>()
  const checked = uploads.map((upload) => {
    const spec = expected.get(upload.channel as never)
    if (!spec) throw new TextureServiceError(`"${upload.channel}" isn't a channel of this texture`)
    if (seen.has(upload.channel)) throw new TextureServiceError(`"${upload.channel}" sent twice`)
    seen.add(upload.channel)

    const header = readPngHeader(upload.bytes)
    if (!header) throw new TextureServiceError(`The ${upload.channel} output isn't a valid PNG`)
    if (header.width !== header.height || header.width > 4096) {
      throw new TextureServiceError(`The ${upload.channel} output has an unexpected size`)
    }

    return { upload, header, spec }
  })

  const missing = [...expected.keys()].filter((channel) => !seen.has(channel))
  if (missing.length) {
    throw new TextureServiceError(`Missing outputs: ${missing.join(', ')}`)
  }

  const previous = texture.outputsRevision
  const revision = previous + 1

  for (const { upload, spec } of checked) {
    await putPublic(storageKeys.output(texture.id, revision, upload.channel), upload.bytes, {
      contentType: 'image/png',
      downloadName: `${texture.slug}_${spec.name}.png`,
    })
    await putPublic(
      storageKeys.outputThumb(texture.id, revision, upload.channel),
      await outputThumbnail(upload.bytes),
      { contentType: 'image/webp' }
    )
  }

  await db.transaction(async (trx) => {
    texture.useTransaction(trx)
    await TextureOutput.query({ client: trx }).where('texture_id', texture.id).delete()
    await TextureOutput.createMany(
      checked.map(({ upload, header }) => ({
        textureId: texture.id,
        revision,
        channel: upload.channel,
        key: storageKeys.output(texture.id, revision, upload.channel),
        thumbKey: storageKeys.outputThumb(texture.id, revision, upload.channel),
        width: header.width,
        height: header.height,
        bitDepth: header.bitDepth,
        colorType: header.colorType,
        format: 'png',
        bytes: upload.bytes.byteLength,
        renderTargetFormat,
      })),
      { client: trx }
    )
    texture.merge({ outputsRevision: revision, outputsSha256: renderedFrom })
    await texture.save()
  })

  if (previous > 0) await removePrefix(storageKeys.outputsRevision(texture.id, previous))
}

/*
|--------------------------------------------------------------------------
| Images
|--------------------------------------------------------------------------
*/

/**
 * Re-encode as webp: a display copy capped at 2048px and a 512px square
 * thumbnail for grids. The original isn't kept.
 */
export async function addImage(
  texture: Texture,
  contents: Uint8Array,
  options: { source: ImageSource; alt?: string | null; makePrimary?: boolean }
) {
  if (contents.byteLength > MAX_IMAGE_BYTES) {
    throw new TextureServiceError('Images are limited to 25 MB')
  }

  let display: { data: Buffer; info: OutputInfo }
  let thumb: Buffer
  try {
    const input = sharp(contents, { limitInputPixels: 8192 * 8192 }).rotate()
    display = await input
      .clone()
      .resize(IMAGE_MAX_SIZE, IMAGE_MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true })
    thumb = await input
      .clone()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    throw new TextureServiceError("That file couldn't be read as an image")
  }

  const name = randomUUID()
  const key = storageKeys.image(texture.id, `${name}.webp`)
  const thumbKey = storageKeys.image(texture.id, `${name}-${THUMB_SIZE}.webp`)

  await putPublic(key, display.data, { contentType: 'image/webp' })
  await putPublic(thumbKey, thumb, { contentType: 'image/webp' })

  const existing = await TextureImage.query().where('texture_id', texture.id)
  const primary = options.makePrimary || !existing.some((image) => image.isPrimary)

  if (primary) {
    await TextureImage.query().where('texture_id', texture.id).update({ is_primary: false })
  }

  return TextureImage.create({
    textureId: texture.id,
    key,
    thumbKey,
    width: display.info.width,
    height: display.info.height,
    bytes: display.data.byteLength,
    alt: options.alt ?? null,
    source: options.source,
    isPrimary: primary,
    sortOrder: existing.reduce((max, image) => Math.max(max, image.sortOrder + 1), 0),
  })
}

export async function makePrimary(image: TextureImage) {
  await TextureImage.query().where('texture_id', image.textureId).update({ is_primary: false })
  image.isPrimary = true
  await image.save()
}

export async function deleteImage(image: TextureImage) {
  await image.delete()
  await remove(image.key)
  await remove(image.thumbKey)

  if (image.isPrimary) {
    const next = await TextureImage.query()
      .where('texture_id', image.textureId)
      .orderBy('sort_order')
      .first()
    if (next) await makePrimary(next)
  }
}

export async function reorderImages(texture: Texture, ids: string[]) {
  const images = await TextureImage.query().where('texture_id', texture.id)
  const order = new Map(ids.map((id, index) => [id, index]))

  for (const image of images) {
    image.sortOrder = order.get(image.id) ?? ids.length + image.sortOrder
    await image.save()
  }
}

/*
|--------------------------------------------------------------------------
| Publishing
|--------------------------------------------------------------------------
*/

export async function publishProblems(texture: Texture) {
  const problems: string[] = []
  const images = await TextureImage.query().where('texture_id', texture.id).first()

  if (texture.outputsRevision === 0) problems.push('Render the outputs first.')
  else if (texture.outputsStale) problems.push('The outputs are out of date. Render them again.')
  if (!images) problems.push('Add at least one image (upload one, or capture the 3D preview).')

  return problems
}

export async function publish(texture: Texture) {
  texture.status = 'published'
  texture.publishedAt ??= DateTime.now()
  await texture.save()
}

export async function unpublish(texture: Texture) {
  texture.status = 'draft'
  await texture.save()
}

/*
|--------------------------------------------------------------------------
| Presenting
|--------------------------------------------------------------------------
*/

async function presentImage(image: TextureImage) {
  return {
    id: image.id,
    url: await publicUrl(image.key),
    thumbUrl: await publicUrl(image.thumbKey),
    width: image.width,
    height: image.height,
    bytes: image.bytes,
    alt: image.alt,
    source: image.source,
    isPrimary: image.isPrimary,
  }
}

function sortedImages(images: TextureImage[]) {
  return [...images].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) ||
      a.sortOrder - b.sortOrder ||
      a.createdAt.toMillis() - b.createdAt.toMillis()
  )
}

async function presentOutputs(texture: Texture, outputs: TextureOutput[]) {
  const specs = new Map(texture.channels.map((c) => [c.channel, c]))

  return Promise.all(
    texture.channels
      .map((spec) => outputs.find((output) => output.channel === spec.channel))
      .filter((output): output is TextureOutput => Boolean(output))
      .map(async (output) => ({
        channel: output.channel,
        name: specs.get(output.channel as never)?.name ?? output.channel,
        url: await publicUrl(output.key),
        thumbUrl: await publicUrl(output.thumbKey ?? output.key),
        width: output.width,
        height: output.height,
        bitDepth: output.bitDepth,
        colorType: output.colorType,
        bytes: output.bytes,
      }))
  )
}

function presentCategory(category: TextureCategory | null | undefined) {
  return category ? { id: category.id, slug: category.slug, name: category.name } : null
}

/**
 * A grid card. `hoverUrl` is the albedo map (or, without one, a second image)
 * to swap in on hover.
 */
export async function presentCard(texture: Texture) {
  const images = sortedImages(texture.images ?? [])
  const albedo = texture.outputs?.find((output) => output.channel === 'albedo')

  return {
    id: texture.id,
    slug: texture.slug,
    title: texture.title,
    category: presentCategory(texture.category),
    thumbUrl: images[0] ? await publicUrl(images[0].thumbKey) : null,
    hoverUrl: albedo
      ? await publicUrl(albedo.thumbKey ?? albedo.key)
      : images[1]
        ? await publicUrl(images[1].thumbKey)
        : null,
    resolution: texture.resolution,
    channelCount: texture.channels.length,
    variableCount: texture.variables.length,
    presetCount: texture.presets.length,
    featured: texture.featured,
  }
}

const CHANNEL_NAMES: Record<string, string> = {
  albedo: 'albedo',
  normal: 'normal',
  metalness: 'metalness',
  roughness: 'roughness',
  height: 'height',
  alpha: 'alpha',
  ao: 'ambient occlusion',
}

/** Plain text from rendered markdown, for meta descriptions. */
function plainText(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value: string, length: number) {
  if (value.length <= length) return value
  const cut = value.slice(0, length - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), length * 0.6))}…`
}

/**
 * One or two sentences for search results and share previews: the
 * description's opening, or one made from the texture's details.
 */
function summaryFor(texture: Texture, html: string) {
  const written = plainText(html)
  if (written) return truncate(written, 200)

  const kind = texture.category ? `${texture.category.name.toLowerCase()} texture` : 'texture'
  const maps = texture.channels.map((c) => CHANNEL_NAMES[c.channel] ?? c.channel)
  const list = maps.length > 1 ? `${maps.slice(0, -1).join(', ')} and ${maps.at(-1)}` : maps[0]
  const extras = texture.variables.length ? ' Adjust its parameters live in 3D.' : ''
  return `${texture.title}: a free CC0 procedural ${kind} made with TextureLab, with ${list} maps at ${texture.resolution}×${texture.resolution}.${extras}`
}

export async function presentTexture(texture: Texture) {
  const { html } = await renderMarkdown(texture.description ?? '')

  return {
    id: texture.id,
    slug: texture.slug,
    title: texture.title,
    description: texture.description ?? '',
    descriptionHtml: html,
    category: presentCategory(texture.category),
    tags: texture.tags,
    status: texture.status,
    featured: texture.featured,
    sortOrder: texture.sortOrder,
    publishedAt: texture.publishedAt?.toISO() ?? null,
    updatedAt: texture.updatedAt?.toISO() ?? null,
    resolution: texture.resolution,
    libraryVersion: texture.libraryVersion,
    appVersion: texture.appVersion,
    nodeCount: texture.nodeCount,
    connectionCount: texture.connectionCount,
    sourceName: texture.sourceName,
    sourceBytes: texture.sourceBytes,
    sourceSha256: texture.sourceSha256,
    channels: texture.channels,
    variables: texture.variables,
    presets: texture.presets,
    activePreset: texture.activePreset,
    warnings: texture.warnings,
    outputsRevision: texture.outputsRevision,
    outputsStale: texture.outputsStale,
    downloadCount: texture.downloadCount,
    outputs: await presentOutputs(texture, texture.outputs ?? []),
    images: await Promise.all(sortedImages(texture.images ?? []).map(presentImage)),
    license: TEXTURE_LICENSE,
    summary: summaryFor(texture, html),
    ogImage: {
      url: `/textures/${texture.slug}/og.jpg?v=${ogImageVersion(texture)}`,
      width: OG_WIDTH,
      height: OG_HEIGHT,
    },
  }
}

export type PresentedTexture = Awaited<ReturnType<typeof presentTexture>>
export type PresentedCard = Awaited<ReturnType<typeof presentCard>>
