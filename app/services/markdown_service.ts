import MarkdownIt, { type MarkdownIt as MarkdownItInstance, type Token } from 'markdown-it'
import anchor from 'markdown-it-anchor'
import Shiki from '@shikijs/markdown-it'

export type Heading = {
  depth: number
  value: string
  anchor: string
}

export type RenderedMarkdown = {
  html: string
  headings: Heading[]
}

/**
 * Content authored under `content/` references images the way the Gridsome
 * site did (`../../static/images/foo.png`). Those files now live in `public/`,
 * so every asset reference is rewritten onto a root relative URL.
 */
export function normalizeAssetPath(src: string): string {
  if (!src) return src
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src

  const normalized = src.replace(/^(\.\.\/)+/, '/').replace(/^\/?static\//, '/')

  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

/**
 * GitHub flavoured slugs, so anchors stay stable with the URLs the v1 site
 * generated with remark.
 */
function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]+/g, '')
    .replace(/\s+/g, '-')
}

let renderer: Promise<MarkdownItInstance> | null = null

async function createRenderer(): Promise<MarkdownItInstance> {
  const md = MarkdownIt({ html: true, linkify: true, typographer: false })

  md.use(await Shiki({ themes: { light: 'github-light', dark: 'github-dark' } }))

  md.use(anchor, {
    slugify,
    permalink: anchor.permalink.headerLink(),
    tabIndex: false,
  })

  /**
   * Rewrite relative image sources onto `public/`.
   */
  md.renderer.rules.image = (tokens, idx, options, _env, self) => {
    const token = tokens[idx]
    const srcIndex = token.attrIndex('src')

    if (srcIndex >= 0) {
      token.attrs![srcIndex][1] = normalizeAssetPath(String(token.attrs![srcIndex][1]))
    }

    return self.renderToken(tokens, idx, options)
  }

  /**
   * External links open in a new tab, as they did in the v1 remark config.
   */
  const defaultLinkOpen =
    md.renderer.rules.link_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = String(tokens[idx].attrGet('href') ?? '')

    if (/^https?:\/\//.test(href)) {
      tokens[idx].attrSet('target', '_blank')
      tokens[idx].attrSet('rel', 'nofollow noopener noreferrer')
    }

    return defaultLinkOpen(tokens, idx, options, env, self)
  }

  return md
}

function getRenderer(): Promise<MarkdownItInstance> {
  if (!renderer) {
    renderer = createRenderer()
  }

  return renderer
}

function headingText(token: Token | undefined): string {
  if (!token?.children) return token?.content ?? ''

  return token.children
    .filter((child) => child.type === 'text' || child.type === 'code_inline')
    .map((child) => child.content)
    .join('')
    .trim()
}

/**
 * Renders markdown to HTML and returns the heading outline used by the
 * "On this page" table of contents.
 */
export async function renderMarkdown(source: string): Promise<RenderedMarkdown> {
  const md = await getRenderer()
  const env: Record<string, unknown> = {}
  const tokens = md.parse(source, env)

  const headings: Heading[] = []

  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') return

    const id = token.attrGet('id')
    if (!id) return

    headings.push({
      depth: Number(token.tag.slice(1)),
      value: headingText(tokens[index + 1]),
      anchor: `#${id}`,
    })
  })

  return { html: md.renderer.render(tokens, md.options, env), headings }
}

/**
 * First level one heading of a document, used as a fallback title when the
 * front matter does not declare one.
 */
export function firstHeading(source: string): string | null {
  const match = source.match(/^#\s+(.+)$/m)

  return match ? match[1].trim() : null
}
