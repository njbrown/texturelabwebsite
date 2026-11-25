import { test } from '@japa/runner'
import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import limiter from '@adonisjs/limiter/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { encode } from 'fast-png'
import sharp from 'sharp'
import { isCuid } from '@paralleldrive/cuid2'
import { unzipSync } from 'fflate'
import Texture from '#models/texture'
import TextureCategory from '#models/texture_category'
import TextureImage from '#models/texture_image'
import User from '#models/user'
import { extractMetadata } from '#services/texture_metadata_service'
import { addImage, createTexture, publish, storeOutputs } from '#services/texture_service'

const inertiaHeaders = { 'X-Inertia': 'true', 'X-Inertia-Version': '1' }
const fixturePath = (name: string) => app.makePath('tests/fixtures/textures', name)

async function admin() {
  return User.updateOrCreate(
    { email: 'ops@texturelab.io' },
    { password: 'secret-password', fullName: 'Ops' }
  )
}

/** A tiny PNG in the format a channel exports as. */
function png(bitDepth: 8 | 16, channels: 1 | 3 | 4, size = 8) {
  const length = size * size * channels
  const data =
    bitDepth === 16 ? new Uint16Array(length).fill(30000) : new Uint8Array(length).fill(120)
  return Buffer.from(encode({ width: size, height: size, data, depth: bitDepth, channels }))
}

function outputsFor(target: Texture) {
  return target.channels.map((spec) => ({
    channel: spec.channel,
    bytes: png(spec.bitDepth, spec.colorType === 'grey' ? 1 : spec.colorType === 'rgb' ? 3 : 4),
  }))
}

async function image() {
  return sharp({
    create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toBuffer()
}

/**
 * A texture with everything publishing needs, made through the services.
 */
async function texture(
  options: {
    title?: string
    file?: string
    publish?: boolean
    category?: TextureCategory
    tags?: string[]
  } = {}
) {
  const contents = await readFile(fixturePath(options.file ?? 'Copper.texture'))
  const created = await createTexture(contents, 'Copper.texture', extractMetadata(contents), {
    title: options.title ?? 'Copper',
    categoryId: options.category?.id ?? null,
    tags: options.tags ?? [],
  })
  await storeOutputs(created, outputsFor(created), created.sourceSha256, 'rgba32f')
  await addImage(created, await image(), { source: 'upload' })
  if (options.publish !== false) await publish(created)
  return created
}

function storedKeys() {
  return drive
    .use()
    .listAll('', { recursive: true })
    .then(({ objects }) => [...objects].flatMap((object) => (object.isFile ? [object.key] : [])))
}

test.group('Textures / ops', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => limiter.clear(['memory']))
  group.each.setup(() => {
    drive.fake()
    return () => drive.restore()
  })

  test('the texture pages need a login', async ({ client }) => {
    const response = await client.get('/ops/textures').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/ops/login')
  })

  test('inspect reads a file without saving it', async ({ client, assert }) => {
    const user = await admin()
    const response = await client
      .post('/ops/textures/inspect')
      .file('file', fixturePath('CopperVariables.texture'))
      .header('Accept', 'application/json')
      .loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().title, 'Copper Variables')
    assert.equal(response.body().slug, 'copper-variables')
    assert.equal(response.body().metadata.resolution, 1024)
    assert.lengthOf(response.body().metadata.variables, 2)
    assert.equal(
      await Texture.query()
        .count('* as total')
        .first()
        .then((r) => r?.$extras.total),
      0
    )
  })

  test('inspect explains why a file is rejected', async ({ client, assert }) => {
    const user = await admin()
    const response = await client
      .post('/ops/textures/inspect')
      .file('file', Buffer.from('{"nodes":[]}'), { filename: 'empty.texture' })
      .header('Accept', 'application/json')
      .loginAs(user)

    response.assertStatus(422)
    assert.include(response.body().error, 'no texture channels')
  })

  test('uploading creates a draft and stores the file privately', async ({ client, assert }) => {
    const user = await admin()
    const category = await TextureCategory.create({ name: 'Metal', slug: 'metal', sortOrder: 0 })

    const response = await client
      .post('/ops/textures')
      .file('file', fixturePath('Copper.texture'))
      .fields({ title: 'Copper sheet', categoryId: category.id, tags: 'Metal, worn ,metal' })
      .loginAs(user)
      .redirects(0)

    const created = await Texture.firstOrFail()
    response.assertStatus(302)
    response.assertHeader('location', `/ops/textures/${created.id}/edit?render=1`)
    assert.equal(created.slug, 'copper-sheet')
    assert.equal(created.status, 'draft')
    assert.equal(created.categoryId, category.id)
    assert.deepEqual(created.tags, ['metal', 'worn'])
    assert.equal(created.nodeCount, 12)
    assert.isTrue(created.outputsStale)
    assert.isTrue(isCuid(created.id))
    assert.equal(
      created.sourceKey,
      `private/textures/${created.id}/source/${created.sourceSha256}.texture`
    )
    assert.include(await storedKeys(), created.sourceKey)
  })

  test('outputs are checked against the file and stored as a revision', async ({ assert }) => {
    const contents = await readFile(fixturePath('Copper.texture'))
    const created = await createTexture(contents, 'Copper.texture', extractMetadata(contents), {
      title: 'Copper',
    })

    await assert.rejects(
      () => storeOutputs(created, outputsFor(created), 'f'.repeat(64), null),
      /changed while this render was running/
    )
    await assert.rejects(
      () => storeOutputs(created, outputsFor(created).slice(1), created.sourceSha256, null),
      /Missing outputs: albedo/
    )
    await assert.rejects(
      () =>
        storeOutputs(
          created,
          [...outputsFor(created), { channel: 'ao', bytes: png(8, 1) }],
          created.sourceSha256,
          null
        ),
      /isn't a channel/
    )

    await storeOutputs(created, outputsFor(created), created.sourceSha256, 'rgba16f')
    await storeOutputs(created, outputsFor(created), created.sourceSha256, 'rgba16f')
    await created.load('outputs')

    assert.equal(created.outputsRevision, 2)
    assert.isFalse(created.outputsStale)
    const height = created.outputs.find((output) => output.channel === 'height')!
    assert.equal(height.bitDepth, 16)
    assert.equal(height.thumbKey, `public/textures/${created.id}/outputs/2/height-512.webp`)
    assert.equal(height.colorType, 'grey')
    assert.equal(height.width, 8)

    // Only the latest revision is kept
    const keys = await storedKeys()
    assert.isTrue(keys.some((key) => key.includes('/outputs/2/')))
    assert.isFalse(keys.some((key) => key.includes('/outputs/1/')))
  })

  test('a failed cleanup of the old revision does not fail the save', async ({ assert }) => {
    const contents = await readFile(fixturePath('Copper.texture'))
    const created = await createTexture(contents, 'Copper.texture', extractMetadata(contents), {
      title: 'Copper',
    })
    await storeOutputs(created, outputsFor(created), created.sourceSha256, null)

    // As DigitalOcean Spaces did with a misconfigured endpoint
    const disk = drive.use()
    disk.deleteAll = async () => {
      throw new Error('Cannot delete directory: NoSuchKey')
    }

    await storeOutputs(created, outputsFor(created), created.sourceSha256, null)
    await created.refresh()
    assert.equal(created.outputsRevision, 2)
  })

  test('the outputs endpoint takes one PNG per channel', async ({ client, assert }) => {
    const user = await admin()
    const contents = await readFile(fixturePath('Copper.texture'))
    const created = await createTexture(contents, 'Copper.texture', extractMetadata(contents), {
      title: 'Copper',
    })

    let request = client
      .post(`/ops/textures/${created.id}/outputs`)
      .header('Accept', 'application/json')
      .fields({
        sourceSha256: created.sourceSha256,
        renderTargetFormat: 'rgba32f',
        warnings: JSON.stringify(['Node type "x" is not supported']),
      })
      .loginAs(user)
    for (const output of outputsFor(created)) {
      request = request.file(`output_${output.channel}`, output.bytes, {
        filename: `${output.channel}.png`,
      })
    }
    const response = await request

    response.assertStatus(200)
    assert.equal(response.body().revision, 1)
    await created.refresh()
    assert.include(created.warnings, 'Node type "x" is not supported')
  })

  test('images are converted to webp with a thumbnail', async ({ client, assert }) => {
    const user = await admin()
    const contents = await readFile(fixturePath('Copper.texture'))
    const created = await createTexture(contents, 'Copper.texture', extractMetadata(contents), {
      title: 'Copper',
    })

    const response = await client
      .post(`/ops/textures/${created.id}/images`)
      .file('image', await image(), { filename: 'render.png' })
      .header('Accept', 'application/json')
      .loginAs(user)

    response.assertStatus(200)
    const saved = await TextureImage.findOrFail(response.body().id)
    assert.isTrue(saved.isPrimary)
    assert.equal(saved.width, 64)
    assert.match(saved.key, /\.webp$/)
    assert.match(saved.thumbKey, /-512\.webp$/)
  })

  test('images can be reordered and made primary by id', async ({ client, assert }) => {
    const user = await admin()
    const created = await texture({ publish: false })
    const second = await addImage(created, await image(), { source: 'upload' })
    const [first] = await TextureImage.query()
      .where('texture_id', created.id)
      .whereNot('id', second.id)

    await client
      .put(`/ops/textures/${created.id}/images/order`)
      .json({ ids: [second.id, first.id] })
      .loginAs(user)
      .redirects(0)
    await client
      .put(`/ops/textures/${created.id}/images/${second.id}`)
      .json({ isPrimary: true })
      .loginAs(user)
      .redirects(0)

    await first.refresh()
    await second.refresh()
    assert.equal(second.sortOrder, 0)
    assert.equal(first.sortOrder, 1)
    assert.isTrue(second.isPrimary)
    assert.isFalse(first.isPrimary)
  })

  test('publishing needs rendered outputs and an image', async ({ client, assert }) => {
    const user = await admin()
    const contents = await readFile(fixturePath('Copper.texture'))
    const created = await createTexture(contents, 'Copper.texture', extractMetadata(contents), {
      title: 'Copper',
    })

    await client.post(`/ops/textures/${created.id}/publish`).loginAs(user).redirects(0)
    await created.refresh()
    assert.equal(created.status, 'draft')

    await storeOutputs(created, outputsFor(created), created.sourceSha256, null)
    await addImage(created, await image(), { source: 'render' })
    await client.post(`/ops/textures/${created.id}/publish`).loginAs(user).redirects(0)
    await created.refresh()
    assert.equal(created.status, 'published')
    assert.isNotNull(created.publishedAt)
  })

  test('replacing the file marks the outputs stale', async ({ client, assert }) => {
    const user = await admin()
    const created = await texture()

    await client
      .post(`/ops/textures/${created.id}/source`)
      .file('file', fixturePath('CopperVariables.texture'))
      .loginAs(user)
      .redirects(0)

    await created.refresh()
    assert.lengthOf(created.variables, 2)
    assert.isTrue(created.outputsStale)
    assert.notInclude(await storedKeys(), `private/textures/${created.id}/source/x`)
  })

  test('the edit page shows publish problems', async ({ client, assert }) => {
    const user = await admin()
    const contents = await readFile(fixturePath('Copper.texture'))
    const created = await createTexture(contents, 'Copper.texture', extractMetadata(contents), {
      title: 'Copper',
    })

    const response = await client
      .get(`/ops/textures/${created.id}/edit`)
      .headers(inertiaHeaders)
      .loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().component, 'ops/textures/edit')
    assert.lengthOf(response.body().props.problems, 2)
    assert.equal(response.body().props.texture.channels[4].bitDepth, 16)
  })

  test('deleting removes everything from storage', async ({ client, assert }) => {
    const user = await admin()
    const created = await texture()

    await client.delete(`/ops/textures/${created.id}`).loginAs(user).redirects(0)

    assert.isNull(await Texture.find(created.id))
    assert.deepEqual(await storedKeys(), [])
  })

  test('categories can be created, and deleting one keeps its textures', async ({
    client,
    assert,
  }) => {
    const user = await admin()
    await client.post('/ops/categories').json({ name: 'Wood & Bark' }).loginAs(user).redirects(0)

    const category = await TextureCategory.findByOrFail('slug', 'wood-bark')
    const created = await texture({ category })

    await client.delete(`/ops/categories/${category.id}`).loginAs(user).redirects(0)
    await created.refresh()
    assert.isNull(created.categoryId)
  })
})

test.group('Textures / public', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => limiter.clear(['memory']))
  group.each.setup(() => {
    drive.fake()
    return () => drive.restore()
  })

  test('the gallery lists published textures only', async ({ client, assert }) => {
    await texture({ title: 'Copper' })
    await texture({ title: 'Hidden', publish: false })

    const response = await client.get('/gallery').headers(inertiaHeaders)
    const props = response.body().props

    response.assertStatus(200)
    assert.equal(response.body().component, 'gallery/index')
    assert.deepEqual(
      props.textures.map((card: { title: string }) => card.title),
      ['Copper']
    )
    assert.equal(props.textures[0].channelCount, 5)
    assert.isString(props.textures[0].thumbUrl)
    // Hovering shows the albedo map's preview, not the full PNG
    assert.match(props.textures[0].hoverUrl, /\/outputs\/1\/albedo-512\.webp$/)
    assert.equal(props.total, 1)
  })

  test('the gallery filters by category', async ({ client, assert }) => {
    const metal = await TextureCategory.create({ name: 'Metal', slug: 'metal', sortOrder: 0 })
    const ground = await TextureCategory.create({ name: 'Ground', slug: 'ground', sortOrder: 1 })
    await texture({ title: 'Copper', category: metal })
    await texture({ title: 'Grass', file: 'Grenade.texture', category: ground })

    const response = await client.get('/gallery/metal').headers(inertiaHeaders)
    const props = response.body().props

    assert.deepEqual(
      props.textures.map((card: { title: string }) => card.title),
      ['Copper']
    )
    assert.equal(props.category.name, 'Metal')
    assert.deepEqual(
      props.categories.map((c: { slug: string; count: number }) => [c.slug, c.count]),
      [
        ['metal', 1],
        ['ground', 1],
      ]
    )
  })

  test('the gallery searches titles, tags and categories', async ({ client, assert }) => {
    const metal = await TextureCategory.create({ name: 'Metal', slug: 'metal', sortOrder: 0 })
    await texture({ title: 'Copper', category: metal })
    await texture({ title: 'Grass', file: 'Grenade.texture', tags: ['Foliage'] })
    await texture({ title: '100% Wool', file: 'Grenade.texture' })

    const titles = async (q: string) => {
      const response = await client.get('/gallery').qs({ q }).headers(inertiaHeaders)
      return response.body().props.textures.map((card: { title: string }) => card.title)
    }

    assert.deepEqual(await titles('COPP'), ['Copper'])
    assert.deepEqual(await titles('foliage'), ['Grass'])
    assert.deepEqual(await titles('metal'), ['Copper'])
    assert.deepEqual(await titles('100%'), ['100% Wool'])
    assert.deepEqual(await titles('0%'), ['100% Wool'])
    assert.deepEqual(await titles('nothing-like-this'), [])
  })

  test('an unknown category is a 404', async ({ client }) => {
    const response = await client.get('/gallery/nope').headers(inertiaHeaders)
    response.assertStatus(404)
  })

  test('the texture page shows its details', async ({ client, assert }) => {
    await texture({ file: 'CopperVariables.texture' })

    const response = await client.get('/textures/copper').headers(inertiaHeaders)
    const props = response.body().props

    response.assertStatus(200)
    assert.equal(response.body().component, 'textures/show')
    assert.equal(props.texture.resolution, 1024)
    assert.equal(props.texture.license.name, 'CC0 1.0')
    assert.lengthOf(props.texture.outputs, 5)
    assert.deepEqual(
      props.texture.presets.map((p: { name: string }) => p.name),
      ['Smooth', 'Worn']
    )
    assert.notProperty(props.texture, 'sourceKey')
    assert.isFalse(props.isPreview)
  })

  test('drafts are hidden unless signed in to ops', async ({ client, assert }) => {
    await texture({ publish: false })

    const publicResponse = await client.get('/textures/copper').headers(inertiaHeaders)
    publicResponse.assertStatus(404)

    const sourceResponse = await client.get('/textures/copper/source')
    sourceResponse.assertStatus(404)

    const adminResponse = await client
      .get('/textures/copper')
      .headers(inertiaHeaders)
      .loginAs(await admin())
    adminResponse.assertStatus(200)
    assert.isTrue(adminResponse.body().props.isPreview)
  })

  test('the source is served for the renderer without counting a download', async ({
    client,
    assert,
  }) => {
    const created = await texture()

    const response = await client.get('/textures/copper/source')
    response.assertStatus(200)
    assert.equal(JSON.parse(response.text()).libraryVersion, 'v3')

    await created.refresh()
    assert.equal(created.downloadCount, 0)
  })

  test('downloading the source counts it', async ({ client, assert }) => {
    const created = await texture()

    const response = await client.get('/textures/copper/download')
    response.assertStatus(200)
    response.assertHeader('content-disposition', 'attachment; filename="copper.texture"')

    await created.refresh()
    assert.equal(created.downloadCount, 1)
  })

  test('the page links a versioned 1200x630 share card', async ({ client, assert }) => {
    await texture()

    const page = await client.get('/textures/copper').headers(inertiaHeaders)
    const props = page.body().props.texture
    assert.match(props.ogImage.url, /^\/textures\/copper\/og\.jpg\?v=[0-9a-f]{16}$/)
    assert.include(props.summary, 'free CC0 procedural texture')

    const card = await fetch(`http://${process.env.HOST}:${process.env.PORT}${props.ogImage.url}`)
    assert.equal(card.status, 200)
    assert.equal(card.headers.get('content-type'), 'image/jpeg')
    assert.include(card.headers.get('cache-control') ?? '', 'immutable')
    const meta = await sharp(Buffer.from(await card.arrayBuffer())).metadata()
    assert.equal(meta.width, 1200)
    assert.equal(meta.height, 630)
  })

  test('the share card changes when the texture does', async ({ client, assert }) => {
    const created = await texture()
    const cardUrl = async () => {
      const response = await client.get('/textures/copper').headers(inertiaHeaders)
      return response.body().props.texture.ogImage.url
    }

    const before = await cardUrl()
    created.title = 'Copper sheet'
    await created.save()

    assert.notEqual(before, await cardUrl())
  })

  test('share tags are in the server-rendered html', async ({ client, assert }) => {
    await texture()

    const response = await client.get('/textures/copper')
    const html = response.text()
    assert.include(
      html,
      'property="og:image" content="https://texturelab.io/textures/copper/og.jpg?v='
    )
    assert.include(html, 'property="og:image:width" content="1200"')
    assert.include(html, 'name="twitter:card" content="summary_large_image"')
    assert.include(html, 'rel="canonical" href="https://texturelab.io/textures/copper"')
    assert.include(html, 'application/ld+json')
  })

  test('the default outputs download as one zip', async ({ assert }) => {
    await texture()

    // The api client parses bodies; the zip is read as bytes instead.
    const response = await fetch(
      `http://${process.env.HOST}:${process.env.PORT}/textures/copper/outputs.zip`
    )
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/zip')

    const files = Object.keys(unzipSync(new Uint8Array(await response.arrayBuffer())))
    assert.sameMembers(files, [
      'README.txt',
      'copper_albedo.png',
      'copper_normal.png',
      'copper_metalness.png',
      'copper_roughness.png',
      'copper_height.png',
    ])
  })
})
