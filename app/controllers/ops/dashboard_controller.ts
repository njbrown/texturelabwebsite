import type { HttpContext } from '@adonisjs/core/http'
import Release from '#models/release'
import { getBlogPosts, getDocLinks, getGalleryItems } from '#services/content_service'

export default class DashboardController {
  async index({ inertia }: HttpContext) {
    const [releases, docs, posts, gallery] = await Promise.all([
      Release.query().orderBy('released_at', 'desc').orderBy('id', 'desc'),
      getDocLinks(),
      getBlogPosts(),
      getGalleryItems(),
    ])

    const published = releases.filter((release) => release.isPublished)
    // Mirrors the default of /api/releases/latest, which is the stable channel.
    const latestStable = published.find((release) => release.channel === 'stable')

    return inertia.render('ops/dashboard', {
      stats: {
        releases: releases.length,
        publishedReleases: published.length,
        draftReleases: releases.length - published.length,
        docs: docs.length,
        posts: posts.length,
        gallery: gallery.length,
      },
      latest: latestStable?.serialize() ?? null,
      recent: releases.slice(0, 5).map((release) => release.serialize()),
    })
  }
}
