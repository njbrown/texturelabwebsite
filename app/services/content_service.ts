import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import matter from 'gray-matter'
import app from '@adonisjs/core/services/app'
import {
  firstHeading,
  normalizeAssetPath,
  renderMarkdown,
  type Heading,
} from './markdown_service.js'

export type DocLink = {
  path: string
  title: string
}

export type DocPage = DocLink & {
  description: string
  sidebar: string | null
  next: string | null
  prev: string | null
  html: string
  headings: Heading[]
}

export type BlogPost = {
  slug: string
  path: string
  title: string
  description: string
  category: string | null
  date: string | null
  dateLabel: string | null
  image: string | null
  authors: string[]
  html: string
}

export type GalleryItem = {
  slug: string
  title: string
  date: string | null
  dateLabel: string | null
  image: string | null
  thumbnail: string | null
  html: string
}

const CONTENT_ROOT = app.makePath('content')

/**
 * Markdown is parsed once and kept in memory. In development the cache is
 * bypassed so edits under `content/` show up on the next request.
 */
const caches = new Map<string, unknown>()

async function cached<T>(key: string, factory: () => Promise<T>): Promise<T> {
  if (!app.inProduction) {
    return factory()
  }

  if (!caches.has(key)) {
    caches.set(key, await factory())
  }

  return caches.get(key) as T
}

async function markdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && extname(entry.name) === '.md')
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
}

function stripTrailingSlash(value: string): string {
  return value.length > 1 ? value.replace(/\/+$/, '') : value
}

/**
 * `content/docs/index.md` -> `/docs`
 * `content/docs/interface/toolbar.md` -> `/docs/interface/toolbar`
 */
function docPathFor(file: string): string {
  const slug = relative(join(CONTENT_ROOT, 'docs'), file)
    .replace(/\.md$/, '')
    .replace(/\\/g, '/')
    .replace(/(^|\/)index$/, '')

  return stripTrailingSlash(`/docs/${slug}`)
}

function formatDate(value: unknown): { date: string | null; dateLabel: string | null } {
  if (!value) return { date: null, dateLabel: null }

  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return { date: null, dateLabel: null }

  return {
    date: date.toISOString(),
    dateLabel: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date),
  }
}

function optionalLink(value: unknown): string | null {
  return typeof value === 'string' && value ? stripTrailingSlash(value) : null
}

export async function getDocPages(): Promise<DocPage[]> {
  return cached('docs', async () => {
    const files = await markdownFiles(join(CONTENT_ROOT, 'docs'))

    return Promise.all(
      files.map(async (file) => {
        const { data, content } = matter(await readFile(file, 'utf8'))
        const { html, headings } = await renderMarkdown(content)

        return {
          path: docPathFor(file),
          title: data.title || firstHeading(content) || 'Untitled',
          description: data.description || '',
          sidebar: data.sidebar || null,
          next: optionalLink(data.next),
          prev: optionalLink(data.prev),
          html,
          headings,
        }
      })
    )
  })
}

export async function findDocPage(path: string): Promise<DocPage | null> {
  const pages = await getDocPages()
  const wanted = stripTrailingSlash(path)

  return pages.find((page) => page.path === wanted) ?? null
}

/**
 * The lightweight `{ path, title }` list the sidebar and prev/next links are
 * built from — the full rendered HTML never leaves the server for these.
 */
export async function getDocLinks(): Promise<DocLink[]> {
  const pages = await getDocPages()

  return pages.map(({ path, title }) => ({ path, title }))
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  return cached('blog', async () => {
    const files = await markdownFiles(join(CONTENT_ROOT, 'blog'))

    const posts = await Promise.all(
      files.map(async (file) => {
        const { data, content } = matter(await readFile(file, 'utf8'))
        const { html } = await renderMarkdown(content)
        const { date, dateLabel } = formatDate(data.date)
        const slug = data.slug || file.split('/').pop()!.replace(/\.md$/, '')

        return {
          slug,
          path: `/blog/${slug}`,
          title: data.title || firstHeading(content) || 'Untitled',
          description: data.description || '',
          category: data.category || null,
          date,
          dateLabel,
          image: data.image ? normalizeAssetPath(data.image) : null,
          authors: Array.isArray(data.author) ? data.author : data.author ? [data.author] : [],
          draft: data.draft === true,
          html,
        }
      })
    )

    return posts
      .filter((post) => !post.draft)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .map(({ draft: _draft, ...post }) => post)
  })
}

export async function findBlogPost(slug: string): Promise<BlogPost | null> {
  const posts = await getBlogPosts()

  return posts.find((post) => post.slug === slug) ?? null
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  return cached('gallery', async () => {
    const files = await markdownFiles(join(CONTENT_ROOT, 'gallery'))

    const items = await Promise.all(
      files.map(async (file) => {
        const { data, content } = matter(await readFile(file, 'utf8'))
        const { html } = await renderMarkdown(content || data.description || '')
        const { date, dateLabel } = formatDate(data.date)

        return {
          slug: file.split('/').pop()!.replace(/\.md$/, ''),
          title: data.title || 'Untitled',
          date,
          dateLabel,
          image: data.image ? normalizeAssetPath(data.image) : null,
          thumbnail: data.thumbnail ? normalizeAssetPath(data.thumbnail) : null,
          html,
        }
      })
    )

    return items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  })
}
