import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Release from '#models/release'

test.group('Public releases API', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  /**
   * Release dates deliberately disagree with the build order — 1.0.0 went out
   * after 1.1.0, and the newest beta has no date at all — so a feed that sorts
   * by date gets every one of these tests wrong.
   */
  group.each.setup(async () => {
    await Release.createMany([
      {
        version: '1.0.0',
        channel: 'stable',
        build: 100,
        commit: 'aaaaaaa',
        isPublished: true,
        notes: '## Added\n- Nodes',
        windowsUrl: 'https://example.com/texturelab-win-v1.0.0-stable-aaaaaaa.zip',
        releasedAt: DateTime.fromISO('2026-05-01T00:00:00.000Z'),
      },
      {
        version: '1.1.0',
        channel: 'stable',
        build: 200,
        commit: 'bbbbbbb',
        title: 'Faster',
        isPublished: true,
        releasedAt: DateTime.fromISO('2026-02-01T00:00:00.000Z'),
      },
      {
        version: '1.2.0',
        channel: 'beta',
        build: 310,
        commit: 'ddddddd',
        isPublished: true,
        releasedAt: null,
      },
      {
        version: '1.2.0',
        channel: 'beta',
        build: 300,
        commit: 'ccccccc',
        isPublished: true,
        releasedAt: DateTime.fromISO('2026-03-01T00:00:00.000Z'),
      },
      {
        version: '2.0.0',
        channel: 'stable',
        build: 400,
        commit: 'eeeeeee',
        isPublished: false,
        releasedAt: DateTime.fromISO('2026-04-01T00:00:00.000Z'),
      },
    ])
  })

  test('lists published releases newest build first', async ({ client, assert }) => {
    const response = await client.get('/api/releases')

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((release: { identifier: string }) => release.identifier),
      ['1.2.0-beta-ddddddd', '1.2.0-beta-ccccccc', '1.1.0-stable-bbbbbbb', '1.0.0-stable-aaaaaaa']
    )
  })

  test('never exposes unpublished releases', async ({ client, assert }) => {
    const response = await client.get('/api/releases')

    assert.notInclude(
      response.body().data.map((release: { version: string }) => release.version),
      '2.0.0'
    )
  })

  test('filters by channel', async ({ client, assert }) => {
    const response = await client.get('/api/releases').qs({ channel: 'beta' })

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((release: { build: number }) => release.build),
      [310, 300]
    )
  })

  test('honours the limit', async ({ client, assert }) => {
    const response = await client.get('/api/releases').qs({ limit: 1 })

    assert.lengthOf(response.body().data, 1)
  })

  test('rejects an unknown channel', async ({ client }) => {
    const response = await client.get('/api/releases').qs({ channel: 'nightly' })

    response.assertStatus(422)
  })

  test('renders release notes as html and exposes downloads', async ({ client, assert }) => {
    const response = await client.get('/api/releases').qs({ limit: 100 })
    const release = response
      .body()
      .data.find((entry: { version: string }) => entry.version === '1.0.0')

    assert.include(release.notesHtml, '<h2 id="added"')
    assert.equal(release.notes, '## Added\n- Nodes')
    assert.equal(
      release.downloads.windows,
      'https://example.com/texturelab-win-v1.0.0-stable-aaaaaaa.zip'
    )
    assert.isNull(release.downloads.mac)
  })

  test('requires a channel for the latest release', async ({ client, assert }) => {
    const response = await client.get('/api/releases/latest')

    response.assertStatus(422)
    assert.equal(response.body().errors[0].field, 'channel')
  })

  test('rejects an unknown channel for the latest release', async ({ client }) => {
    const response = await client.get('/api/releases/latest').qs({ channel: 'nightly' })

    response.assertStatus(422)
  })

  test('serves the latest stable by version and build, not by date', async ({ client, assert }) => {
    const response = await client.get('/api/releases/latest').qs({ channel: 'stable' })

    response.assertStatus(200)
    assert.equal(response.body().data.identifier, '1.1.0-stable-bbbbbbb')
  })

  test('never offers a beta to stable builds', async ({ client, assert }) => {
    await Release.create({
      version: '9.0.0',
      channel: 'beta',
      build: 999,
      commit: 'fffffff',
      isPublished: true,
    })

    const response = await client.get('/api/releases/latest').qs({ channel: 'stable' })

    assert.equal(response.body().data.channel, 'stable')
    assert.equal(response.body().data.version, '1.1.0')
  })

  test('serves beta builds the newest beta when it is newer than stable', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/api/releases/latest').qs({ channel: 'beta' })

    response.assertStatus(200)
    assert.equal(response.body().data.identifier, '1.2.0-beta-ddddddd')
    assert.equal(response.body().data.build, 310)
  })

  test('serves beta builds a stable release that overtook every beta', async ({
    client,
    assert,
  }) => {
    await Release.query().where('version', '2.0.0').update({ is_published: true })

    const response = await client.get('/api/releases/latest').qs({ channel: 'beta' })

    response.assertStatus(200)
    assert.equal(response.body().data.identifier, '2.0.0-stable-eeeeeee')
    assert.equal(response.body().data.channel, 'stable')
  })

  test('orders a stable and a beta of the same version by build', async ({ client, assert }) => {
    await Release.create({
      version: '1.2.0',
      channel: 'stable',
      build: 305,
      commit: '1234567',
      isPublished: true,
    })

    const response = await client.get('/api/releases/latest').qs({ channel: 'beta' })

    // Beta build 310 is newer than the 1.2.0 stable cut at build 305.
    assert.equal(response.body().data.identifier, '1.2.0-beta-ddddddd')
  })

  test('serves the flat release shape with an absolute page url', async ({ client, assert }) => {
    const response = await client.get('/api/releases/latest').qs({ channel: 'stable' })

    response.assertHeader('cache-control', 'public, max-age=300')
    assert.deepEqual(response.body(), {
      data: {
        identifier: '1.1.0-stable-bbbbbbb',
        version: '1.1.0',
        channel: 'stable',
        build: 200,
        commit: 'bbbbbbb',
        title: 'Faster',
        notes: null,
        notesHtml: '',
        releasedAt: '2026-02-01T00:00:00.000+00:00',
        downloads: { windows: null, mac: null, linux: null, itch: null },
        pageUrl: 'https://texturelab.io/download/1.1.0-stable-bbbbbbb',
      },
    })
  })

  test('404s when a channel has nothing published', async ({ client, assert }) => {
    await Release.query().where('channel', 'stable').update({ is_published: false })

    const stable = await client.get('/api/releases/latest').qs({ channel: 'stable' })

    stable.assertStatus(404)
    assert.deepEqual(stable.body(), { error: 'No published release found' })

    await Release.query().update({ is_published: false })

    const beta = await client.get('/api/releases/latest').qs({ channel: 'beta' })

    beta.assertStatus(404)
  })
})
