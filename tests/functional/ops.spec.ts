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

function zip(identifier: string) {
  return `https://example.com/texturelab-win-v${identifier}.zip`
}

/**
 * A draft that passes every publish check unless told otherwise.
 */
async function draft(overrides: Partial<Release> = {}) {
  const fields = {
    version: '1.0.0',
    channel: 'beta' as const,
    build: 100,
    commit: 'aaaaaaa',
    isPublished: false,
    ...overrides,
  }

  return Release.create({
    windowsUrl: zip(`${fields.version}-${fields.channel}-${fields.commit}`),
    ...fields,
  })
}

async function releaseCount(version?: string) {
  const releases = await Release.query().if(version, (query) => query.where('version', version!))
  return releases.length
}

/**
 * What the create form posts for a pasted identifier.
 */
function form(overrides: Record<string, unknown> = {}) {
  return {
    identifier: '0.4.0-beta-039faa9',
    version: '0.4.0',
    channel: 'beta',
    commit: '039faa9',
    build: 963,
    title: null,
    notes: null,
    windowsUrl: zip('0.4.0-beta-039faa9'),
    macUrl: null,
    linuxUrl: null,
    itchUrl: null,
    releasedAt: null,
    ...overrides,
  }
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

  test('shows what each channel serves on the dashboard', async ({ client, assert }) => {
    const user = await admin()
    await draft({ version: '2.0.0', channel: 'stable', commit: 'bbbbbbb', isPublished: true })
    await draft({ version: '1.9.0', channel: 'beta', build: 900, isPublished: true })

    const response = await client.get('/ops').headers(inertiaHeaders).loginAs(user)
    const props = response.body().props

    response.assertStatus(200)
    assert.equal(response.body().component, 'ops/dashboard')
    assert.equal(props.stats.publishedReleases, 2)
    assert.equal(props.live.stable.identifier, '2.0.0-stable-bbbbbbb')
    // The stable release is newer than the only beta, so beta builds get it too.
    assert.equal(props.live.beta.identifier, '2.0.0-stable-bbbbbbb')
  })

  test('splits the releases list by what each channel serves', async ({ client, assert }) => {
    const user = await admin()
    await draft({ isPublished: true })

    const response = await client.get('/ops/releases').headers(inertiaHeaders).loginAs(user)
    const props = response.body().props

    response.assertStatus(200)
    assert.isNull(props.live.stable)
    assert.equal(props.live.beta.identifier, '1.0.0-beta-aaaaaaa')
  })
})

test.group('Ops what would this build see', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  group.each.setup(async () => {
    await draft({ version: '1.0.0', channel: 'stable', commit: 'aaaaaaa', isPublished: true })
    await draft({
      version: '1.1.0',
      channel: 'beta',
      build: 150,
      commit: 'bbbbbbb',
      isPublished: true,
    })
  })

  test('offers an older build the newest release on its channel', async ({ client, assert }) => {
    const user = await admin()

    const response = await client
      .get('/ops/releases/offer')
      .qs({ identifier: '1.1.0-beta-1234567', build: 140 })
      .header('Accept', 'application/json')
      .loginAs(user)

    response.assertStatus(200)
    assert.isFalse(response.body().data.upToDate)
    assert.equal(response.body().data.offered.identifier, '1.1.0-beta-bbbbbbb')
    assert.equal(
      response.body().data.offered.pageUrl,
      'https://texturelab.io/download/1.1.0-beta-bbbbbbb'
    )
  })

  test('reports the live build itself as up to date', async ({ client, assert }) => {
    const user = await admin()

    const response = await client
      .get('/ops/releases/offer')
      .qs({ identifier: '1.1.0-beta-bbbbbbb', build: 150 })
      .header('Accept', 'application/json')
      .loginAs(user)

    assert.isTrue(response.body().data.upToDate)
    assert.isNull(response.body().data.offered)
    assert.equal(response.body().data.live.identifier, '1.1.0-beta-bbbbbbb')
  })

  test('never offers a stable build a beta', async ({ client, assert }) => {
    const user = await admin()

    const response = await client
      .get('/ops/releases/offer')
      .qs({ identifier: '1.0.0-stable-aaaaaaa', build: 100 })
      .header('Accept', 'application/json')
      .loginAs(user)

    assert.isTrue(response.body().data.upToDate)
  })

  test('rejects an identifier that does not parse', async ({ client }) => {
    const user = await admin()

    const response = await client
      .get('/ops/releases/offer')
      .qs({ identifier: '1.0.0-beta', build: 100 })
      .header('Accept', 'application/json')
      .loginAs(user)

    response.assertStatus(422)
  })

  test('is not open to anonymous visitors', async ({ client, assert }) => {
    const response = await client
      .get('/ops/releases/offer')
      .qs({ identifier: '1.0.0-beta-aaaaaaa', build: 1 })
      .header('Accept', 'application/json')
      .redirects(0)

    assert.notEqual(response.status(), 200)
  })
})

test.group('Ops releases CRUD', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates a draft from a pasted identifier', async ({ client, assert }) => {
    const user = await admin()

    const response = await client
      .post('/ops/releases')
      .loginAs(user)
      .redirects(0)
      .json(
        form({
          title: 'First cut',
          notes: '## Added\n- Everything',
          itchUrl: 'https://njbrown.itch.io/texturelab',
          releasedAt: '2026-01-15T00:00:00.000Z',
          // Not a form field any more, and ignored if sent: creating never publishes.
          isPublished: true,
        })
      )

    response.assertStatus(302)
    response.assertHeader('location', '/ops/releases')

    const release = await Release.findByOrFail('identifier', '0.4.0-beta-039faa9')
    assert.isFalse(release.isPublished)
    assert.equal(release.version, '0.4.0')
    assert.equal(release.channel, 'beta')
    assert.equal(release.build, 963)
    assert.equal(release.commit, '039faa9')
    assert.deepEqual([release.versionMajor, release.versionMinor, release.versionPatch], [0, 4, 0])
    assert.equal(release.itchUrl, 'https://njbrown.itch.io/texturelab')
    assert.equal(release.releasedAt?.toISODate(), '2026-01-15')
  })

  test('creates a release from the fields alone', async ({ client, assert }) => {
    const user = await admin()

    const response = await client
      .post('/ops/releases')
      .loginAs(user)
      .redirects(0)
      .json(form({ identifier: null, channel: 'stable', windowsUrl: null }))

    response.assertStatus(302)
    assert.isNotNull(await Release.findBy('identifier', '0.4.0-stable-039faa9'))
  })

  test('rejects a channel that disagrees with the identifier', async ({ client, assert }) => {
    const user = await admin()

    const response = await client
      .post('/ops/releases')
      .loginAs(user)
      .redirects(0)
      .json(form({ channel: 'stable' }))

    response.assertStatus(302)
    assert.equal(await releaseCount(), 0)
  })

  test('rejects a version or commit that disagrees with the identifier', async ({
    client,
    assert,
  }) => {
    const user = await admin()

    await client
      .post('/ops/releases')
      .loginAs(user)
      .redirects(0)
      .json(form({ version: '0.4.1' }))
    await client
      .post('/ops/releases')
      .loginAs(user)
      .redirects(0)
      .json(form({ commit: '1234567' }))

    assert.equal(await releaseCount(), 0)
  })

  test('has no default channel', async ({ client, assert }) => {
    const user = await admin()

    const response = await client
      .post('/ops/releases')
      .loginAs(user)
      .redirects(0)
      .json(form({ identifier: null, channel: undefined }))

    response.assertStatus(302)
    assert.equal(await releaseCount(), 0)
  })

  test('rejects a version with a suffix, a missing build or a bad commit', async ({
    client,
    assert,
  }) => {
    const user = await admin()

    for (const overrides of [
      { identifier: null, version: '0.4.0-beta' },
      { build: null },
      { build: 0 },
      { identifier: null, commit: 'not-hex' },
    ]) {
      await client.post('/ops/releases').loginAs(user).redirects(0).json(form(overrides))
    }

    assert.equal(await releaseCount(), 0)
  })

  test('rejects a duplicate identifier', async ({ client, assert }) => {
    const user = await admin()
    await draft({ version: '0.4.0', channel: 'beta', commit: '039faa9', build: 963 })

    const response = await client.post('/ops/releases').loginAs(user).redirects(0).json(form())

    response.assertStatus(302)
    assert.equal(await releaseCount(), 1)
  })

  test('lets several betas share a version', async ({ client, assert }) => {
    const user = await admin()
    await draft({ version: '0.4.0', channel: 'beta', commit: '024cbf1', build: 948 })

    await client.post('/ops/releases').loginAs(user).redirects(0).json(form())

    assert.equal(await releaseCount('0.4.0'), 2)
  })

  test('rejects an invalid download url', async ({ client, assert }) => {
    const user = await admin()

    const response = await client
      .post('/ops/releases')
      .loginAs(user)
      .redirects(0)
      .json(form({ windowsUrl: 'not-a-url' }))

    response.assertStatus(302)
    assert.equal(await releaseCount(), 0)
  })

  test('updates a draft', async ({ client, assert }) => {
    const user = await admin()
    const release = await draft()

    const response = await client
      .put(`/ops/releases/${release.id}`)
      .loginAs(user)
      .redirects(0)
      .json(
        form({
          identifier: '1.0.1-stable-bbbbbbb',
          version: '1.0.1',
          channel: 'stable',
          commit: 'bbbbbbb',
          build: 101,
          title: 'Patched',
        })
      )

    response.assertStatus(302)

    await release.refresh()
    assert.equal(release.identifier, '1.0.1-stable-bbbbbbb')
    assert.equal(release.channel, 'stable')
    assert.equal(release.title, 'Patched')
    assert.isFalse(release.isPublished)
  })

  test('refuses to turn a published release into another build', async ({ client, assert }) => {
    const user = await admin()
    const release = await draft({ isPublished: true })

    await client
      .put(`/ops/releases/${release.id}`)
      .loginAs(user)
      .redirects(0)
      .json(form({ identifier: null, version: '1.0.0', channel: 'stable', commit: 'aaaaaaa' }))

    await release.refresh()
    assert.equal(release.channel, 'beta')
  })

  test('still lets the notes of a published release be fixed', async ({ client, assert }) => {
    const user = await admin()
    const release = await draft({ isPublished: true })

    await client
      .put(`/ops/releases/${release.id}`)
      .loginAs(user)
      .redirects(0)
      .json(
        form({
          identifier: release.identifier,
          version: release.version,
          channel: release.channel,
          commit: release.commit,
          build: release.build,
          windowsUrl: release.windowsUrl,
          notes: 'Fixed typo',
        })
      )

    await release.refresh()
    assert.equal(release.notes, 'Fixed typo')
    assert.isTrue(release.isPublished)
  })

  test('deletes a release', async ({ client, assert }) => {
    const user = await admin()
    const release = await draft()

    const response = await client.delete(`/ops/releases/${release.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    assert.isNull(await Release.find(release.id))
  })

  test('does not let anonymous visitors write', async ({ client, assert }) => {
    const response = await client.post('/ops/releases').redirects(0).json(form())

    assert.notEqual(response.status(), 200)
    assert.equal(await releaseCount(), 0)
  })
})

test.group('Ops publishing', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('publishes a beta and stamps its release date', async ({ client, assert }) => {
    const user = await admin()
    const release = await draft()

    const response = await client
      .post(`/ops/releases/${release.id}/publish`)
      .loginAs(user)
      .redirects(0)
      .json({})

    response.assertStatus(302)

    await release.refresh()
    assert.isTrue(release.isPublished)
    assert.isNotNull(release.releasedAt)
  })

  test('publishes to stable only once "stable" is typed', async ({ client, assert }) => {
    const user = await admin()
    const release = await draft({ channel: 'stable' })

    await client
      .post(`/ops/releases/${release.id}/publish`)
      .loginAs(user)
      .redirects(0)
      .json({ confirm: 'yes' })

    await release.refresh()
    assert.isFalse(release.isPublished)

    await client
      .post(`/ops/releases/${release.id}/publish`)
      .loginAs(user)
      .redirects(0)
      .json({ confirm: 'stable' })

    await release.refresh()
    assert.isTrue(release.isPublished)
  })

  test('refuses a release without downloads', async ({ client, assert }) => {
    const user = await admin()
    const release = await draft({ windowsUrl: null })

    await client.post(`/ops/releases/${release.id}/publish`).loginAs(user).redirects(0).json({})

    await release.refresh()
    assert.isFalse(release.isPublished)
  })

  test('accepts an itch.io page as the only download', async ({ client, assert }) => {
    const user = await admin()
    const release = await draft({ windowsUrl: null, itchUrl: 'https://njbrown.itch.io/texturelab' })

    await client.post(`/ops/releases/${release.id}/publish`).loginAs(user).redirects(0).json({})

    await release.refresh()
    assert.isTrue(release.isPublished)
  })

  test('refuses a download that is not named after the build', async ({ client, assert }) => {
    const user = await admin()
    // A beta zip pasted into a stable release.
    const release = await draft({ channel: 'stable', windowsUrl: zip('1.0.0-beta-aaaaaaa') })

    await client
      .post(`/ops/releases/${release.id}/publish`)
      .loginAs(user)
      .redirects(0)
      .json({ confirm: 'stable' })

    await release.refresh()
    assert.isFalse(release.isPublished)
  })

  test('refuses a build that is not newer than what is live', async ({ client, assert }) => {
    const user = await admin()
    await draft({ build: 200, commit: 'bbbbbbb', isPublished: true })
    const older = await draft({ build: 150, commit: 'ccccccc' })
    const same = await draft({ build: 200, commit: 'ddddddd' })

    for (const release of [older, same]) {
      await client.post(`/ops/releases/${release.id}/publish`).loginAs(user).redirects(0).json({})
    }

    await older.refresh()
    await same.refresh()
    assert.isFalse(older.isPublished)
    assert.isFalse(same.isPublished)
  })

  test('compares a beta with a live stable that beta builds are offered', async ({
    client,
    assert,
  }) => {
    const user = await admin()
    await draft({ version: '2.0.0', channel: 'stable', commit: 'bbbbbbb', isPublished: true })
    const beta = await draft({ version: '1.9.0', build: 500 })

    await client.post(`/ops/releases/${beta.id}/publish`).loginAs(user).redirects(0).json({})

    await beta.refresh()
    assert.isFalse(beta.isPublished)
  })

  test('republishes an older build when explicitly allowed', async ({ client, assert }) => {
    const user = await admin()
    await draft({ build: 200, commit: 'bbbbbbb', isPublished: true })
    const older = await draft({ build: 150, commit: 'ccccccc' })

    await client
      .post(`/ops/releases/${older.id}/publish`)
      .loginAs(user)
      .redirects(0)
      .json({ allowOlder: true })

    await older.refresh()
    assert.isTrue(older.isPublished)
  })

  test('unpublishes a release', async ({ client, assert }) => {
    const user = await admin()
    const release = await draft({ isPublished: true })

    const response = await client
      .post(`/ops/releases/${release.id}/unpublish`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    await release.refresh()
    assert.isFalse(release.isPublished)
  })

  test('does not let anonymous visitors publish or unpublish', async ({ client, assert }) => {
    const pending = await draft()
    const live = await draft({ build: 50, commit: 'bbbbbbb', isPublished: true })

    const publish = await client.post(`/ops/releases/${pending.id}/publish`).redirects(0).json({})
    const unpublish = await client.post(`/ops/releases/${live.id}/unpublish`).redirects(0)

    assert.notEqual(publish.status(), 200)
    assert.notEqual(unpublish.status(), 200)

    await pending.refresh()
    await live.refresh()
    assert.isFalse(pending.isPublished)
    assert.isTrue(live.isPublished)
  })
})
