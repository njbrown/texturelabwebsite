import { DateTime } from 'luxon'
import { createId } from '@paralleldrive/cuid2'
import { BaseModel, beforeCreate, column, hasMany, scope } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Texture from '#models/texture'

export default class TextureCategory extends BaseModel {
  /** CUIDs, assigned on create. */
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @beforeCreate()
  static assignId(model: TextureCategory) {
    model.id ??= createId()
  }

  @column()
  declare slug: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare sortOrder: number

  @hasMany(() => Texture, { foreignKey: 'categoryId' })
  declare textures: HasMany<typeof Texture>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static ordered = scope((query) => {
    query.orderBy('sort_order', 'asc').orderBy('name', 'asc')
  })
}
