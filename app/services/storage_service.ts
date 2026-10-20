import drive from '@adonisjs/drive/services/main'
import logger from '@adonisjs/core/services/logger'
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
  outputThumb: (textureId: number, revision: number, channel: string) =>
    `${PUBLIC_PREFIX}textures/${textureId}/outputs/${revision}/${channel}-512.webp`,
  outputsRevision: (textureId: number, revision: number) =>
    `${PUBLIC_PREFIX}textures/${textureId}/outputs/${revision}/`,
  image: (textureId: number, name: string) =>
    `${PUBLIC_PREFIX}textures/${textureId}/images/${name}`,
  ogImage: (textureId: number, version: string) =>
    `${PUBLIC_PREFIX}textures/${textureId}/og/${version}.jpg`,
  ogImages: (textureId: number) => `${PUBLIC_PREFIX}textures/${textureId}/og/`,
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

/*
| Removal is cleanup after the database has already moved on (old revisions,
| replaced files, deleted textures). A failure leaves an orphaned object, which
| is logged rather than failing the request that caused it.
*/

export async function remove(key: string) {
  try {
    await drive.use().delete(key)
  } catch (error) {
    logger.warn({ err: error, key }, 'storage: could not delete an object; it is now orphaned')
  }
}

export async function removePrefix(prefix: string) {
  try {
    await drive.use().deleteAll(prefix)
  } catch (error) {
    logger.warn({ err: error, prefix }, 'storage: could not delete objects under a prefix')
  }
}
