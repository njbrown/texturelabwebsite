import drive from '@adonisjs/drive/services/main'
import type { Readable } from 'node:stream'

/**
 * Every key the app writes starts with one of these. `public/` is readable by
 * anyone straight from the bucket (or CDN); `private/` only through the app.
 */
const PUBLIC_PREFIX = 'public/'
const PRIVATE_PREFIX = 'private/'

/**
 * Keys are revisioned or content-addressed, so a key never points at different
 * bytes and can be cached forever.
 */
const IMMUTABLE = 'public, max-age=31536000, immutable'

type PutOptions = {
  contentType: string
  /** Sets Content-Disposition, so a plain link downloads under this name. */
  downloadName?: string
}

function disposition(name?: string) {
  if (!name) return undefined
  return `attachment; filename="${name.replace(/["\\\r\n]/g, '')}"`
}

export const storageKeys = {
  source: (textureId: number, sha256: string) =>
    `${PRIVATE_PREFIX}textures/${textureId}/source/${sha256}.texture`,
  output: (textureId: number, revision: number, channel: string) =>
    `${PUBLIC_PREFIX}textures/${textureId}/outputs/${revision}/${channel}.png`,
  outputsRevision: (textureId: number, revision: number) =>
    `${PUBLIC_PREFIX}textures/${textureId}/outputs/${revision}/`,
  image: (textureId: number, name: string) =>
    `${PUBLIC_PREFIX}textures/${textureId}/images/${name}`,
  environment: (name: string) => `${PRIVATE_PREFIX}environments/${name}`,
  environmentThumb: (name: string) => `${PUBLIC_PREFIX}environments/${name}`,
  texture: (textureId: number) => [
    `${PUBLIC_PREFIX}textures/${textureId}/`,
    `${PRIVATE_PREFIX}textures/${textureId}/`,
  ],
}

export async function putPublic(key: string, contents: Uint8Array, options: PutOptions) {
  await drive.use().put(key, contents, {
    visibility: 'public',
    contentType: options.contentType,
    contentLength: contents.byteLength,
    contentDisposition: disposition(options.downloadName),
    cacheControl: IMMUTABLE,
  })
}

export async function putPrivate(key: string, contents: Uint8Array, contentType: string) {
  await drive.use().put(key, contents, {
    visibility: 'private',
    contentType,
    contentLength: contents.byteLength,
  })
}

export async function publicUrl(key: string) {
  return drive.use().getUrl(key)
}

export async function readBytes(key: string) {
  return drive.use().getBytes(key)
}

export async function readStream(key: string): Promise<Readable> {
  return drive.use().getStream(key)
}

export async function remove(key: string) {
  await drive.use().delete(key)
}

export async function removePrefix(prefix: string) {
  await drive.use().deleteAll(prefix)
}
