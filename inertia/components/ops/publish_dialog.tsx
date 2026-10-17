import { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import { AlertTriangle } from 'lucide-react'
import ChannelBadge from '~/components/channel_badge'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { CHANNEL_STYLES, compareBuilds, describeBuild } from '~/lib/channels'
import { cn } from '~/lib/utils'
import type { LiveReleases, Release } from '~/lib/types'

type PublishDialogProps = {
  /** The release to publish or unpublish; the dialog is open while it is set. */
  release: Release | null
  live: LiveReleases
  onClose: () => void
}

function LiveLine({ label, live }: { label: string; live: Release | null }) {
  return (
    <p>
      Currently live on {label}:{' '}
      {live ? (
        <>
          <span className="font-mono font-medium text-foreground">{live.identifier}</span> (build{' '}
          {live.build}){label === 'beta' && live.channel === 'stable' && ' — the stable release'}
        </>
      ) : (
        'nothing'
      )}
      .
    </p>
  )
}

/**
 * Publishing is the one step that changes what people are offered, so it is
 * spelled out: the channel, who will see the update and what it replaces.
 * Stable also takes the word "stable" typed out. The server re-checks all of it.
 */
export default function PublishDialog({ release, live, onClose }: PublishDialogProps) {
  const [confirm, setConfirm] = useState('')
  const [allowOlder, setAllowOlder] = useState(false)
  const [problems, setProblems] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    setConfirm('')
    setAllowOlder(false)
    setProblems([])
  }, [release?.id])

  if (!release) return null

  const style = CHANNEL_STYLES[release.channel]
  const channel = release.channel.toUpperCase()
  const unpublishing = release.isPublished
  const current = live[release.channel]
  const older =
    !unpublishing && current && current.id !== release.id && compareBuilds(release, current) <= 0
  const canConfirm =
    !processing &&
    (unpublishing || release.channel !== 'stable' || confirm.trim() === 'stable') &&
    (!older || allowOlder)

  function submit() {
    if (!release) return

    const url = `/ops/releases/${release.id}/${unpublishing ? 'unpublish' : 'publish'}`

    router.post(url, unpublishing ? {} : { confirm, allowOlder }, {
      preserveScroll: true,
      onStart: () => setProcessing(true),
      onFinish: () => setProcessing(false),
      onSuccess: () => onClose(),
      onError: (errors) => {
        const publish = (errors as Record<string, string | string[]>).publish
        setProblems(publish ? ([] as string[]).concat(publish) : Object.values(errors))
      },
    })
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="overflow-hidden pt-0">
        <div className={cn('-mx-6 h-2', style.strip)} />
        <AlertDialogHeader>
          <AlertDialogTitle className="leading-snug">
            {unpublishing ? 'Unpublish' : 'Publish'}{' '}
            <span className="font-mono">{release.identifier}</span> {unpublishing ? 'from' : 'to'}{' '}
            the <ChannelBadge channel={release.channel} className="align-middle text-sm" /> channel?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {unpublishing ? (
                <p>
                  It disappears from the download pages, and {release.channel} builds stop being
                  offered it. The channel falls back to the next newest published build.
                </p>
              ) : release.channel === 'stable' ? (
                <>
                  <p>
                    Stable builds older than {release.version} build {release.build} will see “New
                    Version Available”.
                  </p>
                  <p className="font-medium text-foreground">
                    Beta builds older than it will see it too — beta builds are also offered a newer
                    stable release.
                  </p>
                </>
              ) : (
                <p>
                  Beta builds older than {release.version} build {release.build} will see “New
                  Version Available”. Stable builds won't.
                </p>
              )}

              <LiveLine label={release.channel} live={current} />
              {release.channel === 'stable' && !unpublishing && (
                <LiveLine label="beta" live={live.beta} />
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {older && current && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="flex items-start gap-2 font-medium text-destructive">
              <AlertTriangle className="mt-0.5 size-4" />
              {describeBuild(release)} is not newer than {describeBuild(current)}, so no app would
              be offered it.
            </p>
            <label className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowOlder}
                onChange={(event) => setAllowOlder(event.target.checked)}
              />
              Republish this older build anyway (download pages only)
            </label>
          </div>
        )}

        {!unpublishing && release.channel === 'stable' && (
          <div className="grid gap-2">
            <Label htmlFor="confirm-stable">
              Type <span className="font-mono">stable</span> to confirm
            </Label>
            <Input
              id="confirm-stable"
              autoComplete="off"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
        )}

        {problems.length > 0 && (
          <ul className="list-disc space-y-1 rounded-md border border-destructive/40 bg-destructive/5 py-2 pr-3 pl-7 text-sm text-destructive">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            onClick={submit}
            disabled={!canConfirm}
            className={unpublishing ? undefined : style.button}
            variant={unpublishing ? 'destructive' : 'default'}
          >
            {processing
              ? 'Working…'
              : `${unpublishing ? 'Unpublish from' : 'Publish to'} ${channel}`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * The button that opens the dialog, in the channel's colour.
 */
export function PublishButton({
  release,
  onClick,
  size = 'sm',
}: {
  release: Release
  onClick: () => void
  size?: 'sm' | 'default'
}) {
  if (release.isPublished) {
    return (
      <Button variant="outline" size={size} onClick={onClick}>
        Unpublish
      </Button>
    )
  }

  return (
    <Button size={size} onClick={onClick} className={CHANNEL_STYLES[release.channel].button}>
      Publish to {release.channel.toUpperCase()}
    </Button>
  )
}
