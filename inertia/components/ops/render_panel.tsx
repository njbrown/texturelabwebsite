import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { AlertTriangle, Camera, CheckCircle2, Dices, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useTextureSession } from '~/components/textures/use_texture_session'
import {
  defaultLighting,
  LightingSelect,
  viewerEnvironment,
  type Lighting,
} from '~/components/textures/lighting'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useStoredState } from '~/lib/use_stored_state'
import {
  CHANNEL_LABELS,
  formatBytes,
  xsrfHeaders,
  type EnvironmentOption,
  type Texture,
} from '~/lib/textures'

/** Square size of the captured preview image. */
const CAPTURE_SIZE = 2048

/** What's behind the mesh in a captured image. */
type Backdrop = 'transparent' | 'blurred' | 'environment'

const BACKDROPS: { value: Backdrop; label: string }[] = [
  { value: 'transparent', label: 'Transparent' },
  { value: 'blurred', label: 'HDRI, blurred' },
  { value: 'environment', label: 'HDRI, sharp' },
]

/** Camera zoom for the preview and captures; a little closer than the viewer's default. */
const DEFAULT_ZOOM = 1.25
const MIN_ZOOM = 0.75
const MAX_ZOOM = 2.5

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
/** Resolutions the preview can render the texture at; the GPU may cap them. */
const TEXTURE_SIZES = [512, 1024, 2048, 4096]
const DEFAULT_TEXTURE_SIZE = 2048
const isTextureSize = (value: unknown): value is number => TEXTURE_SIZES.includes(value as number)

const isBackdrop = (value: unknown): value is Backdrop =>
  BACKDROPS.some((option) => option.value === value)

type Step = 'idle' | 'rendering' | 'uploading' | 'capturing' | 'done'

async function post(url: string, body: FormData) {
  const response = await fetch(url, {
    method: 'POST',
    body,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...xsrfHeaders() },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error ?? `Upload failed (${response.status})`)
  }
  return response.json()
}

/**
 * The server can't run WebGL, so the default outputs are rendered here, in
 * the admin's browser, at the file's saved resolution, and uploaded as PNGs.
 * The 3D preview can be captured as the gallery thumbnail.
 */
export default function RenderPanel({
  texture,
  environments,
  autoRender,
}: {
  texture: Texture
  environments: EnvironmentOption[]
  autoRender: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { state, progress, outcome, renderError, render, engine, session, viewer } =
    useTextureSession(`/ops/textures/${texture.id}/source`, containerRef)
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  // Remembered in this browser: framing for every texture, the seed per texture.
  const [lighting, setLighting] = useStoredState<Lighting>(
    'ops.capture.lighting',
    defaultLighting(environments),
    (value): value is Lighting =>
      typeof value === 'string' &&
      (!value.startsWith('hdri:') || environments.some((e) => `hdri:${e.id}` === value))
  )
  const [backdrop, setBackdrop] = useStoredState<Backdrop>(
    'ops.capture.background',
    'transparent',
    isBackdrop
  )
  const [zoom, setZoom] = useStoredState('ops.capture.zoom', DEFAULT_ZOOM, isNumber)
  /** null: the file's own seed. */
  const [seed, setSeed] = useStoredState<number | null>(
    `ops.capture.seed.${texture.id}`,
    null,
    (value): value is number | null => value === null || isNumber(value)
  )
  const fileSeed = useRef(0)
  const [textureSize, setTextureSize] = useStoredState(
    'ops.capture.textureSize',
    DEFAULT_TEXTURE_SIZE,
    isTextureSize
  )
  const [sizeOptions, setSizeOptions] = useState(TEXTURE_SIZES)
  const previewSize = Math.min(textureSize, Math.max(...sizeOptions))
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [lightingState, setLightingState] = useState<'loading' | 'ready' | 'failed'>('ready')
  const started = useRef(false)
  const ready = state.status === 'ready'

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

  useEffect(() => {
    const current = viewer.current
    if (!current) return
    current.camera.zoom = zoom
    current.camera.updateProjectionMatrix()
    current.requestRender()
  }, [zoom, ready, viewer])

  /** Render the preview with the chosen seed (the saved maps use the file's). */
  function renderPreview() {
    const doc = session.current?.doc
    if (!doc) return
    doc.randomSeed = seed ?? fileSeed.current
    return render(previewSize)
  }

  // Re-render shortly after the seed or size stops changing.
  useEffect(() => {
    if (!started.current || (step !== 'idle' && step !== 'done')) return
    clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(renderPreview, 250)
    return () => clearTimeout(previewTimer.current)
    // renderPreview reads the latest values through this effect's run.
  }, [seed, previewSize])

  // A transparent capture still shows the blurred HDRI while framing the shot.
  useEffect(
    () => viewer.current?.setBackground(backdrop === 'transparent' ? 'blurred' : backdrop),
    [backdrop, ready, viewer]
  )

  async function capture(makePrimary: boolean) {
    const current = viewer.current
    if (!current) return

    const blob =
      backdrop === 'transparent'
        ? await engine.current!.captureTransparent(current, CAPTURE_SIZE)
        : await engine.current!.captureOpaque(current, CAPTURE_SIZE)

    const body = new FormData()
    body.append('image', new File([blob], 'render.png', { type: 'image/png' }))
    body.append('source', 'render')
    body.append('alt', `${texture.title} rendered on a sphere`)
    if (makePrimary) body.append('makePrimary', '1')
    await post(`/ops/textures/${texture.id}/images`, body)
  }

  async function renderAndUpload() {
    const current = session.current
    if (!current) return
    setError(null)

    try {
      setStep('rendering')
      // The saved maps are the file as it is, whatever seed the preview uses.
      current.doc.randomSeed = fileSeed.current
      const result = await render(texture.resolution)
      if (!result) {
        setStep('idle')
        return
      }

      setStep('uploading')
      const body = new FormData()
      for (const spec of texture.channels) {
        const bytes = current.encode(spec)
        if (!bytes) throw new Error(`The ${spec.channel} channel didn't render`)
        body.append(
          `output_${spec.channel}`,
          new File([bytes as BlobPart], `${spec.channel}.png`, { type: 'image/png' })
        )
      }
      body.append('sourceSha256', texture.sourceSha256)
      body.append('renderTargetFormat', current.renderTargetFormat)
      body.append('warnings', JSON.stringify(result.warnings.map((w) => w.message)))
      await post(`/ops/textures/${texture.id}/outputs`, body)

      if (texture.images.length === 0) {
        setStep('capturing')
        await capture(true)
      }

      setStep('done')
      // Back to the preview's own seed and size.
      if ((seed !== null && seed !== fileSeed.current) || previewSize !== texture.resolution) {
        await renderPreview()
      }
      router.reload()
    } catch (failure) {
      setError((failure as Error).message)
      setStep('idle')
    }
  }

  async function captureOnly() {
    setError(null)
    setStep('capturing')
    try {
      await capture(false)
      setStep('done')
      router.reload()
    } catch (failure) {
      setError((failure as Error).message)
      setStep('idle')
    }
  }

  // Preview straight away; render and upload too when arriving from an upload.
  useEffect(() => {
    if (!ready || started.current) return
    started.current = true
    fileSeed.current = session.current!.doc.randomSeed
    setSizeOptions(engine.current!.resolutionOptions())
    if (autoRender || texture.outputsStale) renderAndUpload()
    else renderPreview()
    // Runs once, when the runtime is ready.
  }, [ready])

  const busy = step === 'rendering' || step === 'uploading' || step === 'capturing'
  const percent =
    progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const totalBytes = texture.outputs.reduce((sum, output) => sum + output.bytes, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Outputs
          {texture.outputsRevision === 0 ? (
            <Badge variant="outline">Not rendered</Badge>
          ) : texture.outputsStale ? (
            <Badge variant="destructive">Out of date</Badge>
          ) : (
            <Badge variant="secondary">Rendered · revision {texture.outputsRevision}</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Rendered in this browser at {texture.resolution}×{texture.resolution} and stored as the
          maps shown on the public page.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-md bg-neutral-900">
          <div ref={containerRef} className="absolute inset-0 [&>canvas]:size-full" />
          {(state.status === 'loading' || progress) && (
            <div className="absolute inset-x-0 top-0">
              <div className="h-1 bg-blue-500 transition-all" style={{ width: `${percent}%` }} />
              <div className="flex items-center gap-1.5 p-2 text-xs text-white">
                <Loader2 className="size-3 animate-spin" />
                {state.status === 'loading' ? 'Loading renderer…' : `Rendering ${percent}%`}
              </div>
            </div>
          )}
          {state.status === 'unsupported' && (
            <p className="absolute inset-0 flex items-center p-4 text-center text-sm text-white">
              This browser has no WebGL2, so it can't render outputs.
            </p>
          )}
        </div>

        <div className="grid content-start gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="capture-lighting">Lighting</Label>
              <LightingSelect
                id="capture-lighting"
                value={lighting}
                onChange={setLighting}
                environments={environments}
                className="h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="capture-backdrop">Image background</Label>
              <select
                id="capture-backdrop"
                className="h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
                value={backdrop}
                onChange={(event) => setBackdrop(event.target.value as Backdrop)}
              >
                {BACKDROPS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="capture-texture-size">Texture size</Label>
              <select
                id="capture-texture-size"
                className="h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
                value={previewSize}
                onChange={(event) => setTextureSize(Number(event.target.value))}
              >
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} × {size}
                    {size === texture.resolution ? ' (saved)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="capture-zoom">Zoom</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground tabular-nums hover:text-foreground"
                  onClick={() => setZoom(DEFAULT_ZOOM)}
                  title="Reset zoom"
                >
                  {zoom.toFixed(2)}×
                </button>
              </div>
              <input
                id="capture-zoom"
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="h-9 w-full accent-primary"
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="capture-seed">Random seed</Label>
                {seed !== null && seed !== fileSeed.current && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSeed(null)}
                  >
                    Use file's ({fileSeed.current})
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  id="capture-seed"
                  type="number"
                  step={1}
                  value={seed ?? fileSeed.current}
                  disabled={!ready}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10)
                    if (Number.isFinite(next)) setSeed(next)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!ready}
                  onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                  aria-label="Random seed"
                  title="Random seed"
                >
                  <Dices className="size-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Texture size, zoom and seed change the preview and captured images only; saved maps
              always use the file's resolution and seed. These settings are remembered in this
              browser.
            </p>
            {lightingState !== 'ready' && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:col-span-2">
                {lightingState === 'loading' ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> Loading lighting…
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-3 text-amber-600" /> That HDRI couldn't be loaded
                    (for a link, the host must allow cross-origin requests).
                  </>
                )}
              </p>
            )}
            {environments.length === 0 && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Add HDRIs under{' '}
                <a href="/ops/environments" className="underline">
                  Environments
                </a>
                .
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={renderAndUpload} disabled={!ready || busy}>
              {step === 'rendering' || step === 'uploading' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {step === 'rendering'
                ? 'Rendering…'
                : step === 'uploading'
                  ? 'Uploading…'
                  : 'Render and save outputs'}
            </Button>
            <Button
              variant="outline"
              onClick={captureOnly}
              disabled={!ready || busy || !outcome || lightingState === 'loading'}
            >
              {step === 'capturing' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              Capture preview as image
            </Button>
          </div>

          {step === 'done' && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4" /> Saved
            </p>
          )}
          {(error || renderError || state.status === 'error') && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {error ?? renderError ?? (state.status === 'error' ? state.message : '')}
            </p>
          )}
          {outcome && outcome.warnings.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-amber-700 dark:text-amber-400">
              {outcome.warnings.map((warning, i) => (
                <li key={i}>{warning.message}</li>
              ))}
            </ul>
          )}

          {texture.outputs.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {texture.outputs.map((output) => (
                <a
                  key={output.channel}
                  href={output.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="overflow-hidden rounded border text-xs hover:ring-2 hover:ring-ring"
                >
                  <img src={output.thumbUrl} alt="" className="aspect-square w-full object-cover" />
                  <div className="px-1.5 py-1">
                    <div className="font-medium">{CHANNEL_LABELS[output.channel]}</div>
                    <div className="text-muted-foreground">
                      {output.bitDepth}-bit · {formatBytes(output.bytes)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
          {texture.outputs.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatBytes(totalBytes)} in total. Drag the preview to rotate it before capturing.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
