import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Where a release came from: typed into /ops, or drafted by CI through
 * `/api/ops/releases/drafts`. Existing rows were all made by hand.
 */
export default class extends BaseSchema {
  protected tableName = 'releases'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('source', 16).notNullable().defaultTo('ops')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('source')
    })
  }
}
