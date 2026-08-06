import { test } from '@japa/runner'
import { normalizeAssetPath, renderMarkdown } from '#services/markdown_service'

test.group('normalizeAssetPath', () => {
  test('rewrites content relative paths onto public/', ({ assert }) => {
    assert.equal(normalizeAssetPath('../../static/images/screenshot.png'), '/images/screenshot.png')
    assert.equal(normalizeAssetPath('/uploads/hex-render.jpg'), '/uploads/hex-render.jpg')
  })

  test('leaves absolute urls untouched', ({ assert }) => {
    assert.equal(
      normalizeAssetPath('https://picsum.photos/600/300'),
      'https://picsum.photos/600/300'
    )
  })
})

test.group('renderMarkdown', () => {
  test('anchors headings and collects the outline', async ({ assert }) => {
    const { html, headings } = await renderMarkdown('# Getting Started\n\n## Install It\n')

    assert.include(html, 'id="getting-started"')
    assert.deepEqual(headings, [
      { depth: 1, value: 'Getting Started', anchor: '#getting-started' },
      { depth: 2, value: 'Install It', anchor: '#install-it' },
    ])
  })

  test('opens external links in a new tab', async ({ assert }) => {
    const { html } = await renderMarkdown('[itch](https://njbrown.itch.io/texturelab)')

    assert.include(html, 'target="_blank"')
    assert.include(html, 'rel="nofollow noopener noreferrer"')
  })

  test('rewrites image sources', async ({ assert }) => {
    const { html } = await renderMarkdown('![shot](../../static/images/screenshot.png)')

    assert.include(html, 'src="/images/screenshot.png"')
  })

  test('highlights fenced code blocks', async ({ assert }) => {
    const { html } = await renderMarkdown('```js\nconst a = 1\n```\n')

    assert.include(html, 'shiki')
  })
})
