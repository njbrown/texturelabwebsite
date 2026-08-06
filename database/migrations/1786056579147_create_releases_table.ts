import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'releases'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('version').notNullable().unique()
      table.string('title').nullable()
      table.string('channel').notNullable().defaultTo('stable')
      table.text('notes').nullable()
      table.string('windows_url').nullable()
      table.string('mac_url').nullable()
      table.string('linux_url').nullable()
      table.boolean('is_published').notNullable().defaultTo(false)
      table.timestamp('released_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
