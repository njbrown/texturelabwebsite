import { Link, useForm } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import { RELEASE_CHANNELS, type Release, type ReleaseChannel } from '~/lib/types'

type ReleaseFormProps = {
  release?: Release
}

/**
 * `datetime-local` needs `YYYY-MM-DDTHH:mm`; the server speaks ISO.
 */
function toLocalInput(value: string | null): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export default function ReleaseForm({ release }: ReleaseFormProps) {
  const { data, setData, post, put, transform, processing, errors } = useForm({
    version: release?.version ?? '',
    title: release?.title ?? '',
    channel: (release?.channel ?? 'stable') as ReleaseChannel,
    notes: release?.notes ?? '',
    windowsUrl: release?.windowsUrl ?? '',
    macUrl: release?.macUrl ?? '',
    linuxUrl: release?.linuxUrl ?? '',
    isPublished: release?.isPublished ?? false,
    releasedAt: toLocalInput(release?.releasedAt ?? null),
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()

    // Empty strings become nulls, and the local datetime becomes ISO.
    transform((payload) => ({
      ...payload,
      title: payload.title || null,
      notes: payload.notes || null,
      windowsUrl: payload.windowsUrl || null,
      macUrl: payload.macUrl || null,
      linuxUrl: payload.linuxUrl || null,
      releasedAt: payload.releasedAt ? new Date(payload.releasedAt).toISOString() : null,
    }))

    if (release) {
      put(`/ops/releases/${release.id}`)
    } else {
      post('/ops/releases')
    }
  }

  const downloads: { key: 'windowsUrl' | 'macUrl' | 'linuxUrl'; label: string }[] = [
    { key: 'windowsUrl', label: 'Windows' },
    { key: 'macUrl', label: 'macOS' },
    { key: 'linuxUrl', label: 'Linux' },
  ]

  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Version and channel are what the app matches on.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              placeholder="1.2.0"
              value={data.version}
              onChange={(event) => setData('version', event.target.value)}
              aria-invalid={Boolean(errors.version)}
            />
            {errors.version && <p className="text-sm text-destructive">{errors.version}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="channel">Channel</Label>
            <Select
              value={data.channel}
              onValueChange={(value) => setData('channel', value as ReleaseChannel)}
            >
              <SelectTrigger id="channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELEASE_CHANNELS.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.channel && <p className="text-sm text-destructive">{errors.channel}</p>}
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Optional headline, e.g. “Nodes everywhere”"
              value={data.title}
              onChange={(event) => setData('title', event.target.value)}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="releasedAt">Release date</Label>
            <Input
              id="releasedAt"
              type="datetime-local"
              value={data.releasedAt}
              onChange={(event) => setData('releasedAt', event.target.value)}
            />
            {errors.releasedAt && <p className="text-sm text-destructive">{errors.releasedAt}</p>}
          </div>

          <div className="flex items-end">
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              <Switch
                id="isPublished"
                checked={data.isPublished}
                onCheckedChange={(checked) => setData('isPublished', checked)}
              />
              <Label htmlFor="isPublished" className="cursor-pointer">
                Published
                <span className="block text-xs font-normal text-muted-foreground">
                  Visible on the public API
                </span>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Release notes</CardTitle>
          <CardDescription>Markdown — served as both raw text and HTML.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notes"
            rows={10}
            className="font-mono text-sm"
            placeholder={'## Added\n- Something new\n'}
            value={data.notes}
            onChange={(event) => setData('notes', event.target.value)}
          />
          {errors.notes && <p className="mt-2 text-sm text-destructive">{errors.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Downloads</CardTitle>
          <CardDescription>Direct links per platform. Leave blank if not shipped.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {downloads.map((download) => (
            <div key={download.key} className="grid gap-2">
              <Label htmlFor={download.key}>{download.label}</Label>
              <Input
                id={download.key}
                type="url"
                placeholder="https://…"
                value={data[download.key]}
                onChange={(event) => setData(download.key, event.target.value)}
                aria-invalid={Boolean(errors[download.key])}
              />
              {errors[download.key] && (
                <p className="text-sm text-destructive">{errors[download.key]}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={processing}>
          {processing ? 'Saving…' : release ? 'Save changes' : 'Create release'}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/ops/releases">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
