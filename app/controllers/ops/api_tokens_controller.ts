import type { HttpContext } from '@adonisjs/core/http'
import type { AccessToken } from '@adonisjs/auth/access_tokens'
import db from '@adonisjs/lucid/services/db'
import User, { API_ABILITIES } from '#models/user'
import { createApiTokenValidator } from '#validators/api_token'

/**
 * The repository secret the release workflow reads the token from.
 */
const GITHUB_SECRET_NAME = 'TEXTURELAB_SITE_TOKEN'

/**
 * SQLite hands timestamps back as numbers or strings, Postgres as dates.
 */
function toIso(value: Date | null) {
  return value ? new Date(value).toISOString() : null
}

/**
 * The listed shape of a token: never its value, nor its hash.
 */
function presentToken(token: AccessToken, owner: User) {
  return {
    id: Number(token.identifier),
    name: token.name,
    abilities: token.abilities,
    createdBy: owner.email,
    createdAt: toIso(token.createdAt),
    lastUsedAt: toIso(token.lastUsedAt),
    expiresAt: toIso(token.expiresAt),
    status: token.isExpired() ? ('expired' as const) : ('active' as const),
  }
}

/**
 * Every ops user's tokens, newest first — ops is one shared admin, so anyone
 * signed in can see and revoke any of them.
 */
async function allTokens() {
  const users = await User.all()
  const tokens = await Promise.all(
    users.map(async (user) => {
      const owned = await User.accessTokens.all(user)
      return owned.map((token) => presentToken(token, user))
    })
  )

  return tokens.flat().sort((a, b) => b.id - a.id)
}

export default class ApiTokensController {
  async index({ inertia }: HttpContext) {
    return inertia.render('ops/tokens/index', {
      tokens: await allTokens(),
      secretName: GITHUB_SECRET_NAME,
      newToken: null,
    })
  }

  /**
   * Renders the list straight back rather than redirecting, so the plaintext
   * token is only ever in this one response — never in the session, and gone
   * on the next reload.
   */
  async store({ auth, request, inertia }: HttpContext) {
    const { name, expiresIn } = await request.validateUsing(createApiTokenValidator)

    const token = await User.accessTokens.create(auth.user!, [...API_ABILITIES], {
      name,
      expiresIn: expiresIn === 'never' ? undefined : `${expiresIn} days`,
    })

    return inertia.render('ops/tokens/index', {
      tokens: await allTokens(),
      secretName: GITHUB_SECRET_NAME,
      newToken: { id: Number(token.identifier), name, value: token.value!.release() },
    })
  }

  async destroy({ params, response, session }: HttpContext) {
    const row = await db.from('auth_access_tokens').where('id', params.id).first()
    const owner = row ? await User.find(row.tokenable_id) : null
    const revoked = owner ? await User.accessTokens.delete(owner, params.id) : 0

    if (revoked) {
      session.flash('notification', 'Token revoked. Anything still using it now gets a 401.')
    } else {
      session.flashErrors({ token: 'That token no longer exists' })
    }

    return response.redirect('/ops/tokens')
  }
}
