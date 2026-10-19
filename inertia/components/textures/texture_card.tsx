import { Link } from '@inertiajs/react'
import { ImageOff, SlidersHorizontal } from 'lucide-react'
import { formatResolution, type TextureCard as Card } from '~/lib/textures'

/**
 * A square tile linking to the texture's page. Hovering swaps in a second
 * image (or the albedo output) when there is one.
 */
export default function TextureCard({ texture }: { texture: Card }) {
  return (
    <Link
      href={`/textures/${texture.slug}`}
      className="group block overflow-hidden rounded-lg bg-gray-800 ring-1 ring-white/10 transition hover:ring-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-900">
        {texture.thumbUrl ? (
          <>
            <img
              src={texture.thumbUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105"
            />
            {texture.hoverUrl && (
              <img
                src={texture.hoverUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover opacity-0 transition duration-300 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex size-full items-center justify-center text-gray-600">
            <ImageOff className="size-8" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-1">
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {formatResolution(texture.resolution)}
          </span>
          {texture.variableCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
              title="Adjustable parameters"
            >
              <SlidersHorizontal className="size-3" />
              {texture.variableCount}
            </span>
          )}
        </div>
      </div>

      <div className="px-3 py-2.5">
        <h3 className="truncate font-medium text-white">{texture.title}</h3>
        <p className="truncate text-sm text-gray-400">
          {texture.category?.name ?? 'Uncategorized'} · {texture.channelCount} maps
        </p>
      </div>
    </Link>
  )
}
