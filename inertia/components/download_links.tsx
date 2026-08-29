import { Apple, Download, Monitor, Terminal } from 'lucide-react'
import type { ReleaseDownloads } from '~/lib/types'

type Platform = {
  key: keyof ReleaseDownloads
  label: string
  Icon: typeof Monitor
}

export const PLATFORMS: Platform[] = [
  { key: 'windows', label: 'Windows', Icon: Monitor },
  { key: 'mac', label: 'macOS', Icon: Apple },
  { key: 'linux', label: 'Linux', Icon: Terminal },
]

export function hasDownloads(downloads: ReleaseDownloads): boolean {
  return PLATFORMS.some((platform) => Boolean(downloads[platform.key]))
}

/**
 * One button per operating system. Platforms a release never shipped on are
 * rendered as disabled placeholders so the row keeps its shape.
 */
export default function DownloadLinks({
  downloads,
  version,
}: {
  downloads: ReleaseDownloads
  version: string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PLATFORMS.map(({ key, label, Icon }) => {
        const url = downloads[key]

        if (!url) {
          return (
            <span
              key={key}
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded border border-dashed border-gray-300 px-4 py-3 text-gray-400"
            >
              <Icon size={20} />
              <span>
                {label}
                <span className="sr-only"> — not available for {version}</span>
              </span>
            </span>
          )
        }

        return (
          <a
            key={key}
            className="flex items-center justify-center gap-2 rounded bg-brand px-4 py-3 font-bold text-white shadow transition hover:brightness-110"
            href={url}
            rel="noopener noreferrer"
          >
            <Icon size={20} />
            <span>{label}</span>
            <Download size={16} className="opacity-70" aria-hidden="true" />
            <span className="sr-only">— download {version}</span>
          </a>
        )
      })}
    </div>
  )
}
