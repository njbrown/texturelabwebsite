import type { HttpContext } from '@adonisjs/core/http'
import vine, { errors as vineErrors } from '@vinejs/vine'
import Release from '#models/release'
import { RELEASE_CHANNELS } from '#models/release'
import { renderMarkdown } from '#services/markdown_service'

const queryValidator = vine.compile(
  vine.object({
    channel: vine.enum(RELEASE_CHANNELS).optional(),
    limit: vine.number().min(1).max(100).optional(),
  })
)

type SerializedRelease = {
  version: string
  title: string | null
  channel: string
  notes: string | null
  notesHtml: string
  releasedAt: string | null
  downloads: {
    windows: string | null
    mac: string | null
    linux: string | null
    itch: string | null
  }
}

async function present(release: Release): Promise<SerializedRelease> {
  const { html } = await renderMarkdown(release.notes ?? '')

  return {
    version: release.version,
    title: release.title,
    channel: release.channel,
    notes: release.notes,
    notesHtml: html,
    releasedAt: release.releasedAt?.toISO() ?? null,
    downloads: {
      windows: release.windowsUrl,
      mac: release.macUrl,
      linux: release.linuxUrl,
      itch: release.itchUrl,
    },
  }
}

/**
 * The default exception handler negotiates on the Accept header and would send
 * a redirect to a client that does not ask for JSON. This is a machine-facing
 * endpoint, so bad input always comes back as a 422 with the messages.
 */
async function validateQuery(qs: Record<string, unknown>) {
  try {
    return { query: await queryValidator.validate(qs), errors: null }
  } catch (error) {
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      return { query: null, errors: error.messages }
    }

    throw error
  }
}

/**
 * Public, unauthenticated feed consumed by the desktop app on startup.
 */
export default class ReleasesController {
  async index({ request, response }: HttpContext) {
    const { query, errors } = await validateQuery(request.qs())

    if (!query) {
      return response.unprocessableEntity({ errors })
    }

    const { channel, limit } = query

    const releases = await Release.query()
      .where('is_published', true)
      .if(channel, (builder) => builder.where('channel', channel!))
      .orderBy('released_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit ?? 20)

    response.header('Cache-Control', 'public, max-age=300')

    return {
      data: await Promise.all(releases.map(present)),
    }
  }

  async latest({ request, response, logger }: HttpContext) {
    const { query, errors } = await validateQuery(request.qs())

    if (!query) {
      return response.unprocessableEntity({ errors })
    }

    const release = await Release.query()
      .where('is_published', true)
      .where('channel', query.channel ?? 'stable')
      .orderBy('released_at', 'desc')
      .orderBy('id', 'desc')
      .first()

    if (!release) {
      return response.notFound({ error: 'No published release found' })
    }

    logger.info('latest release:')
    logger.info(release.toJSON())

    response.header('Cache-Control', 'public, max-age=300')

    return { data: await present(release) }
  }
}
