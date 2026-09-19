import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Release from '#models/release'
import User from '#models/user'

const inertiaHeaders = { 'X-Inertia': 'true', 'X-Inertia-Version': '1' }

async function admin() {
  return User.updateOrCreate(
    { email: 'ops@texturelab.io' },
    { password: 'secret-password', fullName: 'Ops' }
  )
}

test.group('Ops access', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('redirects anonymous visitors to the login page', async ({ client }) => {
    const dashboard = await client.get('/ops').redirects(0)
    const releases = await client.get('/ops/releases').redirects(0)

    dashboard.assertStatus(302)
    dashboard.assertHeader('location', '/ops/login')
    releases.assertStatus(302)
    releases.assertHeader('location', '/ops/login')
  })

  test('renders the login page', async ({ client, assert }) => {
    const response = await client.get('/ops/login').headers(inertiaHeaders)

    response.assertStatus(200)
    assert.equal(response.body().component, 'ops/login')
  })

  test('rejects bad credentials', async ({ client }) => {
    await admin()

    const response = await client
      .post('/ops/login')
      .form({ email: 'ops@texturelab.io', password: 'wrong' })
      .redirects(0)

    response.assertStatus(302)
  })

  test('signs in with the seeded credentials', async ({ client }) => {
    await admin()

    const response = await client
      .post('/ops/login')
      .form({ email: 'ops@texturelab.io', password: 'secret-password' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/ops')
  })

  test('shows the dashboard to a signed in admin', async ({ client, assert }) => {
    const user = await admin()
    await Release.create({ version: '2.0.0', channel: 'stable', isPublished: true })

    const response = await client.get('/ops').headers(inertiaHeaders).loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().component, 'ops/dashboard')
    assert.equal(response.body().props.stats.publishedReleases, 1)
    assert.equal(response.body().props.latest.version, '2.0.0')
  })
})

test.group('Ops releases CRUD', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates a release', async ({ client, assert }) => {
    const user = await admin()

    const response = await client.post('/ops/releases').loginAs(user).redirects(0).json({
      version: '1.0.0',
      title: 'First cut',
      channel: 'stable',
      notes: '## Added\n- Everything',
      windowsUrl: 'https://example.com/win.zip',
      macUrl: null,
      linuxUrl: null,
      itchUrl: 'https://njbrown.itch.io/texturelab',
      isPublished: true,
      releasedAt: '2026-01-15T00:00:00.000Z',
    })

    response.assertStatus(302)

    const release = await Release.findByOrFail('version', '1.0.0')
    assert.isTrue(release.isPublished)
    assert.equal(release.windowsUrl, 'https://example.com/win.zip')
    assert.equal(release.itchUrl, 'https://njbrown.itch.io/texturelab')
    assert.equal(release.releasedAt?.toISODate(), '2026-01-15')
  })

  test('rejects a duplicate version', async ({ client, assert }) => {
    const user = await admin()
    await Release.create({ version: '1.0.0', channel: 'stable', isPublished: false })

    const response = await client
      .post('/ops/releases')
      .loginAs(user)
      .redirects(0)
      .json({ version: '1.0.0', channel: 'stable', isPublished: false })

    response.assertStatus(302)
    assert.lengthOf(await Release.query().where('version', '1.0.0'), 1)
  })

  test('rejects an invalid download url', async ({ client, assert }) => {
    const user = await admin()

    const response = await client
      .post('/ops/releases')
      .loginAs(user)
      .redirects(0)
      .json({ version: '1.0.1', channel: 'stable', isPublished: false, windowsUrl: 'not-a-url' })

    response.assertStatus(302)
    assert.isNull(await Release.findBy('version', '1.0.1'))
  })

  test('updates a release', async ({ client, assert }) => {
    const user = await admin()
    const release = await Release.create({
      version: '1.0.0',
      channel: 'stable',
      isPublished: false,
    })

    const response = await client
      .put(`/ops/releases/${release.id}`)
      .loginAs(user)
      .redirects(0)
      .json({
        version: '1.0.1',
        title: 'Patched',
        channel: 'beta',
        notes: null,
        windowsUrl: null,
        macUrl: null,
        linuxUrl: null,
        isPublished: true,
        releasedAt: null,
      })

    response.assertStatus(302)

    await release.refresh()
    assert.equal(release.version, '1.0.1')
    assert.equal(release.channel, 'beta')
    assert.isTrue(release.isPublished)
  })

  test('deletes a release', async ({ client, assert }) => {
    const user = await admin()
    const release = await Release.create({ version: '9.9.9', channel: 'stable' })

    const response = await client.delete(`/ops/releases/${release.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    assert.isNull(await Release.find(release.id))
  })

  test('does not let anonymous visitors write', async ({ client, assert }) => {
    const response = await client
      .post('/ops/releases')
      .redirects(0)
      .json({ version: '6.6.6', channel: 'stable', isPublished: true })

    assert.notEqual(response.status(), 200)
    assert.isNull(await Release.findBy('version', '6.6.6'))
  })
})
