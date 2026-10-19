import type { HttpContext } from '@adonisjs/core/http'
import { readFile } from 'node:fs/promises'
import Texture, { TEXTURE_STATUSES } from '#models/texture'
import TextureCategory from '#models/texture_category'
import TextureImage from '#models/texture_image'
import { readStream } from '#services/storage_service'
import {
  extractMetadata,
  MAX_TEXTURE_BYTES,
  TextureMetadataError,
} from '#services/texture_metadata_service'
import {
  addImage,
  createTexture,
  deleteImage,
  deleteTexture,
  makePrimary,
  presentCard,
  presentTexture,
  publish,
  publishProblems,
  reorderImages,
  replaceSource,
  storeOutputs,
  TextureServiceError,
  titleFromFileName,
  uniqueSlug,
  unpublish,
} from '#services/texture_service'
import {
  createTextureValidator,
  imageOrderValidator,
  imageUpdateValidator,
  updateTextureValidator,
} from '#validators/texture'

const SOURCE_FILE = { size: MAX_TEXTURE_BYTES, extnames: ['texture', 'json'] }
const IMAGE_FILE = { size: '10mb', extnames: ['png', 'jpg', 'jpeg', 'webp'] }
const OUTPUT_FILE = { size: '64mb', extnames: ['png'] }

/**
 * The uploaded .texture, read and checked. Problems come back as a message for
 * the form instead of an exception.
 */
async function readSource(request: HttpContext['request']) {
  const file = request.file('file', SOURCE_FILE)
  const failed = (error: string) => ({ ok: false, error }) as const

  if (!file) return failed('Choose a .texture file')
  if (!file.isValid) return failed(file.errors.map((e) => e.message).join(', '))

  const contents = new Uint8Array(await readFile(file.tmpPath!))

  try {
    return { ok: true, file, contents, meta: extractMetadata(contents) } as const
  } catch (error) {
    if (error instanceof TextureMetadataError) return failed(error.message)
    throw error
  }
}

async function categoryOptions() {
  const categories = await TextureCategory.query().withScopes((scopes) => scopes.ordered())
  return categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
  }))
}

async function loadTexture(id: number | string) {
  return Texture.query()
    .where('id', id)
    .preload('category')
    .preload('images')
    .preload('outputs')
    .firstOrFail()
}

export default class TexturesController {
  async index({ inertia, request }: HttpContext) {
    const status = request.input('status')
    const textures = await Texture.query()
      .if(TEXTURE_STATUSES.includes(status), (query) => query.where('status', status))
      .preload('category')
      .preload('images')
      .preload('outputs')
      .orderBy('updated_at', 'desc')

    return inertia.render('ops/textures/index', {
      textures: await Promise.all(
        textures.map(async (texture) => ({
          ...(await presentCard(texture)),
          status: texture.status,
          outputsStale: texture.outputsStale,
          outputsRevision: texture.outputsRevision,
          warningCount: texture.warnings.length,
          updatedAt: texture.updatedAt?.toISO() ?? null,
        }))
      ),
      status: TEXTURE_STATUSES.includes(status) ? status : null,
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('ops/textures/create', { categories: await categoryOptions() })
  }

  /**
   * Read a file's metadata without saving anything, so the create form can
   * show what's in it first.
   */
  async inspect({ request, response }: HttpContext) {
    const source = await readSource(request)
    if (!source.ok) return response.unprocessableEntity({ error: source.error })

    return {
      fileName: source.file.clientName,
      title: titleFromFileName(source.file.clientName),
      slug: await uniqueSlug(titleFromFileName(source.file.clientName)),
      metadata: source.meta,
    }
  }

  async store({ request, response, session }: HttpContext) {
    const source = await readSource(request)
    if (!source.ok) {
      session.flashErrors({ file: source.error })
      session.flashExcept(['file'])
      return response.redirect().back()
    }

    const fields = await request.validateUsing(createTextureValidator)
    const texture = await createTexture(source.contents, source.file.clientName, source.meta, {
      ...fields,
      title: fields.title || titleFromFileName(source.file.clientName),
    })

    session.flash('notification', `${texture.title} saved as a draft. Render its outputs next.`)
    return response.redirect(`/ops/textures/${texture.id}/edit?render=1`)
  }

  async edit({ inertia, params, request }: HttpContext) {
    const texture = await loadTexture(params.id)

    return inertia.render('ops/textures/edit', {
      texture: await presentTexture(texture),
      categories: await categoryOptions(),
      problems: await publishProblems(texture),
      autoRender: request.input('render') === '1',
    })
  }

  async update({ params, request, response, session }: HttpContext) {
    const texture = await Texture.findOrFail(params.id)
    const fields = await request.validateUsing(updateTextureValidator)

    const slug = fields.slug ? await uniqueSlug(fields.slug, texture.id) : texture.slug
    if (fields.slug && slug !== fields.slug) {
      session.flashErrors({ slug: 'Another texture already uses this slug' })
      session.flashAll()
      return response.redirect().back()
    }

    texture.merge({
      title: fields.title,
      slug,
      description: fields.description ?? null,
      categoryId: fields.categoryId ?? null,
      tags: fields.tags ?? [],
      featured: fields.featured ?? false,
      sortOrder: fields.sortOrder ?? 0,
    })
    await texture.save()

    session.flash('notification', 'Saved')
    return response.redirect().back()
  }

  async replaceSource({ params, request, response, session }: HttpContext) {
    const texture = await Texture.findOrFail(params.id)
    const source = await readSource(request)

    if (!source.ok) {
      session.flashErrors({ file: source.error })
      return response.redirect().back()
    }

    await replaceSource(texture, source.contents, source.file.clientName, source.meta)
    session.flash('notification', 'File replaced. Render the outputs again.')
    return response.redirect(`/ops/textures/${texture.id}/edit?render=1`)
  }

  /**
   * The private .texture, for rendering in the browser.
   */
  async source({ params, response }: HttpContext) {
    const texture = await Texture.findOrFail(params.id)

    response.header('Content-Type', 'application/json')
    response.header('Cache-Control', 'private, no-store')
    response.header('X-Source-Sha256', texture.sourceSha256)
    return response.stream(await readStream(texture.sourceKey))
  }

  /**
   * One PNG per channel, posted by the render panel as `output_<channel>`.
   */
  async storeOutputs({ params, request, response }: HttpContext) {
    const texture = await Texture.findOrFail(params.id)
    const uploads = []

    for (const spec of texture.channels) {
      const file = request.file(`output_${spec.channel}`, OUTPUT_FILE)
      if (!file) continue
      if (!file.isValid) {
        return response.unprocessableEntity({ error: file.errors.map((e) => e.message).join(', ') })
      }
      uploads.push({ channel: spec.channel, bytes: new Uint8Array(await readFile(file.tmpPath!)) })
    }

    const renderTargetFormat = String(request.input('renderTargetFormat', '')).slice(0, 16)
    const warnings = request.input('warnings')

    try {
      await storeOutputs(
        texture,
        uploads,
        String(request.input('sourceSha256', '')),
        renderTargetFormat || null
      )
    } catch (error) {
      if (error instanceof TextureServiceError) {
        return response.unprocessableEntity({ error: error.message })
      }
      throw error
    }

    // Runtime warnings from the render (unsupported nodes, shader errors), next
    // to the ones found when parsing.
    if (typeof warnings === 'string') {
      try {
        const extra = (JSON.parse(warnings) as unknown[])
          .filter((w): w is string => typeof w === 'string')
          .map((w) => w.slice(0, 300))
          .slice(0, 50)
        texture.warnings = [...new Set([...texture.warnings, ...extra])]
        await texture.save()
      } catch {
        // Not worth failing the upload over
      }
    }

    return { revision: texture.outputsRevision }
  }

  async storeImage({ params, request, response, session }: HttpContext) {
    const texture = await Texture.findOrFail(params.id)
    const file = request.file('image', IMAGE_FILE)
    const fromRender = request.input('source') === 'render'
    const fail = (error: string) => {
      if (request.accepts(['html', 'json']) === 'json') {
        return response.unprocessableEntity({ error })
      }
      session.flashErrors({ image: error })
      return response.redirect().back()
    }

    if (!file) return fail('Choose an image')
    if (!file.isValid) return fail(file.errors.map((e) => e.message).join(', '))

    try {
      const image = await addImage(texture, new Uint8Array(await readFile(file.tmpPath!)), {
        source: fromRender ? 'render' : 'upload',
        alt: request.input('alt') || null,
        makePrimary: request.input('makePrimary') === '1',
      })

      if (request.accepts(['html', 'json']) === 'json') return { id: image.id }
    } catch (error) {
      if (error instanceof TextureServiceError) return fail(error.message)
      throw error
    }

    session.flash('notification', 'Image added')
    return response.redirect().back()
  }

  async updateImage({ params, request, response }: HttpContext) {
    const image = await TextureImage.query()
      .where('id', params.imageId)
      .where('texture_id', params.id)
      .firstOrFail()
    const fields = await request.validateUsing(imageUpdateValidator)

    if (fields.alt !== undefined) {
      image.alt = fields.alt
      await image.save()
    }
    if (fields.isPrimary) await makePrimary(image)

    return response.redirect().back()
  }

  async reorderImages({ params, request, response }: HttpContext) {
    const texture = await Texture.findOrFail(params.id)
    const { ids } = await request.validateUsing(imageOrderValidator)
    await reorderImages(texture, ids)
    return response.redirect().back()
  }

  async destroyImage({ params, response }: HttpContext) {
    const image = await TextureImage.query()
      .where('id', params.imageId)
      .where('texture_id', params.id)
      .firstOrFail()
    await deleteImage(image)
    return response.redirect().back()
  }

  async publish({ params, response, session }: HttpContext) {
    const texture = await Texture.findOrFail(params.id)
    const problems = await publishProblems(texture)

    if (problems.length) {
      session.flashErrors({ publish: problems.join(' ') })
      return response.redirect().back()
    }

    await publish(texture)
    session.flash('notification', `${texture.title} is live at /textures/${texture.slug}`)
    return response.redirect().back()
  }

  async unpublish({ params, response, session }: HttpContext) {
    const texture = await Texture.findOrFail(params.id)
    await unpublish(texture)
    session.flash('notification', `${texture.title} is a draft again`)
    return response.redirect().back()
  }

  async destroy({ params, response, session }: HttpContext) {
    const texture = await Texture.findOrFail(params.id)
    await deleteTexture(texture)
    session.flash('notification', `${texture.title} deleted`)
    return response.redirect('/ops/textures')
  }
}
