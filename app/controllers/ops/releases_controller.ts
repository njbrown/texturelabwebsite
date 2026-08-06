import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Release from '#models/release'
import { createReleaseValidator, updateReleaseValidator } from '#validators/release'

type ReleasePayload = Awaited<ReturnType<(typeof createReleaseValidator)['validate']>>

function toDateTime(value: string | null | undefined): DateTime | null {
  if (!value) return null

  const parsed = DateTime.fromISO(value)

  return parsed.isValid ? parsed : null
}

/**
 * Versions are unique, and SQLite reports that as a constraint failure rather
 * than a validation error — so it is checked up front.
 */
async function versionTaken(version: string, exceptId?: number) {
  const query = Release.query().where('version', version)

  if (exceptId) {
    query.whereNot('id', exceptId)
  }

  return Boolean(await query.first())
}

function attributes(payload: ReleasePayload) {
  return {
    version: payload.version,
    title: payload.title ?? null,
    channel: payload.channel,
    notes: payload.notes ?? null,
    windowsUrl: payload.windowsUrl ?? null,
    macUrl: payload.macUrl ?? null,
    linuxUrl: payload.linuxUrl ?? null,
    isPublished: payload.isPublished,
    releasedAt: toDateTime(payload.releasedAt),
  }
}

export default class ReleasesController {
  async index({ inertia }: HttpContext) {
    const releases = await Release.query().orderBy('released_at', 'desc').orderBy('id', 'desc')

    return inertia.render('ops/releases/index', {
      releases: releases.map((release) => release.serialize()),
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('ops/releases/create')
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(createReleaseValidator)

    if (await versionTaken(payload.version)) {
      session.flashErrors({ version: 'A release with this version already exists' })
      session.flashAll()
      return response.redirect().back()
    }

    await Release.create(attributes(payload))
    session.flash('notification', `Release ${payload.version} created`)

    return response.redirect('/ops/releases')
  }

  async edit({ params, inertia }: HttpContext) {
    const release = await Release.findOrFail(params.id)

    return inertia.render('ops/releases/edit', { release: release.serialize() })
  }

  async update({ params, request, response, session }: HttpContext) {
    const release = await Release.findOrFail(params.id)
    const payload = await request.validateUsing(updateReleaseValidator)

    if (await versionTaken(payload.version, release.id)) {
      session.flashErrors({ version: 'A release with this version already exists' })
      session.flashAll()
      return response.redirect().back()
    }

    release.merge(attributes(payload))
    await release.save()
    session.flash('notification', `Release ${release.version} updated`)

    return response.redirect('/ops/releases')
  }

  async destroy({ params, response, session }: HttpContext) {
    const release = await Release.findOrFail(params.id)
    await release.delete()

    session.flash('notification', `Release ${release.version} deleted`)

    return response.redirect('/ops/releases')
  }
}
