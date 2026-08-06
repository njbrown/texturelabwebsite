import type { HttpContext } from '@adonisjs/core/http'
import site from '#config/site'

export default class HomeController {
  async show({ inertia }: HttpContext) {
    return inertia.render('home', { links: site.links })
  }
}
