import { useEffect, useRef, useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import { AlertTriangle, Camera, Link2, Loader2, Plus, Star, Trash2, Upload } from 'lucide-react'
import OpsLayout from '~/components/ops/ops_layout'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { formatBytes, xsrfHeaders, type EnvironmentOption } from '~/lib/textures'
import type { TextureViewer } from '~/lib/texture_engine'

type Engine = typeof import('~/lib/texture_engine')

const THUMB_SIZE = 512

function AddForm() {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const form = useForm<{ name: string; url: string; file: File | null }>({
    name: '',
    url: '',
    file: null,
  })
  const errors = form.errors as Record<string, string | undefined>

  function chooseFile(file: File | undefined) {
    if (!file) return
    form.setData((data) => ({
      ...data,
      file,
      name: data.name || file.name.replace(/\.(hdr|exr)$/i, '').replace(/[_-]+/g, ' '),
    }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    form.transform((data) =>
      mode === 'upload'
        ? { name: data.name, file: data.file }
        : ({ name: data.name, url: data.url } as never)
    )
    form.post('/ops/environments', {
      forceFormData: mode === 'upload',
      onSuccess: () => form.reset(),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add an HDRI</CardTitle>
        <CardDescription>
          Equirectangular <code>.hdr</code> or <code>.exr</code>. 1K–2K is plenty for lighting a
          preview and keeps pages fast. Uploads up to 100 MB are served by the site; a link must
          allow cross-origin requests (Poly Haven's do).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4">
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={mode === 'upload' ? 'secondary' : 'ghost'}
              onClick={() => setMode('upload')}
            >
              <Upload className="size-4" /> Upload
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'url' ? 'secondary' : 'ghost'}
              onClick={() => setMode('url')}
            >
              <Link2 className="size-4" /> Link
            </Button>
          </div>

          {mode === 'upload' ? (
            <div className="grid gap-2">
              <Label htmlFor="hdri-file">File</Label>
              <Input
                key="file"
                id="hdri-file"
                type="file"
                accept=".hdr,.exr"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="hdri-url">Link</Label>
              <Input
                key="url"
                id="hdri-url"
                placeholder="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr"
                value={form.data.url}
                onChange={(event) => form.setData('url', event.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="hdri-name">Name</Label>
            <Input
              id="hdri-name"
              placeholder="Studio"
              value={form.data.name}
              onChange={(event) => form.setData('name', event.target.value)}
              aria-invalid={Boolean(errors.name)}
            />
          </div>

          {(errors.file || errors.url || errors.name) && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="size-4" />
              {errors.file ?? errors.url ?? errors.name}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={
                form.processing ||
                !form.data.name.trim() ||
                (mode === 'upload' ? !form.data.file : !form.data.url.trim())
              }
            >
              {form.processing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add
            </Button>
            {form.progress && (
              <span className="text-sm text-muted-foreground">
                Uploading {form.progress.percentage}%
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Shows the selected HDRI around a plain sphere, and saves that view as its
 * thumbnail (automatically, the first time one without a thumbnail loads).
 */
function Preview({ environment }: { environment: EnvironmentOption | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const viewerRef = useRef<TextureViewer | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoSaved = useRef(new Set<number>())

  useEffect(() => {
    let cancelled = false
    import('~/lib/texture_engine').then((engine) => {
      if (cancelled || !containerRef.current) return
      engineRef.current = engine
      viewerRef.current = engine.createViewer(containerRef.current, {
        mesh: 'sphere',
        background: 'environment',
      })
      setState('ready')
    })
    return () => {
      cancelled = true
      viewerRef.current?.dispose()
      viewerRef.current = null
    }
  }, [])

  async function saveThumbnail(target: EnvironmentOption) {
    const viewer = viewerRef.current
    if (!viewer || !engineRef.current) return
    setSaving(true)
    setError(null)
    try {
      const blob = await engineRef.current.captureOpaque(viewer, THUMB_SIZE)
      const body = new FormData()
      body.append('image', new File([blob], 'thumbnail.png', { type: 'image/png' }))
      const response = await fetch(`/ops/environments/${target.id}/thumbnail`, {
        method: 'POST',
        body,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...xsrfHeaders() },
      })
      if (!response.ok) throw new Error(`Saving failed (${response.status})`)
      router.reload()
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !environment) return
    let failed = false
    const off = viewer.on('environmentError', () => (failed = true))
    setState('loading')
    viewer
      .setEnvironment({
        type: environment.format,
        url: new URL(environment.url, location.href).toString(),
      })
      .then(() => {
        setState(failed ? 'failed' : 'ready')
        if (!failed && !environment.thumbUrl && !autoSaved.current.has(environment.id)) {
          autoSaved.current.add(environment.id)
          saveThumbnail(environment)
        }
      })
    return off
    // saveThumbnail only reads refs
  }, [environment?.id, state === 'idle'])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{environment ? environment.name : 'Preview'}</CardTitle>
        <CardDescription>
          {environment ? 'Drag to look around. The thumbnail is this view.' : 'Select an HDRI.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="relative aspect-square overflow-hidden rounded-md bg-neutral-900">
          <div ref={containerRef} className="absolute inset-0 [&>canvas]:size-full" />
          {state === 'loading' && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 text-xs text-white">
              <Loader2 className="size-3 animate-spin" /> Loading…
            </div>
          )}
        </div>
        {state === 'failed' && (
          <p className="flex items-start gap-1.5 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Couldn't load this HDRI. A link has to allow cross-origin requests and point straight at
            the file.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          variant="outline"
          disabled={!environment || state !== 'ready' || saving}
          onClick={() => environment && saveThumbnail(environment)}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Save view as thumbnail
        </Button>
      </CardContent>
    </Card>
  )
}

export default function EnvironmentsIndex({
  environments,
  selected,
}: {
  environments: EnvironmentOption[]
  selected: number | null
}) {
  const [selectedId, setSelectedId] = useState<number | null>(
    selected ?? environments[0]?.id ?? null
  )
  const current = environments.find((environment) => environment.id === selectedId) ?? null

  useEffect(() => {
    if (selected) setSelectedId(selected)
  }, [selected])

  function remove(environment: EnvironmentOption) {
    if (window.confirm(`Delete ${environment.name}?`)) {
      router.delete(`/ops/environments/${environment.id}`, { preserveScroll: true })
    }
  }

  return (
    <OpsLayout title="Environments" description="HDRIs for lighting the 3D previews">
      <div className="grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-4">
          <Card>
            <CardContent className="p-0">
              {environments.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">
                  No HDRIs yet. The 3D previews use the built-in skies until you add one.
                </p>
              ) : (
                <ul className="divide-y">
                  {environments.map((environment, index) => (
                    <li
                      key={environment.id}
                      className={`flex items-center gap-3 p-3 ${
                        environment.id === selectedId ? 'bg-accent' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(environment.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {environment.thumbUrl ? (
                          <img
                            src={environment.thumbUrl}
                            alt=""
                            className="size-14 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span className="size-14 shrink-0 rounded bg-muted" />
                        )}
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-medium">
                            {environment.name}
                            {environment.isDefault && <Badge>Default</Badge>}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            .{environment.format} ·{' '}
                            {environment.source === 'upload'
                              ? `uploaded, ${formatBytes(environment.bytes ?? 0)}`
                              : new URL(environment.url).host}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={environment.isDefault}
                          title="Make default"
                          aria-label="Make default"
                          onClick={() =>
                            router.put(
                              `/ops/environments/${environment.id}`,
                              { isDefault: true },
                              { preserveScroll: true }
                            )
                          }
                        >
                          <Star className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === 0}
                          aria-label="Move up"
                          onClick={() => {
                            const above = environments[index - 1]
                            router.put(
                              `/ops/environments/${environment.id}`,
                              { sortOrder: above.sortOrder - 1 },
                              { preserveScroll: true }
                            )
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          aria-label="Delete"
                          onClick={() => remove(environment)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <AddForm />
        </div>

        <Preview environment={current} />
      </div>
    </OpsLayout>
  )
}
