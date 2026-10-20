import { createHash } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import sharp, { type OverlayOptions } from 'sharp'
import type Texture from '#models/texture'
import type TextureImage from '#models/texture_image'
import { putPublic, readBytes, removePrefix, storageKeys } from '#services/storage_service'

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/** Bump when the layout changes, so every card is redrawn. */
const LAYOUT_VERSION = 1

const FONT_BOLD = app.makePath('resources/fonts/Barlow-Bold.ttf')
const FONT_MEDIUM = app.makePath('resources/fonts/Barlow-Medium.ttf')
const LOGO = app.makePath('public/images/logo.svg')

const CHANNEL_ORDER = ['albedo', 'normal', 'roughness', 'height', 'metalness', 'ao', 'alpha']
const CHANNEL_LABELS: Record<string, string> = {
  albedo: 'ALBEDO',
  normal: 'NORMAL',
  roughness: 'ROUGHNESS',
  height: 'HEIGHT',
  metalness: 'METALNESS',
  ao: 'AO',
  alpha: 'ALPHA',
}

function primaryImage(texture: Texture): TextureImage | null {
  const images = [...(texture.images ?? [])].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder
  )
  return images[0] ?? null
}

/**
 * Changes whenever something drawn on the card does, so the card's URL does
 * too and social networks fetch the new one.
 */
export function ogImageVersion(texture: Texture) {
  const inputs = [
    LAYOUT_VERSION,
    texture.title,
    texture.category?.name ?? '',
    texture.resolution,
    texture.channels.length,
    primaryImage(texture)?.key ?? '',
    texture.outputsRevision,
  ]
  return createHash('sha256').update(JSON.stringify(inputs)).digest('hex').slice(0, 16)
}

function escape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Pango-rendered text, transparent around the glyphs. */
async function text(
  content: string,
  options: { font: 'bold' | 'medium'; size: number; color: string; width?: number }
) {
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${options.color}" size="${options.size * 1024}">${escape(content)}</span>`,
      fontfile: options.font === 'bold' ? FONT_BOLD : FONT_MEDIUM,
      font: options.font === 'bold' ? 'Barlow Bold' : 'Barlow Medium',
      width: options.width,
      wrap: 'word',
      rgba: true,
      dpi: 72,
      spacing: Math.round(options.size * 0.1),
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
  return { input: data, width: info.width, height: info.height }
}

function roundedMask(width: number, height: number, radius: number) {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}"/></svg>`
  )
}

async function rounded(input: Buffer, size: number, radius: number) {
  return sharp(input)
    .resize(size, size, { fit: 'cover' })
    .ensureAlpha()
    .composite([{ input: roundedMask(size, size, radius), blend: 'dest-in' }])
    .png()
    .toBuffer()
}

/** Shrink the title until it fits in three lines. */
async function title(content: string) {
  for (const size of [76, 64, 54, 46]) {
    const rendered = await text(content, { font: 'bold', size, color: '#ffffff', width: 500 })
    if (rendered.height <= size * 1.25 * 3) return rendered
  }
  return text(content.slice(0, 60) + '…', { font: 'bold', size: 46, color: '#ffffff', width: 500 })
}

const BACKGROUND = Buffer.from(`
<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="1" stop-color="#030712"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#60a5fa" stop-opacity="0.28"/>
      <stop offset="0.6" stop-color="#60a5fa" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#60a5fa" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="315" cy="315" r="330" fill="url(#glow)"/>
  <rect x="0" y="${OG_HEIGHT - 6}" width="${OG_WIDTH}" height="6" fill="#60a5fa"/>
</svg>`)

/**
 * The texture's share card: its render on the left; name, details, a strip of
 * its maps and the license on the right.
 */
export async function renderOgImage(texture: Texture) {
  const layers: OverlayOptions[] = []

  // The render. A transparent capture sits on the glow; an opaque one fills a
  // rounded panel.
  const image = primaryImage(texture)
  if (image) {
    const bytes = Buffer.from(await readBytes(image.key))
    const { hasAlpha } = await sharp(bytes).metadata()
    if (hasAlpha) {
      layers.push({
        input: await sharp(bytes)
          .resize(560, 560, { fit: 'contain', background: '#0000' })
          .png()
          .toBuffer(),
        left: 35,
        top: 35,
      })
    } else {
      layers.push({ input: await rounded(bytes, 550, 24), left: 40, top: 40 })
    }
  }

  const left = 660
  layers.push({
    input: await sharp(LOGO, { density: 300 }).resize(40, 40).png().toBuffer(),
    left,
    top: 52,
  })
  const brand = await text('TextureLab', { font: 'medium', size: 28, color: '#d1d5db' })
  layers.push({ input: brand.input, left: left + 52, top: 72 - Math.round(brand.height / 2) })

  const heading = await title(texture.title)
  layers.push({ input: heading.input, left, top: 120 })

  const details = [
    texture.category?.name,
    `${texture.resolution} × ${texture.resolution}`,
    `${texture.channels.length} maps`,
  ]
    .filter(Boolean)
    .join('  ·  ')
  const subtitle = await text(details, { font: 'medium', size: 28, color: '#9ca3af' })
  layers.push({ input: subtitle.input, left, top: 120 + heading.height + 18 })

  // Up to four maps, in a fixed order.
  const outputs = [...(texture.outputs ?? [])]
    .sort((a, b) => CHANNEL_ORDER.indexOf(a.channel) - CHANNEL_ORDER.indexOf(b.channel))
    .slice(0, 4)
  const thumb = 108
  for (const [i, output] of outputs.entries()) {
    const x = left + i * (thumb + 16)
    layers.push({
      input: await rounded(Buffer.from(await readBytes(output.key)), thumb, 12),
      left: x,
      top: 420,
    })
    const label = await text(CHANNEL_LABELS[output.channel] ?? output.channel.toUpperCase(), {
      font: 'medium',
      size: 15,
      color: '#9ca3af',
    })
    layers.push({ input: label.input, left: x, top: 420 + thumb + 8 })
  }

  // License badge, top right.
  const badge = await text('FREE  ·  CC0', { font: 'bold', size: 22, color: '#030712' })
  const badgeWidth = badge.width + 32
  layers.push({
    input: Buffer.from(
      `<svg width="${badgeWidth}" height="40"><rect width="${badgeWidth}" height="40" rx="20" fill="#34d399"/></svg>`
    ),
    left: OG_WIDTH - 48 - badgeWidth,
    top: 52,
  })
  layers.push({
    input: badge.input,
    left: OG_WIDTH - 48 - badgeWidth + 16,
    top: 72 - Math.round(badge.height / 2),
  })

  return sharp(BACKGROUND)
    .composite(layers)
    .flatten({ background: '#030712' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer()
}

/**
 * The stored card for the texture's current version, drawn (and older ones
 * removed) when it doesn't exist yet. Returns its storage key.
 */
export async function ensureOgImage(texture: Texture) {
  const key = storageKeys.ogImage(texture.id, ogImageVersion(texture))
  try {
    return { key, bytes: await readBytes(key) }
  } catch {
    const bytes = await renderOgImage(texture)
    await removePrefix(storageKeys.ogImages(texture.id))
    await putPublic(key, bytes, { contentType: 'image/jpeg' })
    return { key, bytes: new Uint8Array(bytes) }
  }
}
