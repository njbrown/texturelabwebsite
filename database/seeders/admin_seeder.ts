import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import User from '#models/user'

/**
 * Seeds (or updates) the single /ops admin account from the environment.
 * Re-running it after changing ADMIN_PASSWORD rotates the password.
 *
 * In production a missing or placeholder password is a hard failure: the
 * container entrypoint runs this on every boot, and silently skipping would
 * leave /ops with no way in (or worse, a publicly known password).
 */
export default class extends BaseSeeder {
  async run() {
    const email = env.get('ADMIN_EMAIL')
    const password = env.get('ADMIN_PASSWORD')

    if (!email || !password) {
      if (app.inProduction) {
        throw new Error('Cannot seed the /ops admin: ADMIN_EMAIL and ADMIN_PASSWORD must be set')
      }

      logger.warn('Skipping admin seeder: ADMIN_EMAIL and ADMIN_PASSWORD are not set')
      return
    }

    if (app.inProduction && password === 'change-me') {
      throw new Error(
        'Cannot seed the /ops admin: ADMIN_PASSWORD is still the placeholder "change-me"'
      )
    }

    const user = await User.updateOrCreate(
      { email },
      { password, fullName: env.get('ADMIN_NAME') ?? 'Admin' }
    )

    logger.info(`Seeded admin account ${user.email}`)
  }
}
