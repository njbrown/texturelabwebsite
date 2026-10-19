import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'texture_outputs'

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
      table.integer('revision').notNullable()
      table.string('channel').notNullable()
      table.string('key').notNullable()
      table.integer('width').notNullable()
      table.integer('height').notNullable()
      table.integer('bit_depth').notNullable()
      table.string('color_type').notNullable()
      table.string('format').notNullable()
      table.integer('bytes').notNullable()
      table.string('render_target_format').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['texture_id', 'revision', 'channel'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
