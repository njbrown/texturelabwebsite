import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Builds used to be told apart by a version string with the channel baked in
 * (`0.4.0-beta`). They are now four separate facts — version, channel, build
 * and commit — with the `version-channel-commit` identifier as the unique key,
 * so several betas can share a version.
 */

const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-(stable|beta))?$/
const COMMIT_IN_FILENAME = /-([0-9a-f]{7,40})\.zip$/

/**
 * `git rev-list --count <commit>` for builds that were live before builds had a
 * number. It can't be recovered from the row itself.
 */
const KNOWN_BUILDS: Record<string, number> = {
  '039faa9': 963,
}

type LegacyRow = {
  id: number
  version: string
  channel: string
  is_published: boolean | number
  windows_url: string | null
  mac_url: string | null
  linux_url: string | null
}

function commitFromUrls(row: LegacyRow) {
  for (const url of [row.windows_url, row.mac_url, row.linux_url]) {
    const match = url ? COMMIT_IN_FILENAME.exec(url) : null
    if (match) return match[1]
  }

  return null
}

/**
 * A row converts when its version is `X.Y.Z` (optionally with a suffix that
 * agrees with its channel), a download filename names the commit and that
 * commit's build number is known.
 *
 * Anything else keeps its version string as it was — so the ops form refuses
 * to save it until it is corrected — gets build 0 and a placeholder commit made
 * from its id, and is unpublished so it can't be served with a made up build
 * number.
 */
function convert(row: LegacyRow) {
  const version = VERSION.exec(row.version)
  const suffixAgrees = !version?.[4] || version[4] === row.channel
  const commit = commitFromUrls(row)
  const build = commit ? KNOWN_BUILDS[commit] : undefined

  if (version && suffixAgrees && commit && build !== undefined) {
    const [, major, minor, patch] = version.map(Number)
    const plain = `${major}.${minor}.${patch}`

    return {
      version: plain,
      version_major: major,
      version_minor: minor,
      version_patch: patch,
      build,
      commit,
      identifier: `${plain}-${row.channel}-${commit}`,
    }
  }

  const leading = /^(\d+)\.(\d+)\.(\d+)/.exec(row.version)
  const [major, minor, patch] = leading ? leading.slice(1).map(Number) : [0, 0, 0]
  const placeholder = row.id.toString(16).padStart(7, '0')

  return {
    version_major: major,
    version_minor: minor,
    version_patch: patch,
    build: 0,
    commit: placeholder,
    identifier: `${row.version}-${row.channel}-${placeholder}`,
    is_published: false,
  }
}

export default class extends BaseSchema {
  protected tableName = 'releases'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('version_major').nullable()
      table.integer('version_minor').nullable()
      table.integer('version_patch').nullable()
      table.integer('build').nullable()
      table.string('commit', 40).nullable()
      table.string('identifier').nullable()
    })

    this.defer(async (db) => {
      const rows: LegacyRow[] = await db.from(this.tableName).select('*')

      for (const row of rows) {
        await db.from(this.tableName).where('id', row.id).update(convert(row))
      }
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['version'])
      table.unique(['identifier'])
    })

    /**
     * `alter` restates each column, which on Postgres also drops the old
     * `'stable'` default from the channel. SQLite rebuilds the table to do it.
     */
    this.schema.alterTable(this.tableName, (table) => {
      table.string('channel').notNullable().alter()
      table.integer('version_major').notNullable().alter()
      table.integer('version_minor').notNullable().alter()
      table.integer('version_patch').notNullable().alter()
      table.integer('build').notNullable().alter()
      table.string('commit', 40).notNullable().alter()
      table.string('identifier').notNullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['identifier'])
      table.dropColumn('version_major')
      table.dropColumn('version_minor')
      table.dropColumn('version_patch')
      table.dropColumn('build')
      table.dropColumn('commit')
      table.dropColumn('identifier')
    })

    /**
     * Only safe to run back while every version is unique again — the old
     * schema can't hold two betas of the same version.
     */
    this.schema.alterTable(this.tableName, (table) => {
      table.string('channel').notNullable().defaultTo('stable').alter()
      table.unique(['version'])
    })
  }
}
