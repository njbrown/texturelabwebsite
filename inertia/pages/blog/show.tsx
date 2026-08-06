import Seo from '~/components/seo'
import SiteLayout from '~/components/site_layout'
import type { BlogPost } from '~/lib/types'

export default function BlogShow({ post }: { post: BlogPost }) {
  return (
    <SiteLayout>
      <Seo title={post.title} description={post.description} image={post.image} type="article" />

      <article className="w-full bg-gray-100 py-8">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h1 className="mt-16 mb-2 font-display text-4xl font-bold md:text-6xl">{post.title}</h1>
          <p className="mb-12 block text-lg text-gray-700">{post.dateLabel}</p>

          {post.image && (
            <div className="mb-10 text-center">
              <img className="inline w-full rounded" src={post.image} alt="" />
            </div>
          )}

          <div
            className="markdown markdown--article text-left"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        </div>
      </article>
    </SiteLayout>
  )
}
