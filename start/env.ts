/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring the database
  |----------------------------------------------------------
  |
  | DB_CONNECTION picks the connection defined in config/database.ts and
  | defaults to "sqlite". The DB_* credentials below are for the postgres
  | connection, served by the container in docker-compose.yml.
  */
  DB_CONNECTION: Env.schema.enum.optional(['sqlite', 'postgres'] as const),
  DB_FILE: Env.schema.string.optional(),
  DB_HOST: Env.schema.string.optional({ format: 'host' }),
  DB_PORT: Env.schema.number.optional(),
  DB_USER: Env.schema.string.optional(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for the /ops admin
  |----------------------------------------------------------
  |
  | The admin account seeded by `node ace db:seed`.
  */
  ADMIN_EMAIL: Env.schema.string.optional({ format: 'email' }),
  ADMIN_PASSWORD: Env.schema.string.optional(),
  ADMIN_NAME: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the redis package
  |----------------------------------------------------------
  */
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),
})
