import { Link } from '@inertiajs/react'
import Seo from '~/components/seo'
import SiteLayout from '~/components/site_layout'
import type { BlogPostSummary } from '~/lib/types'

export default function BlogIndex({ posts }: { posts: BlogPostSummary[] }) {
  return (
    <SiteLayout>
      <Seo
        title="TextureLab Blog"
        description="Guides, announcements and articles about TextureLab"
      />

      <section className="block w-full bg-gray-900">
        <div className="container mx-auto px-4 text-center text-white">
          <div className="flex flex-col px-8 pt-8">
            <h1 className="mx-auto max-w-4xl pt-8 font-display text-4xl font-bold md:text-5xl">
              Welcome to TextureLab's Blog
            </h1>
            <p className="mx-auto mt-4 mb-12 max-w-lg text-xl text-gray-300 md:text-2xl">
              Guides, announcements and articles about TextureLab
            </p>
          </div>
        </div>
      </section>

      <section className="min-h-[70vh] w-full bg-gray-200 py-8">
        <div className="container mx-auto grid max-w-6xl gap-6 px-4 text-black md:grid-cols-2">
          {posts.length === 0 && (
            <p className="col-span-full py-12 text-center text-gray-600">
              No posts published yet — check back soon.
            </p>
          )}

          {posts.map((post) => (
            <article
              key={post.slug}
              className="overflow-hidden rounded-lg border border-gray-300 bg-gray-100 shadow-md"
            >
              <Link href={post.path}>
                {post.image && <img className="w-full" src={post.image} alt="" />}
                <div className="px-8 py-7">
                  <h2 className="text-left font-display text-3xl font-bold text-gray-700">
                    {post.title}
                  </h2>
                  <p className="pt-1 text-left text-gray-400">{post.dateLabel}</p>
                  <p className="pt-1 text-left">{post.description}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  )
}
