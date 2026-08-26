import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { createRequire } from 'node:module'
import { defineConfig, targets } from '@adonisjs/core/logger'
import 'pino-pretty'

/**
 * "pino-pretty" is a devDependency, so it is pruned from the production image
 * by `npm ci --omit=dev`. Asking pino for the pretty transport when the package
 * is missing throws at boot ("unable to determine transport target"), which
 * would take down the server (and the migrations that run before it) over a
 * logging nicety. Probing for it keeps the fallback to plain JSON on stdout.
 */
const canPrettyPrint = (() => {
  try {
    createRequire(import.meta.url).resolve('pino-pretty')
    return true
  } catch {
    return false
  }
})()

const usePretty = !app.inProduction && canPrettyPrint

const loggerConfig = defineConfig({
  default: 'app',

  /**
   * The loggers object can be used to define multiple loggers.
   * By default, we configure only one logger (named "app").
   */
  loggers: {
    app: {
      enabled: true,
      name: env.get('APP_NAME'),
      level: env.get('LOG_LEVEL'),
      transport: {
        targets: targets()
          .pushIf(usePretty, targets.pretty())
          .pushIf(!usePretty, targets.file({ destination: 1 }))
          .toArray(),
      },
    },
  },
})

export default loggerConfig

/**
 * Inferring types for the list of loggers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  export interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}
