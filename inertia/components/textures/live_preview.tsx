import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Download, FileArchive, Loader2, Maximize2, RotateCcw } from 'lucide-react'
import Lightbox, { type LightboxItem } from './lightbox'
import VariableControls, { type VariableValues } from './variable_controls'
import { usePreviewUrls, useTextureSession } from './use_texture_session'
import {
  CHANNEL_LABELS,
  COLOR_TYPE_LABELS,
  exportFileNames,
  formatBytes,
  type ChannelSpec,
  type EnvironmentOption,
  type Texture,
} from '~/lib/textures'
import type { MeshKind } from '~/lib/texture_engine'
import { defaultLighting, LightingSelect, viewerEnvironment, type Lighting } from './lighting'

const MESHES: { value: MeshKind; label: string }[] = [
  { value: 'sphere', label: 'Sphere' },
  { value: 'cube', label: 'Cube' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'plane', label: 'Plane' },
]

type Backdrop = 'blurred' | 'environment' | 'plain'

const BACKDROPS: { value: Backdrop; label: string }[] = [
  { value: 'blurred', label: 'Blurred' },
  { value: 'environment', label: 'Sharp' },
  { value: 'plain', label: 'Plain' },
]

/** Re-render this long after the last parameter change. */
const DEBOUNCE_MS = 120

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md bg-gray-800 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition ${
            value === option.value ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function readme(
  texture: Texture,
  resolution: number,
  preset: string | null,
  values: VariableValues
) {
  const lines = [
    texture.title,
    '='.repeat(texture.title.length),
    '',
    `Rendered in the browser with the TextureLab web runtime at ${resolution}x${resolution}.`,
    `License: ${texture.license.name} (${texture.license.url})`,
    `Source: ${typeof window !== 'undefined' ? window.location.origin : ''}/textures/${texture.slug}`,
  ]
  if (preset) lines.push(`Preset: ${preset}`)
  const entries = Object.entries(values).filter(([, v]) =>
    ['number', 'boolean', 'string'].includes(typeof v)
  )
  if (entries.length) {
    lines.push('', 'Parameters:')
    for (const [name, value] of entries) lines.push(`  ${name} = ${value}`)
  }
  return lines.join('\n') + '\n'
}

/**
 * The texture rendered live in the browser: a 3D preview, its parameters and
 * presets, and every output below it, each downloadable on its own or all
 * together as a zip. Mounted only when asked for, since it loads WebGL,
 * three.js and the runtime.
 */
export default function LivePreview({
  texture,
  environments,
}: {
  texture: Texture
  environments: EnvironmentOption[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { state, progress, outcome, renderError, render, engine, session, viewer } =
    useTextureSession(`/textures/${texture.slug}/source`, containerRef)

  const [resolution, setResolution] = useState(Math.min(texture.resolution, 1024))
  const [resolutions, setResolutions] = useState<number[]>([512, 1024, 2048])
  const [values, setValues] = useState<VariableValues>({})
  const [preset, setPreset] = useState<string>(texture.activePreset ?? '')
  const [mesh, setMesh] = useState<MeshKind>('sphere')
  const [lighting, setLighting] = useState<Lighting>(() => defaultLighting(environments))
  const [backdrop, setBackdrop] = useState<Backdrop>('blurred')
  const [lightingState, setLightingState] = useState<'loading' | 'ready' | 'failed'>('ready')
  const [tiling, setTiling] = useState(1)
  const [displacement, setDisplacement] = useState(0.05)
  const [previews, setPreviews] = usePreviewUrls()
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)
  const ready = state.status === 'ready'

  const fileNames = useMemo(() => {
    const pattern = session.current?.doc.exportFilePattern ?? '${project}_${name}'
    const names = exportFileNames(
      pattern,
      texture.slug,
      texture.channels.map((spec) => spec.name)
    )
    return Object.fromEntries(texture.channels.map((spec, i) => [spec.channel, names[i]]))
    // The pattern comes from the session, which is only set once ready.
  }, [texture, ready])

  const refreshPreviews = useCallback(async () => {
    const current = session.current
    if (!current) return
    const next: Record<string, string> = {}
    for (const spec of texture.channels) {
      const url = await current.previewUrl(spec.channel)
      if (url) next[spec.channel] = url
    }
    setPreviews(next)
  }, [session, texture.channels, setPreviews])

  const rerender = useCallback(
    async (size: number) => {
      const result = await render(size)
      if (result) await refreshPreviews()
    },
    [render, refreshPreviews]
  )

  // First render once everything has loaded.
  useEffect(() => {
    if (!ready) return
    setResolutions(engine.current!.resolutionOptions())
    setValues(session.current!.values())
    rerender(resolution)
  }, [ready])

  function scheduleRender(size = resolution) {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => rerender(size), DEBOUNCE_MS)
  }

  useEffect(() => () => clearTimeout(debounce.current), [])

  function changeVariable(name: string, value: unknown) {
    session.current?.setVariable(name, value as never)
    setValues(session.current?.values() ?? {})
    setPreset('')
    scheduleRender()
  }

  function changePreset(id: string) {
    setPreset(id)
    if (id) session.current?.applyPreset(id)
    else session.current?.reset()
    setValues(session.current?.values() ?? {})
    scheduleRender()
  }

  function reset() {
    session.current?.reset()
    setValues(session.current?.values() ?? {})
    setPreset('')
    scheduleRender()
  }

  function changeResolution(size: number) {
    setResolution(size)
    scheduleRender(size)
  }

  // Viewer settings.
  useEffect(() => viewer.current?.setMesh(mesh), [mesh, ready, viewer])
  useEffect(() => viewer.current?.setTiling(tiling), [tiling, ready, viewer])
  useEffect(() => viewer.current?.setDisplacementScale(displacement), [displacement, ready, viewer])
  useEffect(() => {
    const current = viewer.current
    if (!current || !engine.current) return
    let failed = false
    const off = current.on('environmentError', () => (failed = true))
    setLightingState('loading')
    current
      .setEnvironment(viewerEnvironment(lighting, environments, engine.current))
      .then(() => setLightingState(failed ? 'failed' : 'ready'))
    return off
  }, [lighting, environments, ready, viewer, engine])
  useEffect(
    () => viewer.current?.setBackground(backdrop === 'plain' ? '#111827' : backdrop),
    [backdrop, ready, viewer]
  )

  function downloadOne(spec: ChannelSpec) {
    const bytes = session.current?.encode(spec)
    if (bytes) engine.current!.downloadBlob(bytes, fileNames[spec.channel], 'image/png')
  }

  async function downloadZip() {
    const current = session.current
    if (!current || !outcome) return
    setBusy('Packing zip…')
    // Let the label paint before the synchronous encode.
    await new Promise((resolve) => setTimeout(resolve, 30))
    try {
      const files = texture.channels
        .map((spec) => ({ name: fileNames[spec.channel], bytes: current.encode(spec) }))
        .filter((file): file is { name: string; bytes: Uint8Array } => Boolean(file.bytes))
      const presetName = texture.presets.find((p) => p.id === preset)?.name ?? null
      const zip = engine.current!.zipFiles(
        files,
        readme(texture, outcome.resolution, presetName, values)
      )
      engine.current!.downloadBlob(
        zip,
        `${texture.slug}_${outcome.resolution}.zip`,
        'application/zip'
      )
    } finally {
      setBusy(null)
    }
  }

  const lightboxItems: LightboxItem[] = texture.channels
    .filter((spec) => previews[spec.channel])
    .map((spec) => ({
      key: spec.channel,
      src: previews[spec.channel],
      title: CHANNEL_LABELS[spec.channel],
      details: [
        `${outcome?.resolution ?? resolution}×${outcome?.resolution ?? resolution}`,
        `${spec.bitDepth}-bit ${COLOR_TYPE_LABELS[spec.colorType]}`,
        'PNG',
      ],
      actions: (
        <button
          type="button"
          onClick={() => downloadOne(spec)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-gray-950 hover:bg-blue-300"
        >
          <Download className="size-4" />
          {fileNames[spec.channel]}
        </button>
      ),
    }))

  const rendering = progress !== null
  const percent =
    progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  if (state.status === 'unsupported') {
    return (
      <div className="rounded-lg bg-gray-800 p-6 text-gray-300">
        Your browser doesn't support WebGL2, which the live preview needs. The images and downloads
        above still work.
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-red-950 p-6 text-red-200">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <span>The live preview couldn't load: {state.message}</span>
      </div>
    )
  }

  const warnings = outcome?.warnings ?? []

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* 3D view */}
        <div className="overflow-hidden rounded-lg bg-gray-950 ring-1 ring-white/10">
          {/* Sized to the window, so the view and its controls fit without scrolling. */}
          <div className="relative aspect-square max-h-[max(280px,calc(100svh-17rem))] w-full">
            <div ref={containerRef} className="absolute inset-0 [&>canvas]:size-full" />

            {(!ready || rendering) && (
              <div className="pointer-events-none absolute inset-x-0 top-0">
                <div
                  className="h-1 bg-brand transition-all"
                  style={{ width: `${ready ? percent : 5}%` }}
                />
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300">
                  <Loader2 className="size-3.5 animate-spin" />
                  {ready ? `Rendering ${percent}%` : 'Loading the renderer…'}
                </div>
              </div>
            )}
            {ready && !rendering && lightingState !== 'ready' && (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 px-3 py-2 text-xs text-gray-200">
                {lightingState === 'loading' ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Loading lighting…
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-3.5 text-amber-400" /> That HDRI couldn't be
                    loaded; showing the daylight sky.
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-800 px-3 py-2">
            <Segmented label="Mesh" value={mesh} options={MESHES} onChange={setMesh} />
            <LightingSelect
              value={lighting}
              onChange={setLighting}
              environments={environments}
              className="max-w-40 rounded-md border-0 bg-gray-800 px-2 py-1 text-xs text-gray-200"
            />
            <select
              aria-label="Background"
              className="rounded-md border-0 bg-gray-800 px-2 py-1 text-xs text-gray-200"
              value={backdrop}
              onChange={(event) => setBackdrop(event.target.value as Backdrop)}
            >
              {BACKDROPS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} background
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              Tiling
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={tiling}
                onChange={(event) => setTiling(Number(event.target.value))}
                className="w-20 accent-brand"
              />
              <span className="w-3 tabular-nums text-gray-300">{tiling}</span>
            </label>
            {texture.channels.some((c) => c.channel === 'height') && (
              <label className="flex items-center gap-1.5 text-xs text-gray-400">
                Displacement
                <input
                  type="range"
                  min={0}
                  max={0.2}
                  step={0.005}
                  value={displacement}
                  onChange={(event) => setDisplacement(Number(event.target.value))}
                  className="w-20 accent-brand"
                />
              </label>
            )}
          </div>
        </div>

        {/* Parameters */}
        <aside className="grid content-start gap-5 rounded-lg bg-gray-800 p-4 ring-1 ring-white/10">
          <div className="grid gap-1.5">
            <label htmlFor="render-resolution" className="text-sm font-medium text-white">
              Resolution
            </label>
            <select
              id="render-resolution"
              className="rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
              value={resolution}
              disabled={!ready}
              onChange={(event) => changeResolution(Number(event.target.value))}
            >
              {resolutions.map((size) => (
                <option key={size} value={size}>
                  {size} × {size}
                  {size === texture.resolution ? ' (saved)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Downloads use this resolution.</p>
          </div>

          {texture.presets.length > 0 && (
            <div className="grid gap-1.5">
              <label htmlFor="render-preset" className="text-sm font-medium text-white">
                Variant
              </label>
              <select
                id="render-preset"
                className="rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
                value={preset}
                disabled={!ready}
                onChange={(event) => changePreset(event.target.value)}
              >
                <option value="">Custom</option>
                {texture.presets.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Parameters</h3>
              {texture.variables.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  disabled={!ready}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              )}
            </div>
            <VariableControls
              variables={texture.variables}
              values={values}
              onChange={changeVariable}
              disabled={!ready}
            />
          </div>

          {outcome && (
            <p className="text-xs text-gray-500">
              Rendered in {Math.round(outcome.timeMs)} ms on your GPU.
            </p>
          )}
        </aside>
      </div>

      {(renderError || warnings.length > 0) && (
        <div className="rounded-lg bg-amber-950/60 px-4 py-3 text-sm text-amber-200">
          {renderError && <p>Rendering failed: {renderError}</p>}
          {warnings.slice(0, 5).map((warning, i) => (
            <p key={i}>{warning.message}</p>
          ))}
        </div>
      )}

      {/* Outputs */}
      <div className="rounded-lg bg-gray-800 p-4 ring-1 ring-white/10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-white">
            Outputs
            {outcome && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {outcome.resolution}×{outcome.resolution}, with your changes
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={downloadZip}
            disabled={!outcome || rendering || busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-gray-950 hover:bg-blue-300 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileArchive className="size-4" />
            )}
            {busy ?? 'Download all (.zip)'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {texture.channels.map((spec) => {
            const index = lightboxItems.findIndex((item) => item.key === spec.channel)
            return (
              <div key={spec.channel} className="overflow-hidden rounded-md bg-gray-900">
                <button
                  type="button"
                  disabled={index < 0}
                  onClick={() => setLightbox(index)}
                  className="group relative block aspect-square w-full bg-gray-950"
                  aria-label={`View ${CHANNEL_LABELS[spec.channel]}`}
                >
                  {previews[spec.channel] ? (
                    <img src={previews[spec.channel]} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center">
                      <Loader2 className="size-5 animate-spin text-gray-600" />
                    </span>
                  )}
                  <Maximize2 className="absolute top-2 right-2 size-4 text-white opacity-0 drop-shadow group-hover:opacity-100" />
                </button>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">
                      {CHANNEL_LABELS[spec.channel]}
                    </div>
                    <div className="text-xs text-gray-500">
                      {spec.bitDepth}-bit {COLOR_TYPE_LABELS[spec.colorType]}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadOne(spec)}
                    disabled={!outcome || rendering}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-40"
                    aria-label={`Download ${CHANNEL_LABELS[spec.channel]}`}
                    title={fileNames[spec.channel]}
                  >
                    <Download className="size-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          PNG, in each output's format from the .texture file. The default render at the saved
          resolution is about{' '}
          {formatBytes(texture.outputs.reduce((sum, output) => sum + output.bytes, 0))} in total.
        </p>
      </div>

      <Lightbox items={lightboxItems} index={lightbox} onIndexChange={setLightbox} />
    </div>
  )
}
