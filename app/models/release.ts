import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export const RELEASE_CHANNELS = ['stable', 'beta'] as const
export type ReleaseChannel = (typeof RELEASE_CHANNELS)[number]

export default class Release extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare version: string

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
}
