import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { randomUUID } from 'node:crypto'

/**
 * Runs each storage operation the site uses against the configured bucket,
 * and points out the usual S3/Spaces misconfigurations. Leaves nothing
 * behind. Run it inside the deployed container: `node ace storage:check`.
 */
export default class StorageCheck extends BaseCommand {
  static commandName = 'storage:check'
  static description = 'Check that the configured S3/Spaces bucket works for the site'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: env } = await import('#start/env')
    const { default: drive } = await import('@adonisjs/drive/services/main')

    const bucket = env.get('S3_BUCKET', 'texturelab')
    const endpoint = env.get('S3_ENDPOINT')
    const pathStyle = env.get('S3_FORCE_PATH_STYLE', false)
    const publicUrl = env.get('S3_PUBLIC_URL')

    this.logger.info(`disk:        ${env.get('DRIVE_DISK', 's3')}`)
    this.logger.info(`endpoint:    ${endpoint ?? '(AWS default)'}`)
    this.logger.info(`bucket:      ${bucket}`)
    this.logger.info(`region:      ${env.get('S3_REGION', 'us-east-1')}`)
    this.logger.info(`path style:  ${pathStyle}`)
    this.logger.info(`ACLs:        ${env.get('S3_SUPPORTS_ACL', true)}`)
    this.logger.info(`public URL:  ${publicUrl ?? '(endpoint)'}`)

    // Configuration mistakes that requests alone don't explain well.
    let warnings = 0
    const warn = (message: string) => {
      warnings++
      this.logger.warning(message)
    }
    if (endpoint) {
      const host = new URL(endpoint).host
      if (host.startsWith(`${bucket}.`)) {
        warn(
          `S3_ENDPOINT includes the bucket ("${host}"). Use the region endpoint, e.g. https://${host.slice(bucket.length + 1)}, with S3_FORCE_PATH_STYLE=false. With the bucket in the endpoint, listing and deleting fail (NoSuchKey) and keys get a "${bucket}/" prefix.`
        )
      }
      if (host.includes('.cdn.')) {
        warn('S3_ENDPOINT is a CDN host, which is read-only. Put the CDN host in S3_PUBLIC_URL.')
      }
      if (host.endsWith('digitaloceanspaces.com') && pathStyle) {
        warn('Spaces expects S3_FORCE_PATH_STYLE=false.')
      }
    }
    if (publicUrl && endpoint && new URL(publicUrl).host.endsWith('digitaloceanspaces.com')) {
      if (!new URL(publicUrl).host.startsWith(`${bucket}.`)) {
        warn(`S3_PUBLIC_URL should be https://${bucket}.<region>.cdn.digitaloceanspaces.com`)
      }
    }

    const disk = drive.use()
    const id = randomUUID()
    const privateKey = `private/_healthcheck/${id}.txt`
    const publicKey = `public/_healthcheck/${id}.txt`
    const body = new TextEncoder().encode(`texturelab storage check ${id}`)
    let failures = 0

    const step = async (name: string, action: () => Promise<string | void>) => {
      try {
        const detail = await action()
        this.logger.success(`${name}${detail ? `: ${detail}` : ''}`)
      } catch (error) {
        failures++
        const err = error as Error & { cause?: Error }
        this.logger.error(
          `${name}: ${err.message}${err.cause ? ` (${err.cause.name}: ${err.cause.message})` : ''}`
        )
      }
    }

    await step('write private object', () =>
      disk.put(privateKey, body, { visibility: 'private', contentType: 'text/plain' })
    )
    await step('read it back', async () => {
      const text = new TextDecoder().decode(await disk.getBytes(privateKey))
      if (!text.includes(id)) throw new Error('contents differ')
    })
    await step('write public object', () =>
      disk.put(publicKey, body, { visibility: 'public', contentType: 'text/plain' })
    )
    await step('fetch it from its public URL', async () => {
      const url = await disk.getUrl(publicKey)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`${url} returned ${response.status}`)
      return url
    })
    await step('private object is not public', async () => {
      const url = await disk.getUrl(privateKey)
      const response = await fetch(url)
      if (response.ok) throw new Error(`${url} is readable by anyone`)
    })
    await step('list by prefix (used to delete old maps)', async () => {
      const { objects } = await disk.listAll('public/_healthcheck/', { recursive: true })
      const keys = [...objects].flatMap((object) => (object.isFile ? [object.key] : []))
      if (!keys.includes(publicKey)) {
        throw new Error(`listing didn't return ${publicKey} (got ${keys.join(', ') || 'nothing'})`)
      }
      return `${keys.length} object(s)`
    })
    await step('delete by prefix', async () => {
      await disk.deleteAll('public/_healthcheck/')
      if (await disk.exists(publicKey)) throw new Error('object still exists')
    })
    await step('delete one object', async () => {
      await disk.delete(privateKey)
      if (await disk.exists(privateKey)) throw new Error('object still exists')
    })

    if (failures || warnings) {
      this.logger.error(`${failures} failed, ${warnings} warning(s)`)
      this.exitCode = 1
    } else {
      this.logger.success('Storage works for the site')
    }
  }
}
