import { useEffect, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'

export type LightboxItem = {
  key: string
  src: string
  title: string
  details: string[]
  /** Extra controls under the image, e.g. a download button. */
  actions?: ReactNode
}

type LightboxProps = {
  items: LightboxItem[]
  index: number | null
  onIndexChange: (index: number | null) => void
}

/**
 * Full-size view of one image from a set, with previous/next (buttons and
 * arrow keys). Built on the dialog, so focus is trapped and Escape closes it.
 */
export default function Lightbox({ items, index, onIndexChange }: LightboxProps) {
  const item = index === null ? null : items[index]
  const count = items.length

  useEffect(() => {
    if (index === null) return

    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') onIndexChange(((index ?? 0) + 1) % count)
      if (event.key === 'ArrowLeft') onIndexChange(((index ?? 0) - 1 + count) % count)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, count, onIndexChange])

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[95vh] w-[95vw] max-w-5xl gap-0 overflow-hidden border-gray-700 bg-gray-950 p-0 text-white sm:max-w-5xl"
      >
        {item && (
          <>
            <div className="relative flex min-h-0 items-center justify-center bg-[repeating-conic-gradient(#1f2937_0_25%,#111827_0_50%)] bg-[length:24px_24px]">
              <img
                src={item.src}
                alt={item.title}
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />

              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => onIndexChange((index! - 1 + count) % count)}
                    className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onIndexChange((index! + 1) % count)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80"
                    aria-label="Next"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => onIndexChange(null)}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-2 hover:bg-black/80"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-800 px-4 py-3">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold">{item.title}</DialogTitle>
                <DialogDescription className="text-sm text-gray-400">
                  {item.details.join(' · ')}
                  {count > 1 && ` · ${index! + 1} of ${count}`}
                </DialogDescription>
              </div>
              {item.actions}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
