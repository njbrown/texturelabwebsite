import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import site from '#config/site'
import { findDocPage, getDocLinks } from '#services/content_service'

export default class DocsController {
  async show({ request, inertia }: HttpContext) {
    const path = request.url()
    const page = await findDocPage(path)

    if (!page) {
      throw new Exception(`Cannot find the doc page ${path}`, {
        status: 404,
        code: 'E_ROUTE_NOT_FOUND',
      })
    }

    const sidebar = page.sidebar
      ? (site.sidebars.find((entry) => entry.name === page.sidebar) ?? null)
      : null

    return inertia.render('docs/show', {
      page,
      sidebar,
      links: await getDocLinks(),
    })
  }
}
