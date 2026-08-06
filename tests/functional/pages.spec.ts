import { test } from '@japa/runner'

/**
 * Requests carry the Inertia headers so the responses come back as JSON page
 * objects rather than the server rendered root view.
 */
const inertiaHeaders = { 'X-Inertia': 'true', 'X-Inertia-Version': '1' }

test.group('Pages', () => {
  test('renders the home page', async ({ client, assert }) => {
    const response = await client.get('/').headers(inertiaHeaders)

    response.assertStatus(200)
    assert.equal(response.body().component, 'home')
    assert.equal(response.body().props.site.name, 'TextureLab')
  })

  test('renders the docs index', async ({ client, assert }) => {
    const response = await client.get('/docs').headers(inertiaHeaders)

    response.assertStatus(200)
    assert.equal(response.body().component, 'docs/show')
    assert.equal(response.body().props.page.path, '/docs')
    assert.equal(response.body().props.sidebar.name, 'docs')
  })

  test('renders a nested docs page with its outline and prev/next links', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/docs/interface/toolbar').headers(inertiaHeaders)
    const page = response.body().props.page

    response.assertStatus(200)
    assert.equal(page.title, 'Toolbar')
    assert.include(page.html, '<h1 id="toolbar">')
    assert.deepInclude(page.headings, { depth: 2, value: 'Undo-Redo', anchor: '#undo-redo' })
    assert.equal(page.next, '/docs/interface/library')
  })

  test('returns a 404 for an unknown docs page', async ({ client }) => {
    const response = await client.get('/docs/nope').headers(inertiaHeaders)

    response.assertStatus(404)
  })

  test('lists published blog posts', async ({ client, assert }) => {
    const response = await client.get('/blog').headers(inertiaHeaders)
    const posts = response.body().props.posts

    response.assertStatus(200)
    assert.isArray(posts)
    assert.isTrue(posts.every((post: { slug: string }) => Boolean(post.slug)))
  })

  test('renders a blog post with assets pointing at public/', async ({ client, assert }) => {
    const response = await client.get('/blog/welcome-to-texturelab').headers(inertiaHeaders)
    const post = response.body().props.post

    response.assertStatus(200)
    assert.equal(post.title, "Welcome to TextureLab's Blog")
    assert.equal(post.image, '/images/screenshot.png')
    assert.equal(post.dateLabel, 'February 01, 2021')
  })

  test('returns a 404 for an unknown blog post', async ({ client }) => {
    const response = await client.get('/blog/nope').headers(inertiaHeaders)

    response.assertStatus(404)
  })

  test('renders the gallery', async ({ client, assert }) => {
    const response = await client.get('/gallery').headers(inertiaHeaders)
    const items = response.body().props.items

    response.assertStatus(200)
    assert.isArray(items)
    assert.equal(items[0].title, 'Hex Texture')
    assert.equal(items[0].image, '/uploads/hex-render.jpg')
  })
})
