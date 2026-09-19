import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Release from '#models/release'
import site from '#config/site'
import { renderMarkdown } from '#services/markdown_service'

/**
 * The same label the markdown content uses, so release dates read like the
 * blog and gallery ones.
 */
function formatDate(value: string | null): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function summary(release: Release) {
  const releasedAt = release.releasedAt?.toISO() ?? null

  return {
    version: release.version,
    title: release.title,
    channel: release.channel,
    path: `/download/${encodeURIComponent(release.version)}`,
    releasedAt,
    releasedAtLabel: formatDate(releasedAt),
    downloads: {
      windows: release.windowsUrl,
      mac: release.macUrl,
      linux: release.linuxUrl,
      itch: release.itchUrl,
    },
  }
}

async function detail(release: Release) {
  const { html } = await renderMarkdown(release.notes ?? '')

  return { ...summary(release), notesHtml: release.notes ? html : null }
}

/**
 * Public download pages. Only published releases are ever visible here — the
 * ops area is the only place a draft can be seen.
 */
export default class DownloadsController {
  private query() {
    return Release.query()
      .where('is_published', true)
      .orderBy('released_at', 'desc')
      .orderBy('id', 'desc')
  }

  async index({ inertia }: HttpContext) {
    const releases = await this.query()

    /**
     * The headline download is the newest stable build. A project that has
     * only ever shipped betas still gets a card rather than an empty page.
     */
    const latest = releases.find((release) => release.channel === 'stable') ?? releases[0] ?? null

    return inertia.render('download/index', {
      latest: latest ? await detail(latest) : null,
      releases: releases.map(summary),
      links: site.links,
    })
  }

  async show({ params, inertia }: HttpContext) {
    const release = await this.query().where('version', params.version).first()

    if (!release) {
      throw new Exception(`Cannot find the release ${params.version}`, {
        status: 404,
        code: 'E_ROUTE_NOT_FOUND',
      })
    }

    return inertia.render('download/show', {
      release: await detail(release),
      links: site.links,
    })
  }
}
