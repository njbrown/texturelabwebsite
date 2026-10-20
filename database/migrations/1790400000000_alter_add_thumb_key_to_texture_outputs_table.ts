import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'texture_outputs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // 512px webp for grids and hovers; null for outputs stored before it existed
      table.string('thumb_key').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('thumb_key')
    })
  }
}
