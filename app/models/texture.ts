import { DateTime } from 'luxon'
import { createId } from '@paralleldrive/cuid2'
import { BaseModel, beforeCreate, belongsTo, column, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import TextureCategory from '#models/texture_category'
import TextureImage from '#models/texture_image'
import TextureOutput from '#models/texture_output'
import type {
  ChannelSummary,
  PresetSummary,
  VariableSummary,
} from '#services/texture_metadata_service'

export const TEXTURE_STATUSES = ['draft', 'published'] as const
export type TextureStatus = (typeof TEXTURE_STATUSES)[number]

/**
 * JSON stored in a text column, so it reads the same on postgres and sqlite.
 */
function json<T>(fallback: T) {
  return {
    prepare: (value: T) => JSON.stringify(value ?? fallback),
    consume: (value: unknown): T => {
      if (typeof value !== 'string') return (value as T) ?? fallback
      try {
        return JSON.parse(value) as T
      } catch {
        return fallback
      }
    },
  }
}

export default class Texture extends BaseModel {
  /** CUIDs, assigned on create. */
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @beforeCreate()
  static assignId(model: Texture) {
    model.id ??= createId()
  }

  @column()
  declare slug: string

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare categoryId: string | null

  @belongsTo(() => TextureCategory, { foreignKey: 'categoryId' })
  declare category: BelongsTo<typeof TextureCategory>

  /**
   * Lowercase and comma-joined in the database; an array everywhere else.
   */
  @column({
    prepare: (value: string[]) => normalizeTags(value).join(','),
    consume: (value: string | null) => (value ? value.split(',').filter(Boolean) : []),
  })
  declare tags: string[]

  @column()
  declare status: TextureStatus

  @column.dateTime()
  declare publishedAt: DateTime | null

  @column({ consume: (value) => Boolean(value) })
  declare featured: boolean

  @column()
  declare sortOrder: number

  @column({ serializeAs: null })
  declare sourceKey: string

  @column()
  declare sourceName: string

  @column({ columnName: 'source_sha256' })
  declare sourceSha256: string

  @column()
  declare sourceBytes: number

  @column()
  declare libraryVersion: string

  @column()
  declare appVersion: string | null

  /** The resolution the file was saved with. */
  @column()
  declare resolution: number

  @column()
  declare nodeCount: number

  @column()
  declare connectionCount: number

  /** Channels the graph defines (albedo, normal, ...) and how each exports. */
  @column(json<ChannelSummary[]>([]))
  declare channels: ChannelSummary[]

  @column(json<VariableSummary[]>([]))
  declare variables: VariableSummary[]

  @column(json<PresetSummary[]>([]))
  declare presets: PresetSummary[]

  @column()
  declare activePreset: string | null

  /** Problems found when parsing or rendering the file. */
  @column(json<string[]>([]))
  declare warnings: string[]

  /** Bumped on every render of the outputs in /ops; 0 means never rendered. */
  @column()
  declare outputsRevision: number

  /** The source the current outputs were rendered from; stale when it differs. */
  @column({ columnName: 'outputs_sha256' })
  declare outputsSha256: string | null

  @column()
  declare downloadCount: number

  @hasMany(() => TextureOutput)
  declare outputs: HasMany<typeof TextureOutput>

  @hasMany(() => TextureImage)
  declare images: HasMany<typeof TextureImage>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  get isPublished() {
    return this.status === 'published'
  }

  get outputsStale() {
    return this.outputsRevision === 0 || this.outputsSha256 !== this.sourceSha256
  }

  static published = scope((query) => {
    query.where('status', 'published')
  })
}

export function normalizeTags(tags: string[] | null | undefined) {
  const seen = new Set<string>()
  for (const tag of tags ?? []) {
    const clean = tag.trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ')
    if (clean) seen.add(clean.slice(0, 40))
  }
  return [...seen].slice(0, 20)
}
