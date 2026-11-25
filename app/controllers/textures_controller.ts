import type { HttpContext } from '@adonisjs/core/http'
import Texture from '#models/texture'
import { zipSync, strToU8, type Zippable } from 'fflate'
import { readBytes, readStream } from '#services/storage_service'
import { presentCard, presentTexture, TEXTURE_LICENSE } from '#services/texture_service'
import { listEnvironments } from '#services/environment_service'
import { ensureOgImage, ogImageVersion } from '#services/og_image_service'

/**
 * A published texture, or a draft for someone logged into /ops (preview).
 */
async function findVisible({ auth, params }: HttpContext) {
  const texture = await Texture.query()
    .where('slug', params.slug)
    .preload('category')
    .preload('images')
    .preload('outputs')
    .firstOrFail()

  if (!texture.isPublished && !(await auth.check())) return null
  return texture
}

function downloadName(texture: Texture) {
  return `${texture.slug}.texture`
}

export default class TexturesController {
  async show(ctx: HttpContext) {
    const texture = await findVisible(ctx)
    if (!texture) return ctx.response.notFound()

    const related = texture.categoryId
      ? await Texture.query()
          .withScopes((scopes) => scopes.published())
          .where('category_id', texture.categoryId)
          .whereNot('id', texture.id)
          .preload('category')
          .preload('images')
          .preload('outputs', (outputs) => outputs.where('channel', 'albedo'))
          .orderBy('featured', 'desc')
          .orderBy('published_at', 'desc')
          .limit(4)
      : []

    return ctx.inertia.render('textures/show', {
      texture: await presentTexture(texture),
      related: await Promise.all(related.map(presentCard)),
      environments: await listEnvironments(),
      isPreview: !texture.isPublished,
    })
  }

  /**
   * The file itself, for the in-browser renderer. Not counted as a download.
   */
  async source(ctx: HttpContext) {
    const texture = await findVisible(ctx)
    if (!texture) return ctx.response.notFound()

    ctx.response.header('Content-Type', 'application/json')
    ctx.response.header('Cache-Control', 'public, max-age=300')
    ctx.response.header('ETag', `"${texture.sourceSha256}"`)
    return ctx.response.stream(await readStream(texture.sourceKey))
  }

  /**
   * The share card (1200×630 JPEG), drawn on first request and stored. The
   * page links it with ?v=<version>, which changes whenever the card would.
   */
  async ogImage(ctx: HttpContext) {
    const texture = await findVisible(ctx)
    if (!texture) return ctx.response.notFound()

    const { bytes } = await ensureOgImage(texture)
    const current = ctx.request.input('v') === ogImageVersion(texture)

    ctx.response.header('Content-Type', 'image/jpeg')
    ctx.response.header(
      'Cache-Control',
      current ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'
    )
    return Buffer.from(bytes)
  }

  async download(ctx: HttpContext) {
    const texture = await findVisible(ctx)
    if (!texture) return ctx.response.notFound()

    if (texture.isPublished) {
      await Texture.query().where('id', texture.id).increment('download_count', 1)
    }

    ctx.response.header('Content-Type', 'application/octet-stream')
    ctx.response.header('Cache-Control', 'no-store')
    ctx.response.header('Content-Disposition', `attachment; filename="${downloadName(texture)}"`)
    return ctx.response.stream(await readStream(texture.sourceKey))
  }

  /**
   * The default outputs as one zip, built from storage so the browser needs
   * no CORS access to the bucket. PNGs are stored, not re-deflated.
   */
  async downloadOutputs(ctx: HttpContext) {
    const texture = await findVisible(ctx)
    if (!texture) return ctx.response.notFound()
    if (texture.outputs.length === 0) return ctx.response.notFound()

    const names = new Map(texture.channels.map((spec) => [spec.channel as string, spec.name]))
    const entries: Zippable = {
      'README.txt': strToU8(
        [
          texture.title,
          '',
          `Default outputs at ${texture.outputs[0].width}x${texture.outputs[0].height}.`,
          `License: ${TEXTURE_LICENSE.name} (${TEXTURE_LICENSE.url})`,
          '',
        ].join('\n')
      ),
    }
    for (const output of texture.outputs) {
      const name = names.get(output.channel) ?? output.channel
      entries[`${texture.slug}_${name}.png`] = [await readBytes(output.key), { level: 0 }]
    }

    ctx.response.header('Content-Type', 'application/zip')
    ctx.response.header('Cache-Control', 'no-store')
    ctx.response.header(
      'Content-Disposition',
      `attachment; filename="${texture.slug}_${texture.outputs[0].width}.zip"`
    )
    return Buffer.from(zipSync(entries))
  }
}
