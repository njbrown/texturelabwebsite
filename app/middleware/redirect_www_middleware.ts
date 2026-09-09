import app from '@adonisjs/core/services/app'
import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'

/**
 * Redirects "www.texturelab.io" to the bare "texturelab.io" in production, so
 * the site is only ever served from a single canonical host.
 *
 * The redirect always points at https: the app sits behind a TLS-terminating
 * proxy in production and shield sends an HSTS header, so http is never a
 * destination we want to hand back to a browser.
 */
export default class RedirectWwwMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    if (!app.inProduction) {
      return next()
    }

    const host = ctx.request.host()
    if (!host || !host.startsWith('www.')) {
      return next()
    }

    /**
     * 301 is cacheable but lets browsers rewrite the method to GET, so anything
     * that is not a GET/HEAD gets the method-preserving 308 instead.
     */
    const isSafeMethod = ctx.request.method() === 'GET' || ctx.request.method() === 'HEAD'
    const target = `https://${host.slice(4)}${ctx.request.parsedUrl.path ?? '/'}`

    return ctx.response.redirect(target, false, isSafeMethod ? 301 : 308)
  }
}
