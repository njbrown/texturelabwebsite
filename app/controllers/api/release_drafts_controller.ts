import type { HttpContext } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'
import Release, { parseIdentifier } from '#models/release'
import site from '#config/site'
import { downloadChecks, releaseAttributes, toDateTime } from '#services/release_service'
import type { ReleaseInput } from '#services/release_service'
import { releaseDraftValidator } from '#validators/release'

type DraftPayload = Awaited<ReturnType<(typeof releaseDraftValidator)['validate']>>

type FieldError = { field: string; message: string; rule: string }

const DOWNLOAD_FIELDS = {
  windows: 'windowsUrl',
  mac: 'macUrl',
  linux: 'linuxUrl',
  itch: 'itchUrl',
} as const

/**
 * The request in the shape the ops form posts, so both go through the same
 * attribute mapping and checks.
 */
function toReleaseInput(payload: DraftPayload): ReleaseInput {
  const { version, channel, commit } = parseIdentifier(payload.identifier)!

  return {
    identifier: payload.identifier,
    version,
    channel,
    commit,
    build: payload.build,
    title: payload.title,
    notes: payload.notes,
    windowsUrl: payload.downloads?.windows,
    macUrl: payload.downloads?.mac,
    linuxUrl: payload.downloads?.linux,
    itchUrl: payload.downloads?.itch,
    releasedAt: payload.releasedAt,
  }
}

/**
 * On a re-run, a field the workflow left out keeps what the draft has — so
 * notes written by hand in /ops survive a rebuild. Sending null clears it.
 */
function sentAttributes(payload: DraftPayload, input: ReleaseInput) {
  const attributes: Partial<ReturnType<typeof releaseAttributes>> = releaseAttributes(input)
  const omitted = (['title', 'notes', 'releasedAt'] as const).filter(
    (field) => payload[field] === undefined
  )

  for (const field of omitted) delete attributes[field]

  for (const [platform, key] of Object.entries(DOWNLOAD_FIELDS)) {
    if (payload.downloads?.[platform as keyof typeof DOWNLOAD_FIELDS] === undefined) {
      delete attributes[key]
    }
  }

  return attributes
}

/**
 * Lets CI file the build it just uploaded as a draft, for a person to check
 * and publish in /ops. It can never publish, and never touches a release that
 * is already published.
 */
export default class ReleaseDraftsController {
  async store({ request, response }: HttpContext) {
    let payload: DraftPayload

    // Always a 422 with the messages — never the redirect the default handler
    // sends a client that forgets to ask for JSON.
    try {
      payload = await releaseDraftValidator.validate(request.body())
    } catch (error) {
      if (error instanceof vineErrors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({ errors: error.messages })
      }

      throw error
    }

    if (payload.releasedAt && !toDateTime(payload.releasedAt)) {
      return response.unprocessableEntity({
        errors: [
          {
            field: 'releasedAt',
            message: 'The releasedAt field must be an ISO-8601 date',
            rule: 'date',
          },
        ],
      })
    }

    const input = toReleaseInput(payload)
    const existing = await Release.findBy('identifier', payload.identifier)

    if (existing?.isPublished) {
      return response.conflict({
        error: `${existing.identifier} is already published; it can only be changed in /ops`,
      })
    }

    const release = existing ?? new Release()

    if (existing) {
      release.merge(sentAttributes(payload, input))
    } else {
      release.merge({ ...releaseAttributes(input), isPublished: false, source: 'ci' })
    }

    // The identifier is derived on save; set it now so the links can be checked.
    release.identifier = payload.identifier

    const problems: FieldError[] = downloadChecks(release).map(({ platform, message }) => ({
      field: platform ? `downloads.${platform}` : 'downloads',
      message,
      rule: 'download',
    }))

    if (problems.length) {
      return response.unprocessableEntity({ errors: problems })
    }

    await release.save()

    return response.status(existing ? 200 : 201).send({
      data: {
        id: release.id,
        identifier: release.identifier,
        created: !existing,
        editUrl: new URL(`/ops/releases/${release.id}/edit`, site.url).toString(),
      },
    })
  }
}
