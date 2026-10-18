import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, stores } from '@adonisjs/limiter'
import type { InferLimiters } from '@adonisjs/limiter/types'

const limiterConfig = defineConfig({
  /**
   * Redis in production, so limits hold across replicas and restarts. The
   * test environment uses memory, which needs no Redis and is reset between
   * tests with `limiter.clear(['memory'])`. (.env.test is not committed, so
   * that doesn't rely on it.)
   */
  default: env.get('LIMITER_STORE', app.inTest ? 'memory' : 'redis'),

  stores: {
    redis: stores.redis({
      connectionName: 'main',
      keyPrefix: 'limiter',
    }),

    memory: stores.memory({}),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
