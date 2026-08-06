import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Release from '#models/release'

test.group('Public releases API', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  group.each.setup(async () => {
    await Release.createMany([
      {
        version: '1.0.0',
        channel: 'stable',
        isPublished: true,
        notes: '## Added\n- Nodes',
        windowsUrl: 'https://example.com/win.zip',
        releasedAt: DateTime.fromISO('2026-01-01T00:00:00.000Z'),
      },
      {
        version: '1.1.0',
        channel: 'stable',
        isPublished: true,
        releasedAt: DateTime.fromISO('2026-02-01T00:00:00.000Z'),
      },
      {
        version: '1.2.0-beta',
        channel: 'beta',
        isPublished: true,
        releasedAt: DateTime.fromISO('2026-03-01T00:00:00.000Z'),
      },
      {
        version: '2.0.0',
        channel: 'stable',
        isPublished: false,
        releasedAt: DateTime.fromISO('2026-04-01T00:00:00.000Z'),
      },
    ])
  })

  test('lists published releases newest first', async ({ client, assert }) => {
    const response = await client.get('/api/releases')

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((release: { version: string }) => release.version),
      ['1.2.0-beta', '1.1.0', '1.0.0']
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
      response.body().data.map((release: { version: string }) => release.version),
      ['1.2.0-beta']
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
    assert.equal(release.downloads.windows, 'https://example.com/win.zip')
    assert.isNull(release.downloads.mac)
  })

  test('returns the latest stable release by default', async ({ client, assert }) => {
    const response = await client.get('/api/releases/latest')

    response.assertStatus(200)
    assert.equal(response.body().data.version, '1.1.0')
  })

  test('returns the latest release for a channel', async ({ client, assert }) => {
    const response = await client.get('/api/releases/latest').qs({ channel: 'beta' })

    response.assertStatus(200)
    assert.equal(response.body().data.version, '1.2.0-beta')
  })

  test('404s when a channel has nothing published', async ({ client }) => {
    await Release.query().update({ is_published: false })

    const response = await client.get('/api/releases/latest')

    response.assertStatus(404)
  })
})
