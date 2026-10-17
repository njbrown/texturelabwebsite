import { DateTime } from 'luxon'
import { BaseModel, beforeSave, column, scope } from '@adonisjs/lucid/orm'

export const RELEASE_CHANNELS = ['stable', 'beta'] as const
export type ReleaseChannel = (typeof RELEASE_CHANNELS)[number]

/**
 * A build is named by four facts shared with the app: a plain numeric version,
 * its channel, the build number (the git commit count, which only grows on
 * master) and the short commit hash. The pre-release suffix that used to live
 * in the version is the channel now.
 */
export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/
export const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/
export const IDENTIFIER_PATTERN = /^(\d+\.\d+\.\d+)-(stable|beta)-([0-9a-f]{7,40})$/

/**
 * `0.4.0-beta-039faa9`. A label for people and URLs — builds are never ordered
 * by it, see `compareBuilds`.
 */
export function releaseIdentifier(version: string, channel: ReleaseChannel, commit: string) {
  return `${version}-${channel}-${commit}`
}

export function parseIdentifier(identifier: string) {
  const match = IDENTIFIER_PATTERN.exec(identifier.trim())
  if (!match) return null

  return { version: match[1], channel: match[2] as ReleaseChannel, commit: match[3] }
}

export function parseVersion(version: string) {
  if (!VERSION_PATTERN.test(version)) return null

  const [major, minor, patch] = version.split('.').map(Number)
  return { major, minor, patch }
}

type BuildKey = {
  versionMajor: number
  versionMinor: number
  versionPatch: number
  build: number
}

/**
 * The one ordering of builds: major, minor, patch, then build number. Positive
 * when `a` is newer. The commit is not part of it, so a rebuild of the same
 * version and build is never an update.
 */
export function compareBuilds(a: BuildKey, b: BuildKey) {
  return (
    a.versionMajor - b.versionMajor ||
    a.versionMinor - b.versionMinor ||
    a.versionPatch - b.versionPatch ||
    a.build - b.build
  )
}

export default class Release extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare version: string

  /**
   * Derived from `version` on save, so SQL can order by them.
   */
  @column()
  declare versionMajor: number

  @column()
  declare versionMinor: number

  @column()
  declare versionPatch: number

  @column()
  declare build: number

  @column()
  declare commit: string

  /**
   * Derived on save. Unique, and the key of the public download page.
   */
  @column()
  declare identifier: string

  @column()
  declare title: string | null

  @column()
  declare channel: ReleaseChannel

  @column()
  declare notes: string | null

  @column()
  declare windowsUrl: string | null

  @column()
  declare macUrl: string | null

  @column()
  declare linuxUrl: string | null

  /**
   * An itch.io page, for builds distributed there instead of (or as well as)
   * through direct links.
   */
  @column()
  declare itchUrl: string | null

  /**
   * SQLite stores booleans as 0/1, so they are normalised on the way out.
   */
  @column({ consume: (value) => Boolean(value) })
  declare isPublished: boolean

  @column.dateTime()
  declare releasedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeSave()
  static deriveIdentity(release: Release) {
    const parsed = parseVersion(release.version)

    if (!parsed) {
      throw new Error(`Release version "${release.version}" is not major.minor.patch`)
    }

    release.versionMajor = parsed.major
    release.versionMinor = parsed.minor
    release.versionPatch = parsed.patch
    release.identifier = releaseIdentifier(release.version, release.channel, release.commit)
  }

  static published = scope((query) => {
    query.where('is_published', true)
  })

  /**
   * Newest build first, by `compareBuilds`' key — never by release date. The id
   * only breaks ties between rebuilds of the same build.
   */
  static newestFirst = scope((query) => {
    query
      .orderBy('version_major', 'desc')
      .orderBy('version_minor', 'desc')
      .orderBy('version_patch', 'desc')
      .orderBy('build', 'desc')
      .orderBy('id', 'desc')
  })
}
