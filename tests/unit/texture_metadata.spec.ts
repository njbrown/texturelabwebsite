import { test } from '@japa/runner'
import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import {
  extractMetadata,
  MAX_TEXTURE_BYTES,
  TextureMetadataError,
} from '#services/texture_metadata_service'

function fixture(name: string) {
  return readFile(app.makePath('tests/fixtures/textures', name))
}

function bytes(text: string) {
  return new TextEncoder().encode(text)
}

test.group('texture metadata', () => {
  test('reads a graph without variables', async ({ assert }) => {
    const meta = extractMetadata(await fixture('Copper.texture'))

    assert.equal(meta.libraryVersion, 'v3')
    assert.equal(meta.appVersion, '0.3.2')
    assert.equal(meta.resolution, 1024)
    assert.equal(meta.nodeCount, 12)
    assert.equal(meta.bytes, 5493)
    assert.lengthOf(meta.sha256, 64)
    assert.deepEqual(
      meta.channels.map((c) => c.channel),
      ['albedo', 'normal', 'metalness', 'roughness', 'height']
    )
    assert.deepEqual(meta.variables, [])
    assert.deepEqual(meta.presets, [])
    assert.deepEqual(meta.warnings, [])
  })

  test('reads each output node export format', async ({ assert }) => {
    const meta = extractMetadata(await fixture('Copper.texture'))
    const byChannel = Object.fromEntries(meta.channels.map((c) => [c.channel, c]))

    assert.deepInclude(byChannel.albedo, { name: 'albedo', bitDepth: 8, colorType: 'rgba' })
    assert.deepInclude(byChannel.roughness, { bitDepth: 8, colorType: 'grey' })
    assert.deepInclude(byChannel.height, { bitDepth: 16, colorType: 'grey' })
  })

  test('reads variables and presets', async ({ assert }) => {
    const meta = extractMetadata(await fixture('CopperVariables.texture'))

    assert.deepEqual(
      meta.variables.map((v) => [v.name, v.type, v.value, v.min, v.max]),
      [
        ['warp', 'float', 0.05, 0, 0.5],
        ['steps', 'int', 4, 1, 16],
      ]
    )
    assert.deepEqual(meta.presets, [
      { id: 'p-smooth', name: 'Smooth' },
      { id: 'p-worn', name: 'Worn' },
    ])
    assert.equal(meta.activePreset, 'p-worn')
  })

  test('warns about node types the runtime cannot load', async ({ assert }) => {
    const source = await fixture('Copper.texture')
    const json = JSON.parse(source.toString())
    json.nodes.push({ id: 'x', typeName: 'notarealnode', properties: {} })

    const meta = extractMetadata(bytes(JSON.stringify(json)))
    assert.lengthOf(meta.warnings, 1)
    assert.include(meta.warnings[0], 'notarealnode')
  })

  test('rejects {name}')
    .with([
      { name: 'empty files', body: '', message: 'empty' },
      { name: 'invalid JSON', body: '{nope', message: 'Not valid JSON' },
      { name: 'JSON that is not a texture', body: '{"a":1}', message: 'nodes' },
      { name: 'graphs without channels', body: '{"nodes":[]}', message: 'no texture channels' },
    ])
    .run(({ assert }, row) => {
      assert.throws(() => extractMetadata(bytes(row.body)), new RegExp(row.message))
    })

  test('rejects files over the size limit', ({ assert }) => {
    assert.throws(
      () => extractMetadata(new Uint8Array(MAX_TEXTURE_BYTES + 1)),
      TextureMetadataError,
      'limit'
    )
  })
})
