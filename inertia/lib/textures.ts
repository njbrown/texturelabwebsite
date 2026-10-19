/**
 * Texture types as the server presents them (app/services/texture_service.ts),
 * and small formatting helpers. Safe to import during SSR: nothing here touches
 * WebGL or the runtime.
 */

export type TextureChannel =
  'albedo' | 'normal' | 'metalness' | 'roughness' | 'height' | 'alpha' | 'ao'

export type ChannelSpec = {
  channel: TextureChannel
  name: string
  components: number
  precision: number
  bitDepth: 8 | 16
  colorType: 'rgba' | 'rgb' | 'grey'
}

export type VariableSummary = {
  id: string
  name: string
  displayName: string
  type: 'float' | 'int' | 'bool' | 'enum' | 'color' | 'gradient' | 'curve' | 'image' | 'string'
  value?: number | boolean | string | { r: number; g: number; b: number; a: number }
  min?: number
  max?: number
  step?: number
  options?: { index: number; label: string }[]
}

export type CategoryRef = { id: number; slug: string; name: string }

export type TextureImage = {
  id: number
  url: string
  thumbUrl: string
  width: number
  height: number
  bytes: number
  alt: string | null
  source: 'upload' | 'render'
  isPrimary: boolean
}

export type TextureOutput = {
  channel: TextureChannel
  name: string
  url: string
  width: number
  height: number
  bitDepth: number
  colorType: string
  bytes: number
}

export type Texture = {
  id: number
  slug: string
  title: string
  description: string
  descriptionHtml: string
  category: CategoryRef | null
  tags: string[]
  status: 'draft' | 'published'
  featured: boolean
  sortOrder: number
  publishedAt: string | null
  updatedAt: string | null
  resolution: number
  libraryVersion: string
  appVersion: string | null
  nodeCount: number
  connectionCount: number
  sourceName: string
  sourceBytes: number
  sourceSha256: string
  channels: ChannelSpec[]
  variables: VariableSummary[]
  presets: { id: string; name: string }[]
  activePreset: string | null
  warnings: string[]
  outputsRevision: number
  outputsStale: boolean
  downloadCount: number
  outputs: TextureOutput[]
  images: TextureImage[]
  license: { name: string; url: string }
}

export type TextureCard = {
  id: number
  slug: string
  title: string
  category: CategoryRef | null
  thumbUrl: string | null
  hoverUrl: string | null
  resolution: number
  channelCount: number
  variableCount: number
  presetCount: number
  featured: boolean
}

export const CHANNEL_LABELS: Record<TextureChannel, string> = {
  albedo: 'Albedo',
  normal: 'Normal',
  metalness: 'Metalness',
  roughness: 'Roughness',
  height: 'Height',
  alpha: 'Alpha',
  ao: 'Ambient occlusion',
}

export const COLOR_TYPE_LABELS: Record<string, string> = {
  rgba: 'RGBA',
  rgb: 'RGB',
  grey: 'Greyscale',
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatResolution(size: number) {
  return size >= 1024 && size % 1024 === 0 ? `${size / 1024}K` : `${size}px`
}

export function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value)
  )
}

/**
 * Export file names, as the desktop app makes them: the file's pattern with
 * `${project}` and `${name}`, and later duplicates numbered.
 */
export function exportFileNames(pattern: string, project: string, names: string[]) {
  const used = new Set<string>()

  return names.map((name) => {
    const base = (pattern || '${project}_${name}')
      .replaceAll('${project}', project)
      .replaceAll('${name}', name || 'output')
      .replace(/[\\/:*?"<>|]+/g, '_')
    let unique = base
    for (let n = 2; used.has(unique.toLowerCase()); n++) unique = `${base}_${n}`
    used.add(unique.toLowerCase())
    return `${unique}.png`
  })
}

/**
 * Shield's XSRF cookie, for requests made with fetch() rather than Inertia.
 */
export function xsrfHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? { 'X-XSRF-TOKEN': decodeURIComponent(match[1]) } : {}
}
