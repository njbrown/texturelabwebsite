import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'releases'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('itch_url').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('itch_url')
    })
  }
}
