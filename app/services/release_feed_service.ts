import Release, { compareBuilds, parseIdentifier, parseVersion } from '#models/release'
import type { ReleaseChannel } from '#models/release'
import site from '#config/site'
import { renderMarkdown } from '#services/markdown_service'

/**
 * What `/api/releases/latest` serves, in one place so the API, the ops pages
 * and the "what would this build see" tool can never disagree.
 */

async function newestPublished(channel: ReleaseChannel) {
  return Release.query()
    .withScopes((scopes) => scopes.published())
    .where('channel', channel)
    .withScopes((scopes) => scopes.newestFirst())
    .first()
}

/**
 * Stable builds only ever hear about stable releases. Beta builds hear about
 * whichever is newer of the latest beta and the latest stable, so a beta user
 * is never left behind once a stable release overtakes their build.
 */
export async function liveRelease(channel: ReleaseChannel) {
  const stable = await newestPublished('stable')
  if (channel === 'stable') return stable

  const beta = await newestPublished('beta')
  if (!beta || !stable) return beta ?? stable

  return compareBuilds(stable, beta) > 0 ? stable : beta
}

/**
 * The absolute address of a release's public page, which the app opens from
 * its "New Version Available" prompt.
 */
export function pageUrl(release: Release) {
  return new URL(`/download/${encodeURIComponent(release.identifier)}`, site.url).toString()
}

export type PresentedRelease = Awaited<ReturnType<typeof presentRelease>>

/**
 * The public API shape of a release.
 */
export async function presentRelease(release: Release) {
  const { html } = await renderMarkdown(release.notes ?? '')

  return {
    identifier: release.identifier,
    version: release.version,
    channel: release.channel,
    build: release.build,
    commit: release.commit,
    title: release.title,
    notes: release.notes,
    notesHtml: html,
    releasedAt: release.releasedAt?.toISO() ?? null,
    downloads: {
      windows: release.windowsUrl,
      mac: release.macUrl,
      linux: release.linuxUrl,
      itch: release.itchUrl,
    },
    pageUrl: pageUrl(release),
  }
}

/**
 * The decision the app makes on startup, made here instead: given a build's
 * identifier and build number, what (if anything) would it be offered?
 * Returns null for an identifier that does not parse.
 */
export async function offerFor(identifier: string, build: number) {
  const parsed = parseIdentifier(identifier)
  if (!parsed) return null

  const version = parseVersion(parsed.version)!
  const local = {
    versionMajor: version.major,
    versionMinor: version.minor,
    versionPatch: version.patch,
    build,
  }

  const live = await liveRelease(parsed.channel)
  const offered = live && compareBuilds(live, local) > 0 ? live : null

  return { channel: parsed.channel, live, offered }
}
