import type { HttpContext } from '@adonisjs/core/http'
import Release from '#models/release'
import Texture from '#models/texture'
import { liveRelease } from '#services/release_feed_service'
import { getBlogPosts, getDocLinks } from '#services/content_service'
import { dailyVisitors } from '#services/usage_service'

export default class DashboardController {
  async index({ inertia }: HttpContext) {
    const [releases, liveStable, liveBeta, docs, posts, textureCount, usage] = await Promise.all([
      Release.query().withScopes((scopes) => scopes.newestFirst()),
      liveRelease('stable'),
      liveRelease('beta'),
      getDocLinks(),
      getBlogPosts(),
      Texture.query()
        .withScopes((scopes) => scopes.published())
        .count('* as total'),
      dailyVisitors(30),
    ])

    const published = releases.filter((release) => release.isPublished)

    return inertia.render('ops/dashboard', {
      stats: {
        releases: releases.length,
        publishedReleases: published.length,
        draftReleases: releases.length - published.length,
        docs: docs.length,
        posts: posts.length,
        textures: Number(textureCount[0].$extras.total ?? 0),
      },
      // Exactly what /api/releases/latest serves each channel.
      live: {
        stable: liveStable?.serialize() ?? null,
        beta: liveBeta?.serialize() ?? null,
      },
      recent: releases.slice(0, 5).map((release) => release.serialize()),
      usage,
    })
  }
}
