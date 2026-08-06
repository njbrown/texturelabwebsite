import Seo from '~/components/seo'
import SiteLayout from '~/components/site_layout'
import type { GalleryItem } from '~/lib/types'

export default function GalleryIndex({ items }: { items: GalleryItem[] }) {
  return (
    <SiteLayout>
      <Seo
        title="Gallery"
        description="Textures made with TextureLab"
        image={items[0]?.image ?? null}
      />

      <section className="block w-full bg-gray-900">
        <div className="container mx-auto px-4 text-center text-white">
          <div className="flex flex-col px-8 pt-8">
            <h1 className="mx-auto max-w-4xl pt-8 font-display text-4xl font-bold md:text-5xl">
              Gallery
            </h1>
            <p className="mx-auto mt-4 mb-12 max-w-lg text-xl text-gray-300">
              Textures made with TextureLab
            </p>
          </div>
        </div>
      </section>

      <section className="min-h-[70vh] w-full bg-gray-200 py-8">
        <div className="container mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          {items.length === 0 && (
            <p className="col-span-full py-12 text-center text-gray-600">
              No textures published yet.
            </p>
          )}

          {items.map((item) => (
            <figure
              key={item.slug}
              className="overflow-hidden rounded-lg border border-gray-300 bg-gray-100 shadow-md"
            >
              {(item.thumbnail || item.image) && (
                <img
                  className="aspect-square w-full object-cover"
                  src={item.thumbnail || item.image!}
                  alt={item.title}
                  loading="lazy"
                />
              )}
              <figcaption className="px-6 py-5">
                <h2 className="font-display text-xl font-bold text-gray-700">{item.title}</h2>
                <p className="pt-1 text-sm text-gray-400">{item.dateLabel}</p>
                <div
                  className="markdown pt-2 text-sm"
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </SiteLayout>
  )
}
