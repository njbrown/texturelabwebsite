import type { HttpContext } from '@adonisjs/core/http'
import { getGalleryItems } from '#services/content_service'

export default class GalleryController {
  async index({ inertia }: HttpContext) {
    return inertia.render('gallery/index', { items: await getGalleryItems() })
  }
}
