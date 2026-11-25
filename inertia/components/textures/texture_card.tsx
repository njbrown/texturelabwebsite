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
      className="group block overflow-hidden rounded-lg bg-neutral-800 transition-colors hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      {/* No background of its own: transparent renders sit on the card's grey. */}
      <div className="relative aspect-square overflow-hidden">
        {texture.thumbUrl ? (
          <>
            <img
              src={texture.thumbUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-contain transition duration-300 group-hover:scale-105"
            />
            {texture.hoverUrl && (
              <img
                src={texture.hoverUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-contain opacity-0 transition duration-300 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex size-full items-center justify-center text-neutral-600">
            <ImageOff className="size-8" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-1">
          <span className="rounded bg-black/40 px-1.5 py-0.5 text-xs font-medium text-white">
            {formatResolution(texture.resolution)}
          </span>
          {texture.variableCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 text-xs font-medium text-white"
              title="Adjustable parameters"
            >
              <SlidersHorizontal className="size-3" />
              {texture.variableCount}
            </span>
          )}
        </div>
      </div>

      <div className="px-3 pt-1 pb-3">
        <h3 className="truncate font-medium text-white">{texture.title}</h3>
        <p className="truncate text-sm text-neutral-400">
          {texture.category?.name ?? 'Uncategorized'} · {texture.channelCount} maps
        </p>
      </div>
    </Link>
  )
}
