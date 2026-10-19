import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Texture from '#models/texture'

export const IMAGE_SOURCES = ['upload', 'render'] as const
export type ImageSource = (typeof IMAGE_SOURCES)[number]

/**
 * A thumbnail or render shown in the gallery: uploaded by an admin, or captured
 * from the 3D viewer in /ops.
 */
export default class TextureImage extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare textureId: number

  @belongsTo(() => Texture)
  declare texture: BelongsTo<typeof Texture>

  @column({ serializeAs: null })
  declare key: string

  /** 512px webp for grids. */
  @column({ serializeAs: null })
  declare thumbKey: string

  @column()
  declare width: number

  @column()
  declare height: number

  @column()
  declare bytes: number

  @column()
  declare alt: string | null

  @column()
  declare source: ImageSource

  @column({ consume: (value) => Boolean(value) })
  declare isPrimary: boolean

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
