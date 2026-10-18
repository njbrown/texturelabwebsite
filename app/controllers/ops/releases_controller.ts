import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Release, { compareBuilds, releaseIdentifier } from '#models/release'
import type { ReleaseChannel } from '#models/release'
import { liveRelease, offerFor, presentRelease } from '#services/release_feed_service'
import {
  downloadProblems,
  identifierMismatch,
  identifierTaken,
  releaseAttributes,
} from '#services/release_service'
import {
  createReleaseValidator,
  offerQueryValidator,
  publishReleaseValidator,
  updateReleaseValidator,
} from '#validators/release'

/**
 * Everything that has to hold before a build goes out to a channel. All of it
 * is blocking; the only escape hatch is `allowOlder`, for putting an old build
 * on the download page that the app will never offer.
 */
async function publishProblems(release: Release, allowOlder: boolean) {
  const problems = downloadProblems(release)
  const live = await liveRelease(release.channel)

  if (live && live.id !== release.id && compareBuilds(release, live) <= 0 && !allowOlder) {
    const note = live.channel === release.channel ? '' : ` (beta builds are offered stable too)`

    problems.push(
      `${release.identifier} (build ${release.build}) is not newer than ${live.identifier} (build ${live.build}), which is live on ${release.channel}${note}.`
    )
  }

  return problems
}

/**
 * What each channel serves right now — exactly `/api/releases/latest`.
 */
async function liveByChannel() {
  const [stable, beta] = await Promise.all([liveRelease('stable'), liveRelease('beta')])

  return {
    stable: stable?.serialize() ?? null,
    beta: beta?.serialize() ?? null,
  } satisfies Record<ReleaseChannel, unknown>
}

export default class ReleasesController {
  async index({ inertia }: HttpContext) {
    const releases = await Release.query().withScopes((scopes) => scopes.newestFirst())

    return inertia.render('ops/releases/index', {
      releases: releases.map((release) => release.serialize()),
      live: await liveByChannel(),
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('ops/releases/create')
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(createReleaseValidator)
    const identifier = releaseIdentifier(payload.version, payload.channel, payload.commit)
    const mismatch = identifierMismatch(payload)

    if (mismatch) {
      session.flashErrors(mismatch)
      session.flashAll()
      return response.redirect().back()
    }

    if (await identifierTaken(identifier)) {
      session.flashErrors({ identifier: 'A release with this identifier already exists' })
      session.flashAll()
      return response.redirect().back()
    }

    await Release.create({ ...releaseAttributes(payload), isPublished: false })
    session.flash('notification', `Release ${identifier} created as a draft`)

    return response.redirect('/ops/releases')
  }

  async edit({ params, inertia }: HttpContext) {
    const release = await Release.findOrFail(params.id)

    return inertia.render('ops/releases/edit', {
      release: release.serialize(),
      live: await liveByChannel(),
    })
  }

  async update({ params, request, response, session }: HttpContext) {
    const release = await Release.findOrFail(params.id)
    const payload = await request.validateUsing(updateReleaseValidator)
    const identifier = releaseIdentifier(payload.version, payload.channel, payload.commit)
    const mismatch = identifierMismatch(payload)

    if (mismatch) {
      session.flashErrors(mismatch)
      session.flashAll()
      return response.redirect().back()
    }

    if (await identifierTaken(identifier, release.id)) {
      session.flashErrors({ identifier: 'A release with this identifier already exists' })
      session.flashAll()
      return response.redirect().back()
    }

    /**
     * A live release can have its notes and links fixed, but not be turned into
     * a different build — that would skip every publish check.
     */
    if (
      release.isPublished &&
      (identifier !== release.identifier || payload.build !== release.build)
    ) {
      session.flashErrors({
        identifier: 'Unpublish this release before changing which build it is',
      })
      session.flashAll()
      return response.redirect().back()
    }

    release.merge(releaseAttributes(payload))

    // A live release keeps its links honest too; nothing is saved if they are not.
    const problems = release.isPublished ? downloadProblems(release) : []

    if (problems.length) {
      session.flashErrors({ downloads: problems.join(' ') })
      session.flashAll()
      return response.redirect().back()
    }

    await release.save()
    session.flash('notification', `Release ${release.identifier} updated`)

    return response.redirect('/ops/releases')
  }

  async publish({ params, request, response, session }: HttpContext) {
    const release = await Release.findOrFail(params.id)
    const { confirm, allowOlder } = await request.validateUsing(publishReleaseValidator)

    if (release.isPublished) {
      session.flashErrors({ publish: `${release.identifier} is already published` })
      return response.redirect().back()
    }

    const problems = await publishProblems(release, allowOlder ?? false)

    if (release.channel === 'stable' && confirm !== 'stable') {
      problems.push('Type "stable" to confirm publishing to the stable channel.')
    }

    if (problems.length) {
      session.flashErrors({ publish: problems })
      return response.redirect().back()
    }

    release.isPublished = true
    release.releasedAt = release.releasedAt ?? DateTime.utc()
    await release.save()

    session.flash(
      'notification',
      `Published ${release.identifier} to the ${release.channel.toUpperCase()} channel`
    )

    return response.redirect().back()
  }

  async unpublish({ params, response, session }: HttpContext) {
    const release = await Release.findOrFail(params.id)

    release.isPublished = false
    await release.save()

    session.flash(
      'notification',
      `Unpublished ${release.identifier} from the ${release.channel.toUpperCase()} channel`
    )

    return response.redirect().back()
  }

  /**
   * The "what would this build see?" tool on the dashboard: the same decision
   * as the app's update check, made with the same code as the public feed.
   */
  async offer({ request }: HttpContext) {
    const { identifier, build } = await request.validateUsing(offerQueryValidator, {
      data: request.qs(),
    })

    const result = (await offerFor(identifier, build))!

    return {
      data: {
        channel: result.channel,
        upToDate: !result.offered,
        live: result.live ? await presentRelease(result.live) : null,
        offered: result.offered ? await presentRelease(result.offered) : null,
      },
    }
  }

  async destroy({ params, response, session }: HttpContext) {
    const release = await Release.findOrFail(params.id)
    await release.delete()

    session.flash('notification', `Release ${release.identifier} deleted`)

    return response.redirect('/ops/releases')
  }
}
