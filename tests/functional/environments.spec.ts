import { test } from '@japa/runner'
import drive from '@adonisjs/drive/services/main'
import limiter from '@adonisjs/limiter/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import sharp from 'sharp'
import Environment from '#models/environment'
import User from '#models/user'
import { formatFromUrl, sniffFormat } from '#services/environment_service'

const inertiaHeaders = { 'X-Inertia': 'true', 'X-Inertia-Version': '1' }

/** A 1×1 Radiance file. */
const HDR = Buffer.concat([
  Buffer.from('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 1\n'),
  Buffer.from([128, 128, 128, 129]),
])

async function admin() {
  return User.updateOrCreate(
    { email: 'ops@texturelab.io' },
    { password: 'secret-password', fullName: 'Ops' }
  )
}

test.group('Environments', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => limiter.clear(['memory']))
  group.each.setup(() => {
    drive.fake()
    return () => drive.restore()
  })

  test('formats are read from file contents and link extensions', ({ assert }) => {
    assert.equal(sniffFormat(HDR), 'hdr')
    assert.equal(sniffFormat(new Uint8Array([0x76, 0x2f, 0x31, 0x01, 0])), 'exr')
    assert.isNull(sniffFormat(new TextEncoder().encode('not an image')))

    assert.equal(formatFromUrl('https://example.com/a/studio_1k.hdr'), 'hdr')
    assert.equal(formatFromUrl('https://example.com/sky.EXR?download=1'), 'exr')
    assert.isNull(formatFromUrl('https://example.com/sky.png'))
    assert.isNull(formatFromUrl('ftp://example.com/sky.hdr'))
  })

  test('an uploaded HDRI is stored, served by the app and the first is default', async ({
    client,
    assert,
  }) => {
    const user = await admin()
    const response = await client
      .post('/ops/environments')
      .field('name', 'Studio')
      .file('file', HDR, { filename: 'studio.hdr' })
      .loginAs(user)
      .redirects(0)

    const environment = await Environment.firstOrFail()
    response.assertStatus(302)
    response.assertHeader('location', `/ops/environments?selected=${environment.id}`)
    assert.equal(environment.format, 'hdr')
    assert.equal(environment.bytes, HDR.byteLength)
    assert.isTrue(environment.isDefault)
    assert.match(environment.key!, /^private\/environments\/.+\.hdr$/)

    const file = await client.get(`/environments/${environment.id}/file`)
    file.assertStatus(200)
    file.assertHeader('cache-control', 'public, max-age=31536000, immutable')
  })

  test('a file that is not an HDRI is rejected', async ({ client, assert }) => {
    await client
      .post('/ops/environments')
      .field('name', 'Fake')
      .file('file', Buffer.from('hello'), { filename: 'fake.hdr' })
      .loginAs(await admin())
      .redirects(0)

    assert.isNull(await Environment.first())
  })

  test('a link is kept as a link', async ({ client, assert }) => {
    await client
      .post('/ops/environments')
      .json({ name: 'Poly Haven', url: 'https://dl.polyhaven.org/file/sky_1k.hdr' })
      .loginAs(await admin())
      .redirects(0)

    const environment = await Environment.firstOrFail()
    assert.equal(environment.source, 'url')
    assert.isNull(environment.key)

    const file = await client.get(`/environments/${environment.id}/file`)
    file.assertStatus(404)
  })

  test('one default at a time, handed on when it is deleted', async ({ client, assert }) => {
    const user = await admin()
    for (const name of ['One', 'Two']) {
      await client
        .post('/ops/environments')
        .json({ name, url: `https://example.com/${name}.hdr` })
        .loginAs(user)
        .redirects(0)
    }
    const [one, two] = await Environment.query().orderBy('id')

    await client.put(`/ops/environments/${two.id}`).json({ isDefault: true }).loginAs(user)
    await one.refresh()
    await two.refresh()
    assert.isFalse(one.isDefault)
    assert.isTrue(two.isDefault)

    await client.delete(`/ops/environments/${two.id}`).loginAs(user).redirects(0)
    await one.refresh()
    assert.isTrue(one.isDefault)
  })

  test('thumbnails are stored as webp', async ({ client, assert }) => {
    const user = await admin()
    await client
      .post('/ops/environments')
      .json({ name: 'Sky', url: 'https://example.com/sky.hdr' })
      .loginAs(user)
      .redirects(0)
    const environment = await Environment.firstOrFail()
    const png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer()

    const response = await client
      .post(`/ops/environments/${environment.id}/thumbnail`)
      .file('image', png, { filename: 'thumb.png' })
      .header('Accept', 'application/json')
      .loginAs(user)

    response.assertStatus(200)
    await environment.refresh()
    assert.match(environment.thumbKey!, /^public\/environments\/.+\.webp$/)
  })

  test('the environments page lists them with their URLs', async ({ client, assert }) => {
    await Environment.create({
      name: 'Sky',
      format: 'hdr',
      source: 'url',
      url: 'https://example.com/sky.hdr',
      key: null,
      bytes: null,
      thumbKey: null,
      isDefault: true,
      sortOrder: 0,
    })

    const response = await client
      .get('/ops/environments')
      .headers(inertiaHeaders)
      .loginAs(await admin())
    assert.equal(response.body().props.environments[0].url, 'https://example.com/sky.hdr')
  })
})
