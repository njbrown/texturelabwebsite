import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'

const inertiaHeaders = { 'X-Inertia': 'true', 'X-Inertia-Version': '1' }

async function admin() {
  return User.updateOrCreate(
    { email: 'ops@texturelab.io' },
    { password: 'secret-password', fullName: 'Ops' }
  )
}

test.group('Ops API tokens', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => limiter.clear(['memory']))

  test('keeps anonymous visitors out', async ({ client, assert }) => {
    const index = await client.get('/ops/tokens').redirects(0)
    const store = await client
      .post('/ops/tokens')
      .form({ name: 'CI', expiresIn: 'never' })
      .redirects(0)
    const destroy = await client.delete('/ops/tokens/1').redirects(0)

    for (const response of [index, store, destroy]) {
      response.assertStatus(302)
      response.assertHeader('location', '/ops/login')
    }

    assert.lengthOf(await db.from('auth_access_tokens'), 0)
  })

  test('shows a new token once, then never again', async ({ client, assert }) => {
    const user = await admin()

    const created = await client
      .post('/ops/tokens')
      .headers(inertiaHeaders)
      .json({ name: 'GitHub Actions', expiresIn: '90' })
      .loginAs(user)

    created.assertStatus(200)
    assert.equal(created.body().component, 'ops/tokens/index')

    const { newToken, secretName, tokens } = created.body().props
    assert.match(newToken.value, /^tlb_/)
    assert.equal(newToken.name, 'GitHub Actions')
    assert.equal(secretName, 'TEXTURELAB_SITE_TOKEN')
    assert.lengthOf(tokens, 1)
    assert.deepEqual(tokens[0].abilities, ['releases:draft'])
    assert.equal(tokens[0].status, 'active')
    assert.isNull(tokens[0].lastUsedAt)

    const days = (Date.parse(tokens[0].expiresAt) - Date.now()) / 86_400_000
    assert.approximately(days, 90, 0.01)

    // The listing that follows has the token, but not its value or hash.
    const listed = await client.get('/ops/tokens').headers(inertiaHeaders).loginAs(user)
    const text = JSON.stringify(listed.body())

    listed.assertStatus(200)
    assert.isNull(listed.body().props.newToken)
    assert.lengthOf(listed.body().props.tokens, 1)
    assert.notInclude(text, newToken.value)
    assert.notInclude(text, newToken.value.split('.').pop())
    assert.notProperty(listed.body().props.tokens[0], 'hash')
  })

  test('creates tokens that never expire', async ({ client, assert }) => {
    const user = await admin()

    const created = await client
      .post('/ops/tokens')
      .headers(inertiaHeaders)
      .json({ name: 'Forever', expiresIn: 'never' })
      .loginAs(user)

    assert.isNull(created.body().props.tokens[0].expiresAt)
  })

  test('validates the form', async ({ client, assert }) => {
    const user = await admin()

    const response = await client
      .post('/ops/tokens')
      .form({ name: '', expiresIn: '7' })
      .redirects(0)
      .loginAs(user)

    response.assertStatus(302)
    assert.lengthOf(await User.accessTokens.all(user), 0)
  })

  test('lists when a token was last used', async ({ client, assert }) => {
    const user = await admin()
    const token = await User.accessTokens.create(user, ['releases:draft'], { name: 'CI' })

    await client.post('/api/ops/releases/drafts').bearerToken(token.value!.release()).json({})

    const listed = await client.get('/ops/tokens').headers(inertiaHeaders).loginAs(user)

    assert.isNotNull(listed.body().props.tokens[0].lastUsedAt)
  })

  test('revokes a token so it stops working', async ({ client, assert }) => {
    const user = await admin()
    const token = await User.accessTokens.create(user, ['releases:draft'], { name: 'CI' })
    const value = token.value!.release()

    const revoked = await client
      .delete(`/ops/tokens/${token.identifier}`)
      .redirects(0)
      .loginAs(user)

    revoked.assertStatus(302)
    revoked.assertHeader('location', '/ops/tokens')
    assert.lengthOf(await User.accessTokens.all(user), 0)

    const response = await client.post('/api/ops/releases/drafts').bearerToken(value).json({})
    response.assertStatus(401)
  })

  test('lets one ops user revoke another’s token', async ({ client, assert }) => {
    const user = await admin()
    const other = await User.create({ email: 'other@texturelab.io', password: 'secret-password' })
    const token = await User.accessTokens.create(other, ['releases:draft'], { name: 'Theirs' })

    const listed = await client.get('/ops/tokens').headers(inertiaHeaders).loginAs(user)
    assert.equal(listed.body().props.tokens[0].createdBy, 'other@texturelab.io')

    await client.delete(`/ops/tokens/${token.identifier}`).redirects(0).loginAs(user)

    assert.lengthOf(await User.accessTokens.all(other), 0)
  })
})
