import { Link } from '@inertiajs/react'
import { ArrowLeft } from 'lucide-react'
import DownloadLinks, { hasDownloads } from '~/components/download_links'
import Seo from '~/components/seo'
import SiteLayout from '~/components/site_layout'
import type { ReleaseDetail, SiteLinks } from '~/lib/types'

type DownloadShowProps = {
  release: ReleaseDetail
  links: SiteLinks
}

export default function DownloadShow({ release, links }: DownloadShowProps) {
  return (
    <SiteLayout>
      <Seo
        title={`TextureLab ${release.version}`}
        description={
          release.title || `Download TextureLab ${release.version} and read its release notes`
        }
        type="article"
      />

      <section className="block w-full bg-gray-900">
        <div className="container mx-auto px-4 text-center text-white">
          <div className="flex flex-col px-8 pt-8">
            <h1 className="mx-auto max-w-4xl pt-8 font-display text-4xl font-bold md:text-5xl">
              TextureLab {release.version}
              {release.channel !== 'stable' && (
                <span className="ml-3 rounded bg-gray-700 px-2 py-1 align-middle text-base font-normal tracking-wide uppercase">
                  {release.channel}
                </span>
              )}
            </h1>
            {release.title && (
              <p className="mx-auto mt-4 max-w-2xl text-xl text-gray-300">{release.title}</p>
            )}
            <p className="mx-auto mt-2 mb-12 text-gray-400">
              {release.releasedAtLabel ? `Released ${release.releasedAtLabel}` : 'Unreleased'}
            </p>
          </div>
        </div>
      </section>

      <section className="w-full bg-gray-200 py-10">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-md md:p-10">
            <h2 className="mb-4 font-display text-2xl font-bold text-gray-800">Downloads</h2>

            {hasDownloads(release.downloads) ? (
              <DownloadLinks downloads={release.downloads} version={release.version} />
            ) : (
              <p className="text-gray-600">
                This release has no direct downloads. It may still be available on{' '}
                <a
                  className="text-ui-primary hover:opacity-75"
                  href={links.download}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  itch.io
                </a>
                .
              </p>
            )}

            <h2 className="mt-10 mb-4 font-display text-2xl font-bold text-gray-800">
              Release notes
            </h2>

            {release.notesHtml ? (
              <div className="markdown" dangerouslySetInnerHTML={{ __html: release.notesHtml }} />
            ) : (
              <p className="text-gray-600">No release notes were written for this version.</p>
            )}
          </div>

          <Link
            className="mt-8 inline-flex items-center gap-1 text-ui-primary hover:opacity-75"
            href="/download"
          >
            <ArrowLeft className="inline" size={16} /> All releases
          </Link>
        </div>
      </section>
    </SiteLayout>
  )
}
