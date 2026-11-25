import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Texture from '#models/texture'
import TextureCategory from '#models/texture_category'
import { presentCard } from '#services/texture_service'
import { galleryQueryValidator } from '#validators/texture'

const PER_PAGE = 24

/** `%` and `_` in a search are literal characters, not wildcards. */
function likePattern(term: string) {
  return `%${term.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

async function categoryCounts() {
  const categories = await TextureCategory.query().withScopes((scopes) => scopes.ordered())
  const counts = await db
    .from('textures')
    .where('status', 'published')
    .select('category_id')
    .count('* as total')
    .groupBy('category_id')
  const byCategory = new Map(counts.map((row) => [row.category_id, Number(row.total)]))

  return {
    total: [...byCategory.values()].reduce((sum, n) => sum + n, 0),
    categories: categories
      .map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        count: byCategory.get(category.id) ?? 0,
      }))
      .filter((category) => category.count > 0),
  }
}

export default class GalleryController {
  async index({ inertia, params, request }: HttpContext) {
    const filters = await galleryQueryValidator.validate(request.qs())
    const sort = filters.sort ?? 'featured'
    const q = filters.q ?? ''

    let category: TextureCategory | null = null
    if (params.category) {
      category = await TextureCategory.findByOrFail('slug', params.category)
    }

    const query = Texture.query()
      .withScopes((scopes) => scopes.published())
      .if(category, (builder) => builder.where('category_id', category!.id))
      .if(q, (builder) => {
        const pattern = likePattern(q)
        builder.where((where) => {
          where
            .whereRaw(`lower(title) like ? escape '\\'`, [pattern])
            .orWhereRaw(`lower(tags) like ? escape '\\'`, [pattern])
            .orWhereRaw(`lower(coalesce(description, '')) like ? escape '\\'`, [pattern])
            .orWhereIn(
              'category_id',
              db
                .from('texture_categories')
                .select('id')
                .whereRaw(`lower(name) like ? escape '\\'`, [pattern])
            )
        })
      })
      .preload('category')
      .preload('images')
      .preload('outputs', (outputs) => outputs.where('channel', 'albedo'))

    if (sort === 'newest') query.orderBy('published_at', 'desc')
    else if (sort === 'name') query.orderBy('title', 'asc')
    else
      query.orderBy('featured', 'desc').orderBy('sort_order', 'asc').orderBy('published_at', 'desc')
    query.orderBy('id', 'desc')

    const page = await query.paginate(filters.page ?? 1, PER_PAGE)
    const { total, categories } = await categoryCounts()

    return inertia.render('gallery/index', {
      textures: await Promise.all(page.all().map(presentCard)),
      pagination: {
        page: page.currentPage,
        lastPage: page.lastPage,
        total: page.total,
        perPage: PER_PAGE,
      },
      filters: { q, sort, category: category?.slug ?? null },
      category: category
        ? { slug: category.slug, name: category.name, description: category.description }
        : null,
      categories,
      total,
    })
  }
}
