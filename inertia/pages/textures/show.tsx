import { useState } from 'react'
import { Link } from '@inertiajs/react'
import { Box, ChevronRight, Download, Eye, FileArchive, Maximize2, Scale } from 'lucide-react'
import Seo from '~/components/seo'
import SiteLayout from '~/components/site_layout'
import Lightbox, { type LightboxItem } from '~/components/textures/lightbox'
import LivePreview from '~/components/textures/live_preview'
import TextureCard from '~/components/textures/texture_card'
import {
  CHANNEL_LABELS,
  COLOR_TYPE_LABELS,
  formatBytes,
  formatDate,
  type Texture,
  type TextureCard as Card,
} from '~/lib/textures'

type ShowProps = {
  texture: Texture
  related: Card[]
  isPreview: boolean
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-800 py-2 text-sm last:border-0">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-right text-white">{children}</dd>
    </div>
  )
}

export default function TextureShow({ texture, related, isPreview }: ShowProps) {
  const [live, setLive] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)

  const hero = texture.images[imageIndex] ?? texture.images[0] ?? null
  const totalOutputBytes = texture.outputs.reduce((sum, output) => sum + output.bytes, 0)
  const sixteenBit = texture.channels.filter((spec) => spec.bitDepth === 16)

  const outputItems: LightboxItem[] = texture.outputs.map((output) => ({
    key: output.channel,
    src: output.url,
    title: CHANNEL_LABELS[output.channel],
    details: [
      `${output.width}×${output.height}`,
      `${output.bitDepth}-bit ${COLOR_TYPE_LABELS[output.colorType] ?? output.colorType}`,
      `PNG · ${formatBytes(output.bytes)}`,
    ],
    actions: (
      <a
        href={output.url}
        download={`${texture.slug}_${output.name}.png`}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-gray-950 hover:bg-blue-300"
      >
        <Download className="size-4" />
        Download
      </a>
    ),
  }))

  return (
    <SiteLayout>
      <Seo
        title={`${texture.title} – free CC0 texture`}
        description={
          texture.description.slice(0, 160) ||
          `${texture.title}: a procedural ${texture.category?.name.toLowerCase() ?? ''} texture made with TextureLab. ${texture.channels.length} maps, ${texture.resolution}px, CC0.`
        }
        image={texture.images[0]?.url ?? null}
      />

      <div className="bg-gray-950 text-gray-200">
        {isPreview && (
          <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-gray-950">
            Draft preview. Only people signed in to ops can see this page.{' '}
            <a href={`/ops/textures/${texture.id}/edit`} className="underline">
              Edit
            </a>
          </div>
        )}

        <div className="container mx-auto px-4 py-6">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-1 text-sm text-gray-400"
          >
            <Link href="/gallery" className="hover:text-white">
              Gallery
            </Link>
            {texture.category && (
              <>
                <ChevronRight className="size-3.5" />
                <Link href={`/gallery/${texture.category.slug}`} className="hover:text-white">
                  {texture.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="size-3.5" />
            <span className="truncate text-gray-200" aria-current="page">
              {texture.title}
            </span>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Preview */}
            <div className="min-w-0">
              {live ? (
                <LivePreview texture={texture} />
              ) : (
                <div className="grid gap-3">
                  <div className="relative overflow-hidden rounded-lg bg-gray-900 ring-1 ring-white/10">
                    <div className="aspect-square sm:aspect-[4/3]">
                      {hero ? (
                        <img
                          src={hero.url}
                          alt={hero.alt ?? texture.title}
                          className="size-full object-contain"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-gray-600">
                          No preview image
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent p-4">
                      <button
                        type="button"
                        onClick={() => setLive(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-medium text-gray-950 shadow-lg hover:bg-gray-200"
                      >
                        <Box className="size-5" />
                        Load 3D preview
                      </button>
                    </div>
                  </div>

                  {texture.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {texture.images.map((image, i) => (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => setImageIndex(i)}
                          className={`size-20 shrink-0 overflow-hidden rounded-md ring-2 ${
                            i === imageIndex ? 'ring-brand' : 'ring-transparent hover:ring-gray-600'
                          }`}
                          aria-label={`Show image ${i + 1}`}
                        >
                          <img src={image.thumbUrl} alt="" className="size-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    The 3D preview renders the texture live on your GPU, so you can change its
                    parameters and download the result.
                  </p>
                </div>
              )}
            </div>

            {/* Details */}
            <aside className="grid content-start gap-5">
              <div>
                <h1 className="font-display text-3xl font-bold text-white">{texture.title}</h1>
                <p className="mt-1 text-sm text-gray-400">
                  {texture.category ? (
                    <Link href={`/gallery/${texture.category.slug}`} className="hover:text-white">
                      {texture.category.name}
                    </Link>
                  ) : (
                    'Uncategorized'
                  )}
                  {texture.publishedAt && <> · {formatDate(texture.publishedAt)}</>}
                </p>
              </div>

              <div className="grid gap-2">
                <a
                  href={`/textures/${texture.slug}/download`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 font-semibold text-gray-950 hover:bg-blue-300"
                >
                  <Download className="size-5" />
                  Download .texture ({formatBytes(texture.sourceBytes)})
                </a>
                {texture.outputs.length > 0 && (
                  <a
                    href={`/textures/${texture.slug}/outputs.zip`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2.5 font-medium text-white hover:bg-gray-700"
                  >
                    <FileArchive className="size-5" />
                    Download maps (.zip, {formatBytes(totalOutputBytes)})
                  </a>
                )}
                <p className="text-center text-xs text-gray-500">
                  Open the .texture in{' '}
                  <Link href="/download" className="text-gray-300 underline hover:text-white">
                    TextureLab
                  </Link>{' '}
                  to edit the graph.
                </p>
              </div>

              <a
                href={texture.license.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-lg bg-gray-900 p-3 text-sm ring-1 ring-white/10 hover:ring-gray-600"
              >
                <Scale className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span>
                  <span className="font-medium text-white">{texture.license.name}</span>
                  <span className="block text-gray-400">
                    Public domain. Use it for anything, commercial included, no attribution needed.
                  </span>
                </span>
              </a>

              <dl className="rounded-lg bg-gray-900 px-4 py-1 ring-1 ring-white/10">
                <Detail label="Resolution">
                  {texture.resolution} × {texture.resolution}
                  <span className="block text-xs text-gray-500">up to 4096 in the 3D preview</span>
                </Detail>
                <Detail label="Maps">
                  {texture.channels.map((spec) => CHANNEL_LABELS[spec.channel]).join(', ')}
                </Detail>
                <Detail label="Bit depth">
                  {sixteenBit.length === 0
                    ? '8-bit'
                    : sixteenBit.length === texture.channels.length
                      ? '16-bit'
                      : `8-bit, 16-bit ${sixteenBit.map((s) => CHANNEL_LABELS[s.channel].toLowerCase()).join(', ')}`}
                </Detail>
                <Detail label="Format">PNG</Detail>
                {texture.outputs.length > 0 && (
                  <Detail label="Maps size">{formatBytes(totalOutputBytes)}</Detail>
                )}
                <Detail label=".texture file">{formatBytes(texture.sourceBytes)}</Detail>
                <Detail label="Nodes">{texture.nodeCount}</Detail>
                {texture.variables.length > 0 && (
                  <Detail label="Parameters">{texture.variables.length}</Detail>
                )}
                {texture.presets.length > 0 && (
                  <Detail label="Variants">
                    {texture.presets.map((preset) => preset.name).join(', ')}
                  </Detail>
                )}
                <Detail label="Node library">{texture.libraryVersion}</Detail>
                {texture.appVersion && (
                  <Detail label="Made with">TextureLab {texture.appVersion}</Detail>
                )}
                <Detail label="Downloads">{texture.downloadCount}</Detail>
              </dl>

              {texture.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {texture.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/gallery?q=${encodeURIComponent(tag)}`}
                      className="rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </aside>
          </div>

          {texture.descriptionHtml && (
            <div
              className="markdown markdown-dark mt-8 max-w-3xl"
              dangerouslySetInnerHTML={{ __html: texture.descriptionHtml }}
            />
          )}

          {!live && texture.outputs.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 font-display text-2xl font-bold text-white">Maps</h2>
              <div className="overflow-x-auto rounded-lg bg-gray-900 ring-1 ring-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400">
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-2 font-medium">Map</th>
                      <th className="px-4 py-2 font-medium">Resolution</th>
                      <th className="px-4 py-2 font-medium">Bit depth</th>
                      <th className="px-4 py-2 font-medium">Channels</th>
                      <th className="px-4 py-2 font-medium">Size</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {texture.outputs.map((output, i) => (
                      <tr key={output.channel} className="border-b border-gray-800 last:border-0">
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => setLightbox(i)}
                            className="group flex items-center gap-3 text-white"
                          >
                            <span className="relative size-12 shrink-0 overflow-hidden rounded bg-gray-950">
                              <img
                                src={output.url}
                                alt=""
                                loading="lazy"
                                className="size-full object-cover"
                              />
                              <Maximize2 className="absolute inset-0 m-auto size-4 opacity-0 drop-shadow group-hover:opacity-100" />
                            </span>
                            {CHANNEL_LABELS[output.channel]}
                          </button>
                        </td>
                        <td className="px-4 py-2 tabular-nums">
                          {output.width} × {output.height}
                        </td>
                        <td className="px-4 py-2">{output.bitDepth}-bit</td>
                        <td className="px-4 py-2">
                          {COLOR_TYPE_LABELS[output.colorType] ?? output.colorType}
                        </td>
                        <td className="px-4 py-2 tabular-nums">{formatBytes(output.bytes)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => setLightbox(i)}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                              aria-label={`View ${CHANNEL_LABELS[output.channel]}`}
                            >
                              <Eye className="size-4" />
                            </button>
                            <a
                              href={output.url}
                              download={`${texture.slug}_${output.name}.png`}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                              aria-label={`Download ${CHANNEL_LABELS[output.channel]}`}
                            >
                              <Download className="size-4" />
                            </a>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-12 pb-6">
              <h2 className="mb-4 font-display text-2xl font-bold text-white">
                More {texture.category?.name.toLowerCase()}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {related.map((card) => (
                  <TextureCard key={card.id} texture={card} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <Lightbox items={outputItems} index={lightbox} onIndexChange={setLightbox} />
    </SiteLayout>
  )
}
