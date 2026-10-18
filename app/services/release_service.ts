import { DateTime } from 'luxon'
import Release, { parseIdentifier } from '#models/release'
import type { ReleaseChannel } from '#models/release'

/**
 * The checks every way of writing a release goes through — the ops form and
 * the CI drafts API — kept in one place so they can never disagree.
 */

export type ReleaseInput = {
  identifier?: string | null
  version: string
  channel: ReleaseChannel
  build: number
  commit: string
  title?: string | null
  notes?: string | null
  windowsUrl?: string | null
  macUrl?: string | null
  linuxUrl?: string | null
  itchUrl?: string | null
  releasedAt?: string | null
}

export function toDateTime(value: string | null | undefined): DateTime | null {
  if (!value) return null

  const parsed = DateTime.fromISO(value)

  return parsed.isValid ? parsed : null
}

/**
 * Identifiers are unique, and SQLite reports that as a constraint failure
 * rather than a validation error — so it is checked up front.
 */
export async function identifierTaken(identifier: string, exceptId?: number) {
  const query = Release.query().where('identifier', identifier)

  if (exceptId) {
    query.whereNot('id', exceptId)
  }

  return Boolean(await query.first())
}

/**
 * A pasted identifier has to agree with the fields it was parsed into — above
 * all the channel, so a beta can't be filed as stable by a stray click.
 */
export function identifierMismatch(input: ReleaseInput): Record<string, string> | null {
  if (!input.identifier) return null

  const parsed = parseIdentifier(input.identifier)!
  const errors: Record<string, string> = {}

  if (parsed.channel !== input.channel) {
    errors.channel = `The identifier is a ${parsed.channel} build, not ${input.channel}`
  }
  if (parsed.version !== input.version) {
    errors.version = `The identifier is version ${parsed.version}`
  }
  if (parsed.commit !== input.commit) {
    errors.commit = `The identifier is commit ${parsed.commit}`
  }

  return Object.keys(errors).length ? errors : null
}

export function releaseAttributes(input: ReleaseInput) {
  return {
    version: input.version,
    channel: input.channel,
    build: input.build,
    commit: input.commit,
    title: input.title ?? null,
    notes: input.notes ?? null,
    windowsUrl: input.windowsUrl ?? null,
    macUrl: input.macUrl ?? null,
    linuxUrl: input.linuxUrl ?? null,
    itchUrl: input.itchUrl ?? null,
    releasedAt: toDateTime(input.releasedAt),
  }
}

export const PLATFORM_DOWNLOADS = [
  { key: 'windowsUrl', platform: 'windows', label: 'Windows' },
  { key: 'macUrl', platform: 'mac', label: 'macOS' },
  { key: 'linuxUrl', platform: 'linux', label: 'Linux' },
] as const

export type DownloadProblem = {
  /** The platform whose link is wrong, or null when the release has none at all. */
  platform: (typeof PLATFORM_DOWNLOADS)[number]['platform'] | null
  message: string
}

/**
 * Artifacts are named after the build (`texturelab-win-v0.4.0-beta-039faa9.zip`),
 * so a filename that doesn't contain the identifier is almost always a link to
 * the wrong build — typically a beta zip pasted into a stable release. The
 * itch.io page is exempt; it's one page for every build.
 */
export function downloadChecks(
  release: Pick<Release, 'identifier' | 'windowsUrl' | 'macUrl' | 'linuxUrl' | 'itchUrl'>
) {
  const problems: DownloadProblem[] = []

  if (!release.windowsUrl && !release.macUrl && !release.linuxUrl && !release.itchUrl) {
    problems.push({ platform: null, message: 'Add at least one download link.' })
  }

  for (const { key, platform, label } of PLATFORM_DOWNLOADS) {
    const url = release[key]
    if (!url) continue

    const filename = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '')

    if (!filename.includes(release.identifier)) {
      problems.push({
        platform,
        message: `The ${label} download (${filename || url}) doesn't contain ${release.identifier} — is it the right build?`,
      })
    }
  }

  return problems
}

export function downloadProblems(
  release: Pick<Release, 'identifier' | 'windowsUrl' | 'macUrl' | 'linuxUrl' | 'itchUrl'>
) {
  return downloadChecks(release).map((problem) => problem.message)
}
