import { DateTime } from 'luxon'
import { BaseModel, column, scope } from '@adonisjs/lucid/orm'

export const ENVIRONMENT_FORMATS = ['hdr', 'exr'] as const
export type EnvironmentFormat = (typeof ENVIRONMENT_FORMATS)[number]

/**
 * An HDRI for lighting the 3D preview: uploaded to storage, or linked from
 * elsewhere (which then has to allow cross-origin requests).
 */
export default class Environment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare format: EnvironmentFormat

  @column()
  declare source: 'upload' | 'url'

  @column({ serializeAs: null })
  declare key: string | null

  @column()
  declare url: string | null

  @column()
  declare bytes: number | null

  @column({ serializeAs: null })
  declare thumbKey: string | null

  /** Lights the 3D preview when it first loads. At most one. */
  @column({ consume: (value) => Boolean(value) })
  declare isDefault: boolean

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static ordered = scope((query) => {
    query.orderBy('sort_order', 'asc').orderBy('name', 'asc')
  })
}
