import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Release from '#models/release'

const inertiaHeaders = { 'X-Inertia': 'true', 'X-Inertia-Version': '1' }

test.group('Download pages', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  group.each.setup(async () => {
    await Release.createMany([
      {
        version: '1.0.0',
        title: 'First cut',
        channel: 'stable',
        isPublished: true,
        notes: '## Added\n- Nodes',
        windowsUrl: 'https://example.com/1.0.0/win.zip',
        releasedAt: DateTime.fromISO('2026-01-01T00:00:00.000Z'),
      },
      {
        version: '1.1.0',
        channel: 'stable',
        isPublished: true,
        windowsUrl: 'https://example.com/1.1.0/win.zip',
        macUrl: 'https://example.com/1.1.0/mac.dmg',
        linuxUrl: 'https://example.com/1.1.0/linux.AppImage',
        releasedAt: DateTime.fromISO('2026-02-01T00:00:00.000Z'),
      },
      {
        version: '1.2.0-beta',
        channel: 'beta',
        isPublished: true,
        itchUrl: 'https://njbrown.itch.io/texturelab',
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

  test('features the newest stable release and lists the rest', async ({ client, assert }) => {
    const response = await client.get('/download').headers(inertiaHeaders)
    const props = response.body().props

    response.assertStatus(200)
    assert.equal(response.body().component, 'download/index')
    assert.equal(props.latest.version, '1.1.0')
    assert.deepEqual(props.latest.downloads, {
      windows: 'https://example.com/1.1.0/win.zip',
      mac: 'https://example.com/1.1.0/mac.dmg',
      linux: 'https://example.com/1.1.0/linux.AppImage',
      itch: null,
    })
    assert.deepEqual(
      props.releases.map((release: { version: string }) => release.version),
      ['1.2.0-beta', '1.1.0', '1.0.0']
    )
  })

  test('never lists unpublished releases', async ({ client, assert }) => {
    const response = await client.get('/download').headers(inertiaHeaders)

    assert.notInclude(
      response.body().props.releases.map((release: { version: string }) => release.version),
      '2.0.0'
    )
  })

  test('renders a release page with its notes as html', async ({ client, assert }) => {
    const response = await client.get('/download/1.0.0').headers(inertiaHeaders)
    const release = response.body().props.release

    response.assertStatus(200)
    assert.equal(response.body().component, 'download/show')
    assert.equal(release.title, 'First cut')
    assert.equal(release.path, '/download/1.0.0')
    assert.equal(release.releasedAtLabel, 'January 01, 2026')
    assert.include(release.notesHtml, '<h2 id="added"')
    assert.equal(release.downloads.windows, 'https://example.com/1.0.0/win.zip')
    assert.isNull(release.downloads.mac)
  })

  test('exposes an itch.io page for builds shipped there', async ({ client, assert }) => {
    const response = await client.get('/download/1.2.0-beta').headers(inertiaHeaders)
    const release = response.body().props.release

    response.assertStatus(200)
    assert.equal(release.downloads.itch, 'https://njbrown.itch.io/texturelab')
    assert.isNull(release.downloads.windows)
  })

  test('leaves the notes null when a release has none', async ({ client, assert }) => {
    const response = await client.get('/download/1.1.0').headers(inertiaHeaders)

    assert.isNull(response.body().props.release.notesHtml)
  })

  test('404s on an unpublished release', async ({ client }) => {
    const response = await client.get('/download/2.0.0').headers(inertiaHeaders)

    response.assertStatus(404)
  })

  test('404s on an unknown version', async ({ client }) => {
    const response = await client.get('/download/9.9.9').headers(inertiaHeaders)

    response.assertStatus(404)
  })

  test('falls back to the newest release when nothing stable is published', async ({
    client,
    assert,
  }) => {
    await Release.query().where('channel', 'stable').update({ is_published: false })

    const response = await client.get('/download').headers(inertiaHeaders)

    response.assertStatus(200)
    assert.equal(response.body().props.latest.version, '1.2.0-beta')
  })

  test('renders an empty state when nothing is published', async ({ client, assert }) => {
    await Release.query().update({ is_published: false })

    const response = await client.get('/download').headers(inertiaHeaders)

    response.assertStatus(200)
    assert.isNull(response.body().props.latest)
    assert.isEmpty(response.body().props.releases)
  })
})
