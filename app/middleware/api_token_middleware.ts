import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import limiter from '@adonisjs/limiter/services/main'
import { errors as limiterErrors } from '@adonisjs/limiter'

/**
 * Failed authentications allowed per IP before it is locked out. Checked
 * before the token is even looked at, so guessing tokens is slow.
 */
const FAILED_AUTH = { requests: 10, duration: '15 mins' }

export type ApiTokenOptions = {
  /** The ability the token must have, e.g. `releases:draft`. */
  ability: string
  /** Requests each token may make to the route, per `duration`. */
  requests: number
  duration: string
}

function tooManyRequests({ response }: HttpContext, retryAfter: number) {
  response.header('Retry-After', String(Math.max(1, Math.ceil(retryAfter))))

  return response.tooManyRequests({ error: 'Too many requests, try again later' })
}

/**
 * Authenticates machine clients (CI) with a bearer token from /ops/tokens.
 * Every outcome is JSON — this never redirects to the login page the way the
 * session `auth` middleware does.
 */
export default class ApiTokenMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: ApiTokenOptions) {
    const failures = limiter.use({ ...FAILED_AUTH })
    const ipKey = `api_auth_failures_${ctx.request.ip()}`

    if (await failures.isBlocked(ipKey)) {
      const blocked = await failures.get(ipKey)
      return tooManyRequests(ctx, blocked?.availableIn ?? 1)
    }

    // Missing, malformed, unknown, revoked (deleted) and expired all land here.
    const guard = ctx.auth.use('api')

    if (!(await guard.check())) {
      await failures.increment(ipKey)
      return ctx.response.unauthorized({ error: 'Missing or invalid API token' })
    }

    const token = guard.user!.currentAccessToken

    if (!token.allows(options.ability)) {
      return ctx.response.forbidden({ error: `This token lacks the "${options.ability}" ability` })
    }

    try {
      await limiter
        .use({ requests: options.requests, duration: options.duration })
        .consume(`api_token_${ctx.route?.pattern}_${token.identifier}`)
    } catch (error) {
      if (error instanceof limiterErrors.E_TOO_MANY_REQUESTS) {
        return tooManyRequests(ctx, error.response.availableIn)
      }

      throw error
    }

    return next()
  }
}
