import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import encryption from '@adonisjs/core/services/encryption'
import limiter from '@adonisjs/limiter/services/main'
import db from '@adonisjs/lucid/services/db'
import { csrfFactory } from '@adonisjs/shield/guards'
import type { HttpContext } from '@adonisjs/core/http'
import Release from '#models/release'
import User from '#models/user'
import shieldConfig from '#config/shield'

const ENDPOINT = '/api/ops/releases/drafts'
const IDENTIFIER = '0.4.0-beta-9d46cf3'
const BASE = 'https://github.com/njbrown/texturelab/releases/download/v0.4.0-beta'

async function admin() {
  return User.updateOrCreate(
    { email: 'ops@texturelab.io' },
    { password: 'secret-password', fullName: 'Ops' }
  )
}

/**
 * A token as the dashboard makes one, unless told otherwise.
 */
async function token(
  abilities: string[] = ['releases:draft'],
  options: { expiresIn?: string | number } = {}
) {
  const created = await User.accessTokens.create(await admin(), abilities, {
    name: 'CI',
    ...options,
  })

  return { id: Number(created.identifier), value: created.value!.release() }
}

/**
 * Exactly what the release workflow posts.
 */
function body(overrides: Record<string, unknown> = {}) {
  return {
    identifier: IDENTIFIER,
    build: 1018,
    title: 'TextureLab v0.4.0-beta',
    notes: '## Added\n- Things',
    releasedAt: '2026-10-01T12:00:00Z',
    downloads: {
      windows: `${BASE}/texturelab-win-v${IDENTIFIER}-x64.zip`,
      mac: `${BASE}/texturelab-mac-v${IDENTIFIER}-universal.dmg`,
      linux: `${BASE}/texturelab-linux-v${IDENTIFIER}-x86_64.AppImage`,
      itch: null,
    },
    ...overrides,
  }
}

test.group('CI release drafts API', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => limiter.clear(['memory']))

  test('creates an unpublished draft from the identifier', async ({ client, assert }) => {
    const { value } = await token()

    const response = await client
      .post(ENDPOINT)
      .bearerToken(value)
      .header('Accept', 'application/json')
      .json(body())

    response.assertStatus(201)

    const release = await Release.findByOrFail('identifier', IDENTIFIER)

    assert.deepEqual(response.body(), {
      data: {
        id: release.id,
        identifier: IDENTIFIER,
        created: true,
        editUrl: `https://texturelab.io/ops/releases/${release.id}/edit`,
      },
    })
    assert.isFalse(release.isPublished)
    assert.equal(release.source, 'ci')
    assert.equal(release.version, '0.4.0')
    assert.equal(release.channel, 'beta')
    assert.equal(release.commit, '9d46cf3')
    assert.equal(release.build, 1018)
    assert.equal(release.versionMinor, 4)
    assert.equal(release.title, 'TextureLab v0.4.0-beta')
    assert.equal(release.notes, '## Added\n- Things')
    assert.equal(release.releasedAt?.toUTC().toISO(), '2026-10-01T12:00:00.000Z')
    assert.equal(release.macUrl, `${BASE}/texturelab-mac-v${IDENTIFIER}-universal.dmg`)
    assert.isNull(release.itchUrl)
  })

  test('updates the draft in place when the workflow re-runs', async ({ client, assert }) => {
    const { value } = await token()

    const first = await client.post(ENDPOINT).bearerToken(value).json(body())

    // Notes fixed by hand in /ops survive a re-run that doesn't send any.
    await Release.query().where('identifier', IDENTIFIER).update({ notes: 'Edited in ops' })

    const second = await client
      .post(ENDPOINT)
      .bearerToken(value)
      .json({ ...body({ build: 1019, title: 'Rebuilt' }), notes: undefined })

    second.assertStatus(200)
    assert.equal(second.body().data.id, first.body().data.id)
    assert.isFalse(second.body().data.created)

    const releases = await Release.all()
    assert.lengthOf(releases, 1)
    assert.equal(releases[0].build, 1019)
    assert.equal(releases[0].title, 'Rebuilt')
    assert.equal(releases[0].notes, 'Edited in ops')
    assert.isFalse(releases[0].isPublished)
  })

  test('never touches a published release', async ({ client, assert }) => {
    const { value } = await token()
    await Release.create({
      version: '0.4.0',
      channel: 'beta',
      build: 1000,
      commit: '9d46cf3',
      title: 'Live',
      isPublished: true,
    })

    const response = await client.post(ENDPOINT).bearerToken(value).json(body())

    response.assertStatus(409)
    assert.match(response.body().error, /already published/)

    const release = await Release.findByOrFail('identifier', IDENTIFIER)
    assert.equal(release.build, 1000)
    assert.equal(release.title, 'Live')
    assert.isTrue(release.isPublished)
  })

  test('ignores any attempt to publish', async ({ client, assert }) => {
    const { value } = await token()

    const response = await client
      .post(ENDPOINT)
      .bearerToken(value)
      .json(body({ isPublished: true }))

    const release = await Release.findByOrFail('identifier', IDENTIFIER)

    response.assertStatus(201)
    assert.isFalse(release.isPublished)
  })

  test('rejects a missing token', async ({ client, assert }) => {
    const response = await client.post(ENDPOINT).json(body())

    response.assertStatus(401)
    assert.deepEqual(response.body(), { error: 'Missing or invalid API token' })
    assert.lengthOf(await Release.all(), 0)
  })

  test('rejects an invalid token', async ({ client }) => {
    const { value } = await token()

    const wrongSecret = await client
      .post(ENDPOINT)
      .bearerToken(`${value.slice(0, -4)}aaaa`)
      .json(body())
    const garbage = await client.post(ENDPOINT).bearerToken('not-a-token').json(body())

    wrongSecret.assertStatus(401)
    garbage.assertStatus(401)
  })

  test('rejects a revoked token', async ({ client }) => {
    const { id, value } = await token()
    await User.accessTokens.delete(await admin(), id)

    const response = await client.post(ENDPOINT).bearerToken(value).json(body())

    response.assertStatus(401)
  })

  test('rejects an expired token', async ({ client }) => {
    const { id, value } = await token(['releases:draft'], { expiresIn: '30 days' })
    await db
      .from('auth_access_tokens')
      .where('id', id)
      .update({ expires_at: new Date(Date.now() - 1000) })

    const response = await client.post(ENDPOINT).bearerToken(value).json(body())

    response.assertStatus(401)
  })

  test('rejects a token without the ability', async ({ client, assert }) => {
    const { value } = await token(['releases:read'])

    const response = await client.post(ENDPOINT).bearerToken(value).json(body())

    response.assertStatus(403)
    assert.include(response.body().error, 'releases:draft')
  })

  test('records when a token was last used', async ({ client, assert }) => {
    const { id, value } = await token()

    await client.post(ENDPOINT).bearerToken(value).json(body())

    const used = await User.accessTokens.find(await admin(), id)
    assert.isNotNull(used!.lastUsedAt)
  })

  test('rejects an identifier that does not parse', async ({ client, assert }) => {
    const { value } = await token()

    const response = await client
      .post(ENDPOINT)
      .bearerToken(value)
      .json(body({ identifier: '0.4.0-nightly-9d46cf3' }))

    response.assertStatus(422)
    assert.equal(response.body().errors[0].field, 'identifier')
  })

  test('rejects downloads that are not this build', async ({ client, assert }) => {
    const { value } = await token()

    const response = await client
      .post(ENDPOINT)
      .bearerToken(value)
      .json(
        body({
          downloads: {
            windows: `${BASE}/texturelab-win-v0.4.0-stable-9d46cf3-x64.zip`,
            mac: `${BASE}/texturelab-mac-v${IDENTIFIER}-universal.dmg`,
          },
        })
      )

    response.assertStatus(422)
    assert.deepEqual(
      response.body().errors.map((error: { field: string }) => error.field),
      ['downloads.windows']
    )
    assert.lengthOf(await Release.all(), 0)
  })

  test('rejects a draft with no downloads at all', async ({ client, assert }) => {
    const { value } = await token()

    const response = await client
      .post(ENDPOINT)
      .bearerToken(value)
      .json(body({ downloads: {} }))

    response.assertStatus(422)
    assert.equal(response.body().errors[0].field, 'downloads')
  })

  test('rejects a release date that is not ISO-8601', async ({ client, assert }) => {
    const { value } = await token()

    const response = await client
      .post(ENDPOINT)
      .bearerToken(value)
      .json(body({ releasedAt: 'next tuesday' }))

    response.assertStatus(422)
    assert.equal(response.body().errors[0].field, 'releasedAt')
  })

  test('answers bad input with json even without an Accept header', async ({ client }) => {
    const { value } = await token()

    const response = await client.post(ENDPOINT).bearerToken(value).json({ build: 'x' })

    response.assertStatus(422)
    response.assertHeader('content-type', 'application/json; charset=utf-8')
  })

  test('limits each token to 30 requests an hour', async ({ client, assert }) => {
    const { value } = await token()

    for (let i = 0; i < 30; i++) {
      const response = await client.post(ENDPOINT).bearerToken(value).json(body())
      assert.oneOf(response.status(), [200, 201])
    }

    const limited = await client.post(ENDPOINT).bearerToken(value).json(body())

    limited.assertStatus(429)
    assert.isAbove(Number(limited.header('retry-after')), 0)
    assert.deepEqual(limited.body(), { error: 'Too many requests, try again later' })

    // Another token has its own allowance.
    const other = await token()
    const fresh = await client.post(ENDPOINT).bearerToken(other.value).json(body())
    fresh.assertStatus(200)
  })

  test('locks an IP out after 10 failed attempts, even with a good token', async ({
    client,
    assert,
  }) => {
    const { value } = await token()

    for (let i = 0; i < 10; i++) {
      const response = await client.post(ENDPOINT).bearerToken(`tlb_guess${i}`).json(body())
      response.assertStatus(401)
    }

    const limited = await client.post(ENDPOINT).bearerToken(value).json(body())

    limited.assertStatus(429)
    assert.isAbove(Number(limited.header('retry-after')), 0)
    assert.lengthOf(await Release.all(), 0)
  })

  test('needs no CSRF token or session', async ({ client }) => {
    const { value } = await token()

    const response = await client.post(ENDPOINT).bearerToken(value).json(body())

    response.assertStatus(201)
  })

  /**
   * CSRF is switched off in tests, so the shield config itself is checked: with
   * CSRF on, this route goes through without a token and the ops form doesn't.
   */
  test('is exempt from CSRF while the ops routes are not', async ({ assert }) => {
    const guard = csrfFactory({ ...shieldConfig.csrf, enabled: true }, encryption)

    const ctx = (pattern: string) =>
      ({
        route: { pattern },
        request: { method: () => 'POST', input: () => null, header: () => null },
        response: { encryptedCookie: () => {} },
        session: { get: () => 'secret', put: () => {} },
      }) as unknown as HttpContext

    await guard(ctx(ENDPOINT))
    await assert.rejects(async () => guard(ctx('/ops/releases')))
  })
})
