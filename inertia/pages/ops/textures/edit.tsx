import { useRef, useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import { AlertTriangle, ExternalLink, EyeOff, FileUp, Loader2, Rocket, Trash2 } from 'lucide-react'
import OpsLayout from '~/components/ops/ops_layout'
import RenderPanel from '~/components/ops/render_panel'
import TextureFields, {
  fieldsPayload,
  type CategoryOption,
  type TextureFieldValues,
} from '~/components/ops/texture_fields'
import TextureImages from '~/components/ops/texture_images'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  CHANNEL_LABELS,
  COLOR_TYPE_LABELS,
  formatBytes,
  formatDate,
  type EnvironmentOption,
  type Texture,
} from '~/lib/textures'

type EditProps = {
  texture: Texture
  categories: CategoryOption[]
  problems: string[]
  environments: EnvironmentOption[]
  autoRender: boolean
}

function DetailsForm({ texture, categories }: { texture: Texture; categories: CategoryOption[] }) {
  const form = useForm<TextureFieldValues>({
    title: texture.title,
    slug: texture.slug,
    categoryId: texture.category ? String(texture.category.id) : '',
    tags: texture.tags.join(', '),
    featured: texture.featured,
    sortOrder: String(texture.sortOrder),
    description: texture.description,
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    form.transform((data) => fieldsPayload(data) as never)
    form.put(`/ops/textures/${texture.id}`, { preserveScroll: true })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4">
          <TextureFields
            data={form.data}
            setData={form.setData}
            errors={form.errors as Record<string, string>}
            categories={categories}
          />
          <div>
            <Button type="submit" disabled={form.processing || !form.isDirty}>
              {form.processing && <Loader2 className="size-4 animate-spin" />}
              Save details
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function SourceCard({ texture }: { texture: Texture }) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const errors = (usePage().props.errors ?? {}) as Record<string, string | undefined>

  function replace(file: File | undefined) {
    if (!file) return
    setUploading(true)
    router.post(
      `/ops/textures/${texture.id}/source`,
      { file },
      { forceFormData: true, onFinish: () => setUploading(false) }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>.texture file</CardTitle>
        <CardDescription>
          {texture.sourceName} · {formatBytes(texture.sourceBytes)} ·{' '}
          <span className="font-mono">{texture.sourceSha256.slice(0, 12)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <dt className="text-muted-foreground">Resolution</dt>
          <dd>
            {texture.resolution}×{texture.resolution}
          </dd>
          <dt className="text-muted-foreground">Nodes</dt>
          <dd>
            {texture.nodeCount} ({texture.connectionCount} connections)
          </dd>
          <dt className="text-muted-foreground">Library</dt>
          <dd>{texture.libraryVersion}</dd>
          <dt className="text-muted-foreground">Saved with</dt>
          <dd>{texture.appVersion ? `TextureLab ${texture.appVersion}` : 'unknown'}</dd>
          <dt className="text-muted-foreground">Parameters</dt>
          <dd>{texture.variables.map((v) => v.displayName).join(', ') || 'none'}</dd>
          <dt className="text-muted-foreground">Variants</dt>
          <dd>{texture.presets.map((p) => p.name).join(', ') || 'none'}</dd>
          <dt className="text-muted-foreground">Downloads</dt>
          <dd>{texture.downloadCount}</dd>
        </dl>

        <div className="flex flex-wrap gap-2">
          {texture.channels.map((spec) => (
            <span key={spec.channel} className="rounded bg-muted px-2 py-1 text-xs">
              {CHANNEL_LABELS[spec.channel]} → {spec.name}.png · {spec.bitDepth}-bit{' '}
              {COLOR_TYPE_LABELS[spec.colorType]}
            </span>
          ))}
        </div>

        {texture.warnings.length > 0 && (
          <ul className="grid gap-1 text-sm text-amber-700 dark:text-amber-400">
            {texture.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {warning}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3">
          <input
            ref={input}
            type="file"
            accept=".texture,application/json"
            className="hidden"
            onChange={(event) => replace(event.target.files?.[0])}
          />
          <Button variant="outline" onClick={() => input.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            Replace file
          </Button>
          <a
            href={`/textures/${texture.slug}/download`}
            className="text-sm text-muted-foreground underline"
          >
            Download current file
          </a>
          {errors.file && <p className="text-sm text-destructive">{errors.file}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function TextureEdit({
  texture,
  categories,
  problems,
  environments,
  autoRender,
}: EditProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const errors = (usePage().props.errors ?? {}) as Record<string, string | undefined>
  const published = texture.status === 'published'

  return (
    <OpsLayout
      title={texture.title}
      description={
        published ? `Published ${formatDate(texture.publishedAt)}` : 'Draft · only visible to you'
      }
      actions={
        <>
          {published ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge>}
          <Button asChild size="sm" variant="outline">
            <a href={`/textures/${texture.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              {published ? 'View' : 'Preview'}
            </a>
          </Button>
          {published ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.post(`/ops/textures/${texture.id}/unpublish`)}
            >
              <EyeOff className="size-4" />
              Unpublish
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={problems.length > 0}
              onClick={() => router.post(`/ops/textures/${texture.id}/publish`)}
            >
              <Rocket className="size-4" />
              Publish
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete texture"
          >
            <Trash2 className="size-4" />
          </Button>
        </>
      }
    >
      {!published && (problems.length > 0 || errors.publish) && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Before publishing</p>
            {(errors.publish ? [errors.publish] : problems).map((problem) => (
              <p key={problem}>{problem}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid max-w-5xl gap-4">
        {/* Keyed so a replaced file starts a fresh render session. */}
        <RenderPanel
          key={texture.sourceSha256}
          texture={texture}
          environments={environments}
          autoRender={autoRender}
        />
        <TextureImages texture={texture} />
        <DetailsForm
          key={texture.updatedAt ?? texture.id}
          texture={texture}
          categories={categories}
        />
        <SourceCard texture={texture} />
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {texture.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the texture, its file, outputs and images from storage. It can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => router.delete(`/ops/textures/${texture.id}`)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OpsLayout>
  )
}
