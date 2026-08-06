import { BaseSeeder } from '@adonisjs/lucid/seeders'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import User from '#models/user'

/**
 * Seeds (or updates) the single /ops admin account from the environment.
 * Re-running it after changing ADMIN_PASSWORD rotates the password.
 */
export default class extends BaseSeeder {
  async run() {
    const email = env.get('ADMIN_EMAIL')
    const password = env.get('ADMIN_PASSWORD')

    if (!email || !password) {
      logger.warn('Skipping admin seeder: ADMIN_EMAIL and ADMIN_PASSWORD are not set')
      return
    }

    const user = await User.updateOrCreate(
      { email },
      { password, fullName: env.get('ADMIN_NAME') ?? 'Admin' }
    )

    logger.info(`Seeded admin account ${user.email}`)
  }
}
