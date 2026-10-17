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
        build: 100,
        commit: 'aaaaaaa',
        isPublished: true,
        notes: '## Added\n- Nodes',
        windowsUrl: 'https://example.com/1.0.0/win.zip',
        releasedAt: DateTime.fromISO('2026-01-01T00:00:00.000Z'),
      },
      {
        version: '1.1.0',
        channel: 'stable',
        build: 200,
        commit: 'bbbbbbb',
        isPublished: true,
        windowsUrl: 'https://example.com/1.1.0/win.zip',
        macUrl: 'https://example.com/1.1.0/mac.dmg',
        linuxUrl: 'https://example.com/1.1.0/linux.AppImage',
        // Dated before 1.0.0, so only the build order makes it the headline.
        releasedAt: DateTime.fromISO('2025-11-01T00:00:00.000Z'),
      },
      {
        version: '1.2.0',
        channel: 'beta',
        build: 300,
        commit: 'ccccccc',
        isPublished: true,
        itchUrl: 'https://njbrown.itch.io/texturelab',
        // Older than the stable releases by date, newest by build.
        releasedAt: DateTime.fromISO('2025-12-01T00:00:00.000Z'),
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

  test('features the newest stable build and lists the rest by build', async ({
    client,
    assert,
  }) => {
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
      props.releases.map((release: { identifier: string }) => release.identifier),
      ['1.2.0-beta-ccccccc', '1.1.0-stable-bbbbbbb', '1.0.0-stable-aaaaaaa']
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
    const response = await client.get('/download/1.0.0-stable-aaaaaaa').headers(inertiaHeaders)
    const release = response.body().props.release

    response.assertStatus(200)
    assert.equal(response.body().component, 'download/show')
    assert.equal(release.title, 'First cut')
    assert.equal(release.identifier, '1.0.0-stable-aaaaaaa')
    assert.equal(release.build, 100)
    assert.equal(release.commit, 'aaaaaaa')
    assert.equal(release.path, '/download/1.0.0-stable-aaaaaaa')
    assert.equal(release.releasedAtLabel, 'January 01, 2026')
    assert.include(release.notesHtml, '<h2 id="added"')
    assert.equal(release.downloads.windows, 'https://example.com/1.0.0/win.zip')
    assert.isNull(release.downloads.mac)
  })

  test('exposes an itch.io page for builds shipped there', async ({ client, assert }) => {
    const response = await client.get('/download/1.2.0-beta-ccccccc').headers(inertiaHeaders)
    const release = response.body().props.release

    response.assertStatus(200)
    assert.equal(release.channel, 'beta')
    assert.equal(release.downloads.itch, 'https://njbrown.itch.io/texturelab')
    assert.isNull(release.downloads.windows)
  })

  test('leaves the notes null when a release has none', async ({ client, assert }) => {
    const response = await client.get('/download/1.1.0-stable-bbbbbbb').headers(inertiaHeaders)

    assert.isNull(response.body().props.release.notesHtml)
  })

  test('404s on an unpublished release', async ({ client }) => {
    const response = await client.get('/download/2.0.0-stable-eeeeeee').headers(inertiaHeaders)

    response.assertStatus(404)
  })

  test('404s on an unknown identifier', async ({ client }) => {
    const response = await client.get('/download/9.9.9-stable-fffffff').headers(inertiaHeaders)

    response.assertStatus(404)
  })

  test('no longer finds a release by its bare version', async ({ client }) => {
    const response = await client.get('/download/1.0.0').headers(inertiaHeaders)

    response.assertStatus(404)
  })

  test('falls back to the newest release when nothing stable is published', async ({
    client,
    assert,
  }) => {
    await Release.query().where('channel', 'stable').update({ is_published: false })

    const response = await client.get('/download').headers(inertiaHeaders)

    response.assertStatus(200)
    assert.equal(response.body().props.latest.identifier, '1.2.0-beta-ccccccc')
  })

  test('renders an empty state when nothing is published', async ({ client, assert }) => {
    await Release.query().update({ is_published: false })

    const response = await client.get('/download').headers(inertiaHeaders)

    response.assertStatus(200)
    assert.isNull(response.body().props.latest)
    assert.isEmpty(response.body().props.releases)
  })
})
