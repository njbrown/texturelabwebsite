import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'environments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable()
      // "hdr" (Radiance) or "exr" (OpenEXR)
      table.string('format').notNullable()
      // An uploaded file in storage ("upload") or an external link ("url")
      table.string('source').notNullable()
      table.string('key').nullable()
      table.string('url', 2000).nullable()
      table.integer('bytes').nullable()
      table.string('thumb_key').nullable()
      table.boolean('is_default').notNullable().defaultTo(false)
      table.integer('sort_order').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
