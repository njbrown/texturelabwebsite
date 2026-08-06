import { Head } from '@inertiajs/react'
import { useCurrentPath, useSite } from '~/lib/use_site'

type SeoProps = {
  title: string
  description?: string
  image?: string | null
  type?: 'website' | 'article'
}

/**
 * Open Graph / Twitter card tags, mirroring the metaInfo blocks of the v1 site.
 */
export default function Seo({ title, description, image, type = 'website' }: SeoProps) {
  const site = useSite()
  const currentPath = useCurrentPath()

  const summary = description || site.tagline
  const card = new URL(image || '/images/artist-friendly.png', site.url).toString()

  return (
    <Head title={title}>
      <meta head-key="description" name="description" content={summary} />

      <meta head-key="og:type" property="og:type" content={type} />
      <meta head-key="og:site_name" property="og:site_name" content={site.name} />
      <meta head-key="og:title" property="og:title" content={title} />
      <meta head-key="og:description" property="og:description" content={summary} />
      <meta head-key="og:image" property="og:image" content={card} />
      <meta
        head-key="og:url"
        property="og:url"
        content={new URL(currentPath, site.url).toString()}
      />

      <meta head-key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta head-key="twitter:title" name="twitter:title" content={title} />
      <meta head-key="twitter:description" name="twitter:description" content={summary} />
      <meta head-key="twitter:image" name="twitter:image" content={card} />
      <meta head-key="twitter:creator" name="twitter:creator" content="@njbrown" />
    </Head>
  )
}
