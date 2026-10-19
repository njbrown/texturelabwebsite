import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import Environment, { type EnvironmentFormat } from '#models/environment'
import { publicUrl, putPrivate, putPublic, remove, storageKeys } from '#services/storage_service'

export const MAX_ENVIRONMENT_BYTES = 100 * 1024 * 1024
const THUMB_WIDTH = 384

export class EnvironmentError extends Error {}

/**
 * Radiance files start with `#?RADIANCE` (or `#?RGBE`); OpenEXR with the
 * magic number 76 2f 31 01.
 */
export function sniffFormat(bytes: Uint8Array): EnvironmentFormat | null {
  const head = String.fromCharCode(...bytes.slice(0, 10))
  if (head.startsWith('#?RADIANCE') || head.startsWith('#?RGBE')) return 'hdr'
  if (bytes[0] === 0x76 && bytes[1] === 0x2f && bytes[2] === 0x31 && bytes[3] === 0x01) return 'exr'
  return null
}

/** The format a link points at, from its path's extension. */
export function formatFromUrl(value: string): EnvironmentFormat | null {
  try {
    const { pathname, protocol } = new URL(value)
    if (protocol !== 'https:' && protocol !== 'http:') return null
    const match = pathname.toLowerCase().match(/\.(hdr|exr)$/)
    return match ? (match[1] as EnvironmentFormat) : null
  } catch {
    return null
  }
}

async function nextSortOrder() {
  const last = await Environment.query().orderBy('sort_order', 'desc').first()
  return last ? last.sortOrder + 1 : 0
}

async function setDefaultIfFirst(environment: Environment) {
  const others = await Environment.query().whereNot('id', environment.id).first()
  if (!others) await makeDefault(environment)
}

export async function createFromUpload(name: string, contents: Uint8Array) {
  if (contents.byteLength > MAX_ENVIRONMENT_BYTES) {
    throw new EnvironmentError('HDRIs are limited to 100 MB')
  }

  const format = sniffFormat(contents)
  if (!format) throw new EnvironmentError("That isn't a Radiance .hdr or OpenEXR .exr file")

  const key = storageKeys.environment(`${randomUUID()}.${format}`)
  await putPrivate(key, contents, format === 'hdr' ? 'image/vnd.radiance' : 'image/x-exr')

  const environment = await Environment.create({
    name,
    format,
    source: 'upload',
    key,
    url: null,
    bytes: contents.byteLength,
    thumbKey: null,
    isDefault: false,
    sortOrder: await nextSortOrder(),
  })
  await setDefaultIfFirst(environment)
  return environment
}

export async function createFromUrl(name: string, url: string) {
  const format = formatFromUrl(url)
  if (!format) {
    throw new EnvironmentError('Use an http(s) link to a file ending in .hdr or .exr')
  }

  const environment = await Environment.create({
    name,
    format,
    source: 'url',
    key: null,
    url,
    bytes: null,
    thumbKey: null,
    isDefault: false,
    sortOrder: await nextSortOrder(),
  })
  await setDefaultIfFirst(environment)
  return environment
}

/**
 * A preview of the HDRI, captured from the viewer in /ops.
 */
export async function setThumbnail(environment: Environment, contents: Uint8Array) {
  let thumb: Buffer
  try {
    thumb = await sharp(contents, { limitInputPixels: 4096 * 4096 })
      .resize(THUMB_WIDTH, THUMB_WIDTH, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer()
  } catch {
    throw new EnvironmentError("That file couldn't be read as an image")
  }

  const previous = environment.thumbKey
  environment.thumbKey = storageKeys.environmentThumb(`${randomUUID()}.webp`)
  await putPublic(environment.thumbKey, thumb, { contentType: 'image/webp' })
  await environment.save()
  if (previous) await remove(previous)
}

export async function makeDefault(environment: Environment) {
  await Environment.query().whereNot('id', environment.id).update({ is_default: false })
  environment.isDefault = true
  await environment.save()
}

export async function deleteEnvironment(environment: Environment) {
  await environment.delete()
  if (environment.key) await remove(environment.key)
  if (environment.thumbKey) await remove(environment.thumbKey)

  if (environment.isDefault) {
    const next = await Environment.query()
      .withScopes((scopes) => scopes.ordered())
      .first()
    if (next) await makeDefault(next)
  }
}

export async function presentEnvironment(environment: Environment) {
  return {
    id: environment.id,
    name: environment.name,
    format: environment.format,
    source: environment.source,
    // Uploads go through the app, so the browser needs no CORS access to the bucket.
    url:
      environment.source === 'upload' ? `/environments/${environment.id}/file` : environment.url!,
    thumbUrl: environment.thumbKey ? await publicUrl(environment.thumbKey) : null,
    bytes: environment.bytes,
    isDefault: environment.isDefault,
    sortOrder: environment.sortOrder,
  }
}

export async function listEnvironments() {
  const environments = await Environment.query().withScopes((scopes) => scopes.ordered())
  return Promise.all(environments.map(presentEnvironment))
}

export type PresentedEnvironment = Awaited<ReturnType<typeof presentEnvironment>>
