import { Link } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'
import DownloadLinks, { PLATFORMS } from '~/components/download_links'
import Seo from '~/components/seo'
import SiteLayout from '~/components/site_layout'
import type { ReleaseDetail, ReleaseSummary, SiteLinks } from '~/lib/types'

type DownloadIndexProps = {
  latest: ReleaseDetail | null
  releases: ReleaseSummary[]
  links: SiteLinks
}

export default function DownloadIndex({ latest, releases, links }: DownloadIndexProps) {
  const previous = releases.filter((release) => release.version !== latest?.version)

  return (
    <SiteLayout>
      <Seo
        title="Download"
        description="Download the latest version of TextureLab for Windows, macOS and Linux"
      />

      <section className="block w-full bg-gray-900">
        <div className="container mx-auto px-4 text-center text-white">
          <div className="flex flex-col px-8 pt-8">
            <h1 className="mx-auto max-w-4xl pt-8 font-display text-4xl font-bold md:text-5xl">
              Download TextureLab
            </h1>
            <p className="mx-auto mt-4 mb-12 max-w-lg text-xl text-gray-300 md:text-2xl">
              Free and open source, for Windows, macOS and Linux
            </p>
          </div>
        </div>
      </section>

      <section className="w-full bg-gray-200 py-10">
        <div className="container mx-auto max-w-4xl px-4">
          {latest ? (
            <article className="rounded-lg border border-gray-300 bg-white p-6 shadow-md md:p-10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-3xl font-bold text-gray-800">
                  Version {latest.version}
                  {latest.channel !== 'stable' && (
                    <span className="ml-3 rounded bg-gray-200 px-2 py-1 align-middle text-sm font-normal tracking-wide text-gray-600 uppercase">
                      {latest.channel}
                    </span>
                  )}
                </h2>
                {latest.releasedAtLabel && (
                  <p className="text-gray-500">Released {latest.releasedAtLabel}</p>
                )}
              </div>

              {latest.title && <p className="mt-1 text-xl text-gray-600">{latest.title}</p>}

              <div className="mt-6">
                <DownloadLinks downloads={latest.downloads} version={latest.version} />
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Also available on{' '}
                <a
                  className="text-ui-primary underline underline-offset-2"
                  href={links.download}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  itch.io
                </a>
                , or build it yourself from{' '}
                <Link
                  className="text-ui-primary underline underline-offset-2"
                  href="/docs/development/building-from-source"
                >
                  source
                </Link>
                .
              </p>

              {latest.notesHtml && (
                <>
                  <h3 className="mt-10 mb-4 font-display text-2xl font-bold text-gray-800">
                    What's new
                  </h3>
                  <div
                    className="markdown"
                    dangerouslySetInnerHTML={{ __html: latest.notesHtml }}
                  />
                </>
              )}

              <Link
                className="mt-8 inline-flex items-center gap-1 text-ui-primary underline underline-offset-2"
                href={latest.path}
              >
                Permalink to this release <ArrowRight className="inline" size={16} />
              </Link>
            </article>
          ) : (
            <div className="rounded-lg border border-gray-300 bg-white p-10 text-center shadow-md">
              <p className="text-lg text-gray-600">
                No builds have been published here yet — grab the latest version from{' '}
                <a
                  className="text-ui-primary underline underline-offset-2"
                  href={links.download}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  itch.io
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </section>

      {previous.length > 0 && (
        <section className="w-full bg-gray-100 py-10">
          <div className="container mx-auto max-w-4xl px-4">
            <h2 className="mb-6 font-display text-2xl font-bold text-gray-800">
              Previous releases
            </h2>

            <ul className="divide-y divide-gray-300 rounded-lg border border-gray-300 bg-white">
              {previous.map((release) => (
                <li key={release.version}>
                  <Link
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-4 hover:bg-gray-50"
                    href={release.path}
                  >
                    <span className="font-display text-lg font-bold text-gray-800">
                      {release.version}
                    </span>
                    {release.channel !== 'stable' && (
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs tracking-wide text-gray-600 uppercase">
                        {release.channel}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-gray-600">
                      {release.title || ''}
                    </span>
                    <span className="flex items-center gap-2 text-gray-400">
                      {PLATFORMS.filter(({ key }) => release.downloads[key]).map(
                        ({ key, label, Icon }) => (
                          <Icon key={key} size={16} aria-label={label} />
                        )
                      )}
                    </span>
                    <span className="text-sm text-gray-500">{release.releasedAtLabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </SiteLayout>
  )
}
