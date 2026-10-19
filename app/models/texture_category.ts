import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, scope } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Texture from '#models/texture'

export default class TextureCategory extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

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
