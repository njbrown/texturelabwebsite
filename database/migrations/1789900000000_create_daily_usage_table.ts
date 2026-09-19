import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * One row per UTC day holding only an aggregate count. No hashes, IPs or user
 * agents are ever written here — see app/services/usage_service.ts.
 */
export default class extends BaseSchema {
  protected tableName = 'daily_usage'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('day', 10).primary() // YYYY-MM-DD, UTC
      table.integer('visitors').unsigned().notNullable().defaultTo(0)
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
