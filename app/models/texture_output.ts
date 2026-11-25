import { DateTime } from 'luxon'
import { createId } from '@paralleldrive/cuid2'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Texture from '#models/texture'

/**
 * One channel of a texture's default render, made in the admin's browser
 * (the server has no WebGL) and stored as PNG.
 */
export default class TextureOutput extends BaseModel {
  /** CUIDs, assigned on create. */
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @beforeCreate()
  static assignId(model: TextureOutput) {
    model.id ??= createId()
  }

  @column()
  declare textureId: string

  @belongsTo(() => Texture)
  declare texture: BelongsTo<typeof Texture>

  @column()
  declare revision: number

  @column()
  declare channel: string

  @column({ serializeAs: null })
  declare key: string

  /** 512px webp, for grids and hovers. Null on outputs stored before it existed. */
  @column({ serializeAs: null })
  declare thumbKey: string | null

  @column()
  declare width: number

  @column()
  declare height: number

  @column()
  declare bitDepth: number

  /** PNG color type: "grey" or "rgba". */
  @column()
  declare colorType: string

  @column()
  declare format: string

  @column()
  declare bytes: number

  /** Precision of the GPU the render ran on (rgba32f, rgba16f, rgba8). */
  @column()
  declare renderTargetFormat: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
