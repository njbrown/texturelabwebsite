import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import limiter from '@adonisjs/limiter/services/main'
import { errors as limiterErrors } from '@adonisjs/limiter'

type ThrottleOptions = {
  /** Groups the routes that share one budget. */
  name: string
  requests: number
  duration: string
  /** Count per signed-in user instead of per IP. */
  perUser?: boolean
}

/**
 * A request budget per IP (or per signed-in user) for a group of routes.
 */
export default class ThrottleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: ThrottleOptions) {
    const who = options.perUser && ctx.auth.user ? `user_${ctx.auth.user.id}` : ctx.request.ip()

    try {
      await limiter
        .use({ requests: options.requests, duration: options.duration })
        .consume(`throttle_${options.name}_${who}`)
    } catch (error) {
      if (error instanceof limiterErrors.E_TOO_MANY_REQUESTS) {
        ctx.response.header(
          'Retry-After',
          String(Math.max(1, Math.ceil(error.response.availableIn)))
        )
        return ctx.response.tooManyRequests({ error: 'Too many requests, try again shortly' })
      }
      throw error
    }

    return next()
  }
}
