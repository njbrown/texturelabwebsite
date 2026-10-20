import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { AlertTriangle, Camera, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
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
import { Label } from '~/components/ui/label'
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
  const [lighting, setLighting] = useState<Lighting>(() => defaultLighting(environments))
  const [backdrop, setBackdrop] = useState<Backdrop>('transparent')
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
    if (autoRender || texture.outputsStale) renderAndUpload()
    else render(Math.min(texture.resolution, 1024))
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
                  <img src={output.url} alt="" className="aspect-square w-full object-cover" />
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
