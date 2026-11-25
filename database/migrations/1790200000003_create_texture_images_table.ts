import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'texture_images'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('texture_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('textures')
        .onDelete('CASCADE')
      table.string('key').notNullable()
      table.string('thumb_key').notNullable()
      table.integer('width').notNullable()
      table.integer('height').notNullable()
      table.integer('bytes').notNullable()
      table.string('alt').nullable()
      // "upload" from an admin, "render" captured from the 3D viewer in /ops
      table.string('source').notNullable().defaultTo('upload')
      table.boolean('is_primary').notNullable().defaultTo(false)
      table.integer('sort_order').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
