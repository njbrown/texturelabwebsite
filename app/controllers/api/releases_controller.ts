import type { HttpContext } from '@adonisjs/core/http'
import vine, { errors as vineErrors } from '@vinejs/vine'
import Release from '#models/release'
import { RELEASE_CHANNELS } from '#models/release'
import { liveRelease, presentRelease } from '#services/release_feed_service'
import { recordVisit } from '#services/usage_service'

const indexQueryValidator = vine.compile(
  vine.object({
    channel: vine.enum(RELEASE_CHANNELS).optional(),
    limit: vine.number().min(1).max(100).optional(),
  })
)

/**
 * The channel is required: a client that forgets it gets an error, never a
 * silent "stable", so a build can't end up asking the wrong channel.
 */
const latestQueryValidator = vine.compile(
  vine.object({
    channel: vine.enum(RELEASE_CHANNELS),
  })
)

/**
 * The default exception handler negotiates on the Accept header and would send
 * a redirect to a client that does not ask for JSON. This is a machine-facing
 * endpoint, so bad input always comes back as a 422 with the messages.
 */
async function validateQuery<Query>(validate: () => Promise<Query>) {
  try {
    return { query: await validate(), errors: null }
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
    const { query, errors } = await validateQuery(() => indexQueryValidator.validate(request.qs()))

    if (!query) {
      return response.unprocessableEntity({ errors })
    }

    const { channel, limit } = query

    const releases = await Release.query()
      .withScopes((scopes) => scopes.published())
      .if(channel, (builder) => builder.where('channel', channel!))
      .withScopes((scopes) => scopes.newestFirst())
      .limit(limit ?? 20)

    response.header('Cache-Control', 'public, max-age=300')

    return {
      data: await Promise.all(releases.map(presentRelease)),
    }
  }

  async latest({ request, response }: HttpContext) {
    const { query, errors } = await validateQuery(() => latestQueryValidator.validate(request.qs()))

    if (!query) {
      return response.unprocessableEntity({ errors })
    }

    // The app calls this on startup, so it doubles as an anonymous daily count.
    recordVisit(request.ip(), request.header('user-agent'))

    const release = await liveRelease(query.channel)

    if (!release) {
      return response.notFound({ error: 'No published release found' })
    }

    response.header('Cache-Control', 'public, max-age=300')

    return { data: await presentRelease(release) }
  }
}
