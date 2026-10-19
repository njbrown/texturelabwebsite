import type { HttpContext } from '@adonisjs/core/http'
import Texture from '#models/texture'
import TextureCategory from '#models/texture_category'
import { slugify } from '#services/texture_service'
import { categoryValidator } from '#validators/texture'

async function slugTaken(slug: string, ignoreId?: number) {
  const existing = await TextureCategory.query()
    .where('slug', slug)
    .if(ignoreId, (query) => query.whereNot('id', ignoreId!))
    .first()
  return Boolean(existing)
}

export default class TextureCategoriesController {
  async index({ inertia }: HttpContext) {
    const categories = await TextureCategory.query()
      .withScopes((scopes) => scopes.ordered())
      .withCount('textures')

    return inertia.render('ops/categories/index', {
      categories: categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        textureCount: Number(category.$extras.textures_count ?? 0),
      })),
    })
  }

  async store({ request, response, session }: HttpContext) {
    const fields = await request.validateUsing(categoryValidator)
    const slug = fields.slug || slugify(fields.name)

    if (await slugTaken(slug)) {
      session.flashErrors({ slug: `A category with the slug "${slug}" already exists` })
      session.flashAll()
      return response.redirect().back()
    }

    await TextureCategory.create({
      name: fields.name,
      slug,
      description: fields.description ?? null,
      sortOrder: fields.sortOrder ?? 0,
    })

    session.flash('notification', `Category ${fields.name} created`)
    return response.redirect().back()
  }

  async update({ params, request, response, session }: HttpContext) {
    const category = await TextureCategory.findOrFail(params.id)
    const fields = await request.validateUsing(categoryValidator)
    const slug = fields.slug || slugify(fields.name)

    if (await slugTaken(slug, category.id)) {
      session.flashErrors({ slug: `A category with the slug "${slug}" already exists` })
      return response.redirect().back()
    }

    category.merge({
      name: fields.name,
      slug,
      description: fields.description ?? null,
      sortOrder: fields.sortOrder ?? category.sortOrder,
    })
    await category.save()

    session.flash('notification', 'Saved')
    return response.redirect().back()
  }

  /**
   * Textures in the category are kept and become uncategorized.
   */
  async destroy({ params, response, session }: HttpContext) {
    const category = await TextureCategory.findOrFail(params.id)
    await Texture.query().where('category_id', category.id).update({ category_id: null })
    await category.delete()

    session.flash('notification', `Category ${category.name} deleted`)
    return response.redirect().back()
  }
}
