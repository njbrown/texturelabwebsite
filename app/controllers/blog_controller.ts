import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import { findBlogPost, getBlogPosts } from '#services/content_service'

export default class BlogController {
  async index({ inertia }: HttpContext) {
    const posts = await getBlogPosts()

    return inertia.render('blog/index', {
      posts: posts.map(({ html: _html, ...post }) => post),
    })
  }

  async show({ params, inertia }: HttpContext) {
    const post = await findBlogPost(params.slug)

    if (!post) {
      throw new Exception(`Cannot find the blog post ${params.slug}`, {
        status: 404,
        code: 'E_ROUTE_NOT_FOUND',
      })
    }

    return inertia.render('blog/show', { post })
  }
}
