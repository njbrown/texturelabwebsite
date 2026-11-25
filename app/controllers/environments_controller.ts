import type { HttpContext } from '@adonisjs/core/http'
import Environment from '#models/environment'
import { readStream } from '#services/storage_service'

export default class EnvironmentsController {
  /**
   * An uploaded HDRI, for the 3D preview. Served by the app so the bucket
   * needs no CORS rules; each id's file never changes, so it caches forever.
   */
  async file({ params, response }: HttpContext) {
    const environment = await Environment.findOrFail(params.id)
    if (environment.source !== 'upload' || !environment.key) return response.notFound()

    response.header(
      'Content-Type',
      environment.format === 'hdr' ? 'image/vnd.radiance' : 'image/x-exr'
    )
    response.header('Cache-Control', 'public, max-age=31536000, immutable')
    if (environment.bytes) response.header('Content-Length', String(environment.bytes))
    return response.stream(await readStream(environment.key))
  }
}
