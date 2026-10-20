import { useEffect, useRef, useState } from 'react'
import { Link, router } from '@inertiajs/react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import Seo from '~/components/seo'
import SiteLayout from '~/components/site_layout'
import TextureCard from '~/components/textures/texture_card'
import type { TextureCard as Card } from '~/lib/textures'

type Sort = 'featured' | 'newest' | 'name'

type GalleryProps = {
  textures: Card[]
  pagination: { page: number; lastPage: number; total: number; perPage: number }
  filters: { q: string; sort: Sort; category: string | null }
  category: { slug: string; name: string; description: string | null } | null
  categories: {
    id: number
    slug: string
    name: string
    description: string | null
    count: number
  }[]
  total: number
}

const SORTS: { value: Sort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
]

function galleryUrl(category: string | null, params: { q?: string; sort?: Sort; page?: number }) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.sort && params.sort !== 'featured') search.set('sort', params.sort)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  const query = search.toString()
  return `${category ? `/gallery/${category}` : '/gallery'}${query ? `?${query}` : ''}`
}

function CategoryLink({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      preserveScroll
      className={`flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-1.5 text-sm transition ${
        active ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <span>{label}</span>
      <span className="text-xs tabular-nums text-gray-500">{count}</span>
    </Link>
  )
}

export default function GalleryIndex({
  textures,
  pagination,
  filters,
  category,
  categories,
  total,
}: GalleryProps) {
  const [q, setQ] = useState(filters.q)
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Keep the box in sync when navigating back/forward.
  useEffect(() => setQ(filters.q), [filters.q])
  useEffect(() => () => clearTimeout(debounce.current), [])

  function search(value: string) {
    setQ(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      router.get(
        galleryUrl(filters.category, { q: value.trim(), sort: filters.sort }),
        {},
        { preserveState: true, preserveScroll: true, replace: true }
      )
    }, 300)
  }

  function sort(value: Sort) {
    router.get(
      galleryUrl(filters.category, { q: filters.q, sort: value }),
      {},
      { preserveScroll: true }
    )
  }

  const title = category ? `${category.name} textures` : 'Textures'
  // Shown under the title; the longer description is for search results.
  const tagline = 'Free CC0 procedural textures, made with TextureLab'
  const description =
    category?.description ||
    'Free CC0 procedural textures made with TextureLab. Preview them in 3D, tweak their parameters and download every map.'

  return (
    <SiteLayout>
      <Seo
        title={title}
        description={description}
        image={textures[0]?.thumbUrl ?? null}
        canonicalPath={galleryUrl(filters.category, { page: pagination.page })}
      />

      <section className="bg-gray-900">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-5 lg:flex-row lg:items-end lg:justify-between lg:py-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-white md:text-4xl">{title}</h1>
            <p className="mt-1 text-gray-400">{category?.description || tagline}</p>
          </div>

          <div className="flex items-center gap-3 lg:w-[36rem]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
              <input
                type="search"
                value={q}
                onChange={(event) => search(event.target.value)}
                placeholder="Search textures"
                aria-label="Search textures"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 py-2 pr-9 pl-9 text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => search('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-400">
              <span className="sr-only">Sort</span>
              <select
                value={filters.sort}
                onChange={(event) => sort(event.target.value as Sort)}
                className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="min-h-[70vh] bg-gray-950 py-8">
        <div className="container mx-auto grid gap-8 px-4 md:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="Categories" className="md:sticky md:top-4 md:self-start">
            <h2 className="mb-2 hidden px-3 text-xs font-semibold tracking-wide text-gray-500 uppercase md:block">
              Categories
            </h2>
            <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
              <CategoryLink
                href={galleryUrl(null, { q: filters.q, sort: filters.sort })}
                active={!filters.category}
                label="All"
                count={total}
              />
              {categories.map((item) => (
                <CategoryLink
                  key={item.id}
                  href={galleryUrl(item.slug, { q: filters.q, sort: filters.sort })}
                  active={filters.category === item.slug}
                  label={item.name}
                  count={item.count}
                />
              ))}
            </div>
          </nav>

          <div>
            <p className="mb-4 text-sm text-gray-400">
              {pagination.total} {pagination.total === 1 ? 'texture' : 'textures'}
              {filters.q && (
                <>
                  {' '}
                  matching <span className="text-white">“{filters.q}”</span>
                </>
              )}
            </p>

            {textures.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-700 px-6 py-16 text-center text-gray-400">
                {filters.q ? (
                  <>
                    Nothing matches “{filters.q}”.{' '}
                    <Link
                      href={galleryUrl(filters.category, {})}
                      className="text-brand hover:underline"
                    >
                      Clear the search
                    </Link>
                  </>
                ) : (
                  'No textures here yet.'
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {textures.map((texture) => (
                  <TextureCard key={texture.id} texture={texture} />
                ))}
              </div>
            )}

            {pagination.lastPage > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-8 flex items-center justify-center gap-2 text-sm"
              >
                {pagination.page > 1 ? (
                  <Link
                    href={galleryUrl(filters.category, { ...filters, page: pagination.page - 1 })}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-800 px-3 py-2 text-white hover:bg-gray-700"
                    rel="prev"
                  >
                    <ChevronLeft className="size-4" /> Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-gray-600">
                    <ChevronLeft className="size-4" /> Previous
                  </span>
                )}
                <span className="px-2 text-gray-400 tabular-nums">
                  Page {pagination.page} of {pagination.lastPage}
                </span>
                {pagination.page < pagination.lastPage ? (
                  <Link
                    href={galleryUrl(filters.category, { ...filters, page: pagination.page + 1 })}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-800 px-3 py-2 text-white hover:bg-gray-700"
                    rel="next"
                  >
                    Next <ChevronRight className="size-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-gray-600">
                    Next <ChevronRight className="size-4" />
                  </span>
                )}
              </nav>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}
