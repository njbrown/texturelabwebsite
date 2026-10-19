import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'textures'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('slug').notNullable().unique()
      table.string('title').notNullable()
      table.text('description').nullable()
      table
        .integer('category_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('texture_categories')
        .onDelete('SET NULL')
      // Lowercase, comma-joined, so LIKE search works the same on postgres and sqlite
      table.string('tags', 1000).notNullable().defaultTo('')

      table.string('status').notNullable().defaultTo('draft')
      table.timestamp('published_at').nullable()
      table.boolean('featured').notNullable().defaultTo(false)
      table.integer('sort_order').notNullable().defaultTo(0)

      // The .texture file
      table.string('source_key').notNullable()
      table.string('source_name').notNullable()
      table.string('source_sha256', 64).notNullable()
      table.integer('source_bytes').notNullable()

      // Read from the file on upload
      table.string('library_version').notNullable()
      table.string('app_version').nullable()
      table.integer('resolution').notNullable()
      table.integer('node_count').notNullable()
      table.integer('connection_count').notNullable()
      table.text('channels').notNullable()
      table.text('variables').notNullable()
      table.text('presets').notNullable()
      table.string('active_preset').nullable()
      table.text('warnings').notNullable()

      // Outputs rendered in /ops; 0 until the first render
      table.integer('outputs_revision').notNullable().defaultTo(0)
      table.string('outputs_sha256', 64).nullable()

      table.integer('download_count').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['status', 'published_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
