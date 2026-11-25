import { useState } from 'react'
import { useForm } from '@inertiajs/react'
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react'
import OpsLayout from '~/components/ops/ops_layout'
import TextureFields, {
  fieldsPayload,
  type CategoryOption,
  type TextureFieldValues,
} from '~/components/ops/texture_fields'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  CHANNEL_LABELS,
  COLOR_TYPE_LABELS,
  formatBytes,
  xsrfHeaders,
  type ChannelSpec,
  type VariableSummary,
} from '~/lib/textures'

type Metadata = {
  bytes: number
  libraryVersion: string
  appVersion: string | null
  resolution: number
  nodeCount: number
  connectionCount: number
  channels: ChannelSpec[]
  variables: VariableSummary[]
  presets: { id: string; name: string }[]
  warnings: string[]
}

export default function TextureCreate({ categories }: { categories: CategoryOption[] }) {
  const form = useForm<TextureFieldValues & { file: File | null }>({
    file: null,
    title: '',
    slug: '',
    categoryId: '',
    tags: '',
    featured: false,
    sortOrder: '0',
    description: '',
  })
  const [meta, setMeta] = useState<Metadata | null>(null)
  const [inspecting, setInspecting] = useState(false)
  const [inspectError, setInspectError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const errors = form.errors as Record<string, string | undefined>

  async function choose(file: File | undefined) {
    if (!file) return
    form.setData('file', file)
    setMeta(null)
    setInspectError(null)
    setInspecting(true)

    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/ops/textures/inspect', {
        method: 'POST',
        body,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...xsrfHeaders() },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? `Failed (${response.status})`)

      setMeta(payload.metadata)
      form.setData((data) => ({
        ...data,
        file,
        title: data.title || payload.title,
        slug: data.slug || payload.slug,
      }))
    } catch (error) {
      setInspectError((error as Error).message)
    } finally {
      setInspecting(false)
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    form.transform((data) => {
      // Multipart can't carry null; leave empty fields out instead.
      const payload: Record<string, unknown> = { ...fieldsPayload(data), file: data.file }
      for (const key of Object.keys(payload)) {
        if (payload[key] === null || payload[key] === undefined) delete payload[key]
      }
      return payload as never
    })
    form.post('/ops/textures', { forceFormData: true })
  }

  return (
    <OpsLayout title="Upload texture" description="Add a .texture file to the gallery">
      <form onSubmit={submit} className="grid max-w-4xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>.texture file</CardTitle>
            <CardDescription>
              Saved in TextureLab with its outputs assigned to channels. Up to 10 MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                choose(event.dataTransfer.files[0])
              }}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${
                dragging ? 'border-primary bg-accent' : 'hover:bg-accent'
              }`}
            >
              {inspecting ? (
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              ) : (
                <FileUp className="size-8 text-muted-foreground" />
              )}
              <span className="font-medium">
                {form.data.file ? form.data.file.name : 'Drop a .texture file, or click to choose'}
              </span>
              {form.data.file && (
                <span className="text-sm text-muted-foreground">
                  {formatBytes(form.data.file.size)}
                </span>
              )}
              <input
                type="file"
                accept=".texture,application/json"
                className="hidden"
                onChange={(event) => choose(event.target.files?.[0])}
              />
            </label>

            {(inspectError || errors.file) && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertTriangle className="size-4" />
                {inspectError ?? errors.file}
              </p>
            )}

            {meta && (
              <div className="grid gap-3 rounded-md border p-4 text-sm">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                  <span className="text-muted-foreground">Resolution</span>
                  <span>
                    {meta.resolution}×{meta.resolution}
                  </span>
                  <span className="text-muted-foreground">Nodes</span>
                  <span>
                    {meta.nodeCount} ({meta.connectionCount} connections)
                  </span>
                  <span className="text-muted-foreground">Library</span>
                  <span>{meta.libraryVersion}</span>
                  <span className="text-muted-foreground">Saved with</span>
                  <span>{meta.appVersion ? `TextureLab ${meta.appVersion}` : 'unknown'}</span>
                  <span className="text-muted-foreground">Parameters</span>
                  <span>{meta.variables.map((v) => v.displayName).join(', ') || 'none'}</span>
                  <span className="text-muted-foreground">Variants</span>
                  <span>{meta.presets.map((p) => p.name).join(', ') || 'none'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {meta.channels.map((spec) => (
                    <span key={spec.channel} className="rounded bg-muted px-2 py-1 text-xs">
                      {CHANNEL_LABELS[spec.channel]} · {spec.bitDepth}-bit{' '}
                      {COLOR_TYPE_LABELS[spec.colorType]}
                    </span>
                  ))}
                </div>
                {meta.warnings.map((warning) => (
                  <p
                    key={warning}
                    className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400"
                  >
                    <AlertTriangle className="size-4" />
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <TextureFields
              data={form.data}
              setData={form.setData}
              errors={errors}
              categories={categories}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!meta || form.processing}>
            {form.processing && <Loader2 className="size-4 animate-spin" />}
            Save draft and render
          </Button>
          <p className="text-sm text-muted-foreground">
            The outputs and a thumbnail are rendered in your browser on the next page.
          </p>
        </div>
      </form>
    </OpsLayout>
  )
}
