import { Apple, Download, ExternalLink, Monitor, Terminal } from 'lucide-react'
import { ItchIcon } from '~/components/icons'
import type { ReleaseDownloads } from '~/lib/types'

type Platform = {
  key: Exclude<keyof ReleaseDownloads, 'itch'>
  label: string
  Icon: typeof Monitor
}

export const PLATFORMS: Platform[] = [
  { key: 'windows', label: 'Windows', Icon: Monitor },
  { key: 'mac', label: 'macOS', Icon: Apple },
  { key: 'linux', label: 'Linux', Icon: Terminal },
]

function hasPlatformDownloads(downloads: ReleaseDownloads): boolean {
  return PLATFORMS.some((platform) => Boolean(downloads[platform.key]))
}

export function hasDownloads(downloads: ReleaseDownloads): boolean {
  return hasPlatformDownloads(downloads) || Boolean(downloads.itch)
}

/**
 * One button per operating system. Platforms a release never shipped on are
 * rendered as disabled placeholders so the row keeps its shape — unless the
 * release only ships through itch.io, in which case that link stands alone.
 */
export default function DownloadLinks({
  downloads,
  version,
}: {
  downloads: ReleaseDownloads
  version: string
}) {
  return (
    <div className="grid gap-3">
      {hasPlatformDownloads(downloads) && <PlatformLinks downloads={downloads} version={version} />}
      {downloads.itch && (
        <a
          className="flex items-center justify-center gap-2 rounded bg-[#fa5c5c] px-4 py-3 font-bold text-white shadow transition-colors hover:bg-[#e04f4f]"
          href={downloads.itch}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ItchIcon size={20} />
          <span>Get it on itch.io</span>
          <ExternalLink size={16} className="opacity-70" aria-hidden="true" />
          <span className="sr-only">— {version}</span>
        </a>
      )}
    </div>
  )
}

function PlatformLinks({ downloads, version }: { downloads: ReleaseDownloads; version: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PLATFORMS.map(({ key, label, Icon }) => {
        const url = downloads[key]

        if (!url) {
          return (
            <span
              key={key}
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded border border-dashed border-gray-400 px-4 py-3 text-gray-500"
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
            className="flex items-center justify-center gap-2 rounded bg-gray-800 px-4 py-3 font-bold text-white shadow transition-colors hover:bg-gray-900"
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
