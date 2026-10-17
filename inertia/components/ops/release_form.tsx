import { Link, useForm } from '@inertiajs/react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import MarkdownEditor from './markdown_editor'
import { CHANNEL_STYLES, parseIdentifier } from '~/lib/channels'
import { cn } from '~/lib/utils'
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

/**
 * Two big cards rather than a dropdown, with nothing picked to begin with, so
 * the channel is always a deliberate choice.
 */
function ChannelPicker({
  value,
  onChange,
}: {
  value: ReleaseChannel | ''
  onChange: (channel: ReleaseChannel) => void
}) {
  return (
    <div role="radiogroup" aria-label="Channel" className="grid gap-3 sm:grid-cols-2">
      {RELEASE_CHANNELS.map((channel) => {
        const style = CHANNEL_STYLES[channel]
        const selected = value === channel

        return (
          <button
            key={channel}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(channel)}
            className={cn(
              'overflow-hidden rounded-lg border text-left transition-shadow',
              selected ? cn(style.panel, 'ring-2', style.ring) : 'hover:bg-accent'
            )}
          >
            <span className={cn('block h-1.5', style.strip)} />
            <span className="block px-4 py-3">
              <span className="block text-lg font-semibold">{style.label}</span>
              <span className="block text-sm opacity-80">{style.consequence}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Creating a release starts from the build's identifier, which fills in the
 * version, channel and commit. Publishing is not done here — it's its own
 * action, with its own checks and confirmation.
 */
export default function ReleaseForm({ release }: ReleaseFormProps) {
  const { data, setData, post, put, transform, processing, errors } = useForm({
    identifier: release?.identifier ?? '',
    version: release?.version ?? '',
    channel: (release?.channel ?? '') as ReleaseChannel | '',
    build: release ? String(release.build) : '',
    commit: release?.commit ?? '',
    title: release?.title ?? '',
    notes: release?.notes ?? '',
    windowsUrl: release?.windowsUrl ?? '',
    macUrl: release?.macUrl ?? '',
    linuxUrl: release?.linuxUrl ?? '',
    itchUrl: release?.itchUrl ?? '',
    releasedAt: toLocalInput(release?.releasedAt ?? null),
  })

  const parsed = data.identifier.trim() ? parseIdentifier(data.identifier) : null
  const identifierInvalid = Boolean(data.identifier.trim()) && !parsed
  const mismatched =
    parsed &&
    (parsed.version !== data.version ||
      parsed.channel !== data.channel ||
      parsed.commit !== data.commit)

  function changeIdentifier(value: string) {
    const fields = parseIdentifier(value)

    setData((previous) => ({ ...previous, identifier: value, ...(fields ?? {}) }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()

    // Empty strings become nulls, and the local datetime becomes ISO.
    transform((payload) => ({
      ...payload,
      identifier: payload.identifier.trim() || null,
      build: payload.build === '' ? null : Number(payload.build),
      title: payload.title || null,
      notes: payload.notes || null,
      windowsUrl: payload.windowsUrl || null,
      macUrl: payload.macUrl || null,
      linuxUrl: payload.linuxUrl || null,
      itchUrl: payload.itchUrl || null,
      releasedAt: payload.releasedAt ? new Date(payload.releasedAt).toISOString() : null,
    }))

    if (release) {
      put(`/ops/releases/${release.id}`)
    } else {
      post('/ops/releases')
    }
  }

  const downloads: { key: 'windowsUrl' | 'macUrl' | 'linuxUrl' | 'itchUrl'; label: string }[] = [
    { key: 'windowsUrl', label: 'Windows' },
    { key: 'macUrl', label: 'macOS' },
    { key: 'linuxUrl', label: 'Linux' },
    { key: 'itchUrl', label: 'itch.io page' },
  ]

  const channelStyle = data.channel ? CHANNEL_STYLES[data.channel] : null
  const formErrors = errors as Record<string, string | undefined>

  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-4">
      <Card className="overflow-hidden pt-0">
        <div
          className={cn(
            'px-6 py-2 text-xs font-semibold tracking-wide uppercase',
            channelStyle ? cn(channelStyle.strip, 'text-white') : 'bg-muted text-muted-foreground'
          )}
        >
          {channelStyle ? `${channelStyle.label} channel` : 'No channel chosen'}
        </div>
        <CardHeader>
          <CardTitle>Build</CardTitle>
          <CardDescription>
            Paste the build's identifier, e.g. <code>0.4.0-beta-039faa9</code>. The app compares
            version, then build number.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="identifier">Build identifier</Label>
            <Input
              id="identifier"
              className="font-mono"
              placeholder="0.4.0-beta-039faa9"
              value={data.identifier}
              onChange={(event) => changeIdentifier(event.target.value)}
              aria-invalid={Boolean(errors.identifier) || identifierInvalid || Boolean(mismatched)}
            />
            {identifierInvalid && (
              <p className="text-sm text-destructive">
                Expected version-channel-commit, e.g. 0.4.0-beta-039faa9
              </p>
            )}
            {mismatched && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertTriangle className="size-4" />
                The fields below no longer match this identifier.
              </p>
            )}
            {errors.identifier && <p className="text-sm text-destructive">{errors.identifier}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              placeholder="0.4.0"
              value={data.version}
              onChange={(event) => setData('version', event.target.value)}
              aria-invalid={Boolean(errors.version)}
            />
            {errors.version && <p className="text-sm text-destructive">{errors.version}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="commit">Commit</Label>
            <Input
              id="commit"
              className="font-mono"
              placeholder="039faa9"
              value={data.commit}
              onChange={(event) => setData('commit', event.target.value)}
              aria-invalid={Boolean(errors.commit)}
            />
            {errors.commit && <p className="text-sm text-destructive">{errors.commit}</p>}
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label>Channel</Label>
            <ChannelPicker
              value={data.channel}
              onChange={(channel) => setData('channel', channel)}
            />
            {errors.channel && <p className="text-sm text-destructive">{errors.channel}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="build">Build number</Label>
            <Input
              id="build"
              type="number"
              min={1}
              step={1}
              placeholder="963"
              value={data.build}
              onChange={(event) => setData('build', event.target.value)}
              aria-invalid={Boolean(errors.build)}
            />
            <p className="text-xs text-muted-foreground">
              <code>git rev-list --count &lt;commit&gt;</code>
            </p>
            {errors.build && <p className="text-sm text-destructive">{errors.build}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="releasedAt">Release date</Label>
            <Input
              id="releasedAt"
              type="datetime-local"
              value={data.releasedAt}
              onChange={(event) => setData('releasedAt', event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Defaults to the moment it's published.</p>
            {errors.releasedAt && <p className="text-sm text-destructive">{errors.releasedAt}</p>}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Release notes</CardTitle>
          <CardDescription>
            Shown on the download page and served to the desktop app as both raw markdown and HTML.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MarkdownEditor
            id="notes"
            rows={14}
            placeholder={'## Added\n- Something new\n'}
            value={data.notes}
            onChange={(value) => setData('notes', value)}
            invalid={Boolean(errors.notes)}
          />
          {errors.notes && <p className="mt-2 text-sm text-destructive">{errors.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Downloads</CardTitle>
          <CardDescription>
            Direct links per platform, and/or an itch.io page. Leave blank if not shipped. Each
            direct link's filename must contain the identifier before it can be published.
          </CardDescription>
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
          {formErrors.downloads && (
            <p className="text-sm text-destructive">{formErrors.downloads}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={processing}>
          {processing ? 'Saving…' : release ? 'Save changes' : 'Create draft'}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/ops/releases">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
