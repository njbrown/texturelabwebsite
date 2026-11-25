import { Head } from '@inertiajs/react'
import { useCurrentPath, useSite } from '~/lib/use_site'

type SeoImage = {
  url: string
  width?: number
  height?: number
  /** Described for screen readers in share previews. */
  alt?: string
}

type SeoProps = {
  title: string
  description?: string
  image?: string | SeoImage | null
  type?: 'website' | 'article'
  /** Defaults to the current path without its query string. */
  canonicalPath?: string
  /** For `type="article"`. */
  article?: {
    publishedTime?: string | null
    modifiedTime?: string | null
    section?: string | null
    tags?: string[]
  }
  /** Schema.org structured data, rendered as JSON-LD. */
  jsonLd?: Record<string, unknown>
}

function imageType(url: string) {
  const extension = new URL(url).pathname.split('.').pop()?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  return null
}

/**
 * Open Graph / Twitter card tags, mirroring the metaInfo blocks of the v1 site.
 */
export default function Seo({
  title,
  description,
  image,
  type = 'website',
  canonicalPath,
  article,
  jsonLd,
}: SeoProps) {
  const site = useSite()
  const currentPath = useCurrentPath()

  const summary = description || site.tagline
  const picture = typeof image === 'string' || !image ? { url: image ?? '' } : image
  const card = new URL(picture.url || '/images/artist-friendly.png', site.url).toString()
  const cardType = imageType(card)
  const url = new URL(canonicalPath ?? currentPath.split('?')[0], site.url).toString()

  return (
    <Head title={title}>
      <meta head-key="description" name="description" content={summary} />
      <link head-key="canonical" rel="canonical" href={url} />

      <meta head-key="og:type" property="og:type" content={type} />
      <meta head-key="og:site_name" property="og:site_name" content={site.name} />
      <meta head-key="og:title" property="og:title" content={title} />
      <meta head-key="og:description" property="og:description" content={summary} />
      <meta head-key="og:url" property="og:url" content={url} />
      <meta head-key="og:image" property="og:image" content={card} />
      {card.startsWith('https:') && (
        <meta head-key="og:image:secure_url" property="og:image:secure_url" content={card} />
      )}
      {cardType && <meta head-key="og:image:type" property="og:image:type" content={cardType} />}
      {picture.width && (
        <meta head-key="og:image:width" property="og:image:width" content={String(picture.width)} />
      )}
      {picture.height && (
        <meta
          head-key="og:image:height"
          property="og:image:height"
          content={String(picture.height)}
        />
      )}
      {picture.alt && (
        <meta head-key="og:image:alt" property="og:image:alt" content={picture.alt} />
      )}

      {article?.publishedTime && (
        <meta
          head-key="article:published_time"
          property="article:published_time"
          content={article.publishedTime}
        />
      )}
      {article?.modifiedTime && (
        <meta
          head-key="article:modified_time"
          property="article:modified_time"
          content={article.modifiedTime}
        />
      )}
      {article?.section && (
        <meta head-key="article:section" property="article:section" content={article.section} />
      )}
      {article?.tags?.map((tag) => (
        <meta key={tag} head-key={`article:tag:${tag}`} property="article:tag" content={tag} />
      ))}

      <meta head-key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta head-key="twitter:title" name="twitter:title" content={title} />
      <meta head-key="twitter:description" name="twitter:description" content={summary} />
      <meta head-key="twitter:image" name="twitter:image" content={card} />
      {picture.alt && (
        <meta head-key="twitter:image:alt" name="twitter:image:alt" content={picture.alt} />
      )}
      <meta head-key="twitter:creator" name="twitter:creator" content="@njbrown" />

      {jsonLd && (
        <script
          head-key="json-ld"
          type="application/ld+json"
          // `<` is escaped so a value can't close the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
    </Head>
  )
}
