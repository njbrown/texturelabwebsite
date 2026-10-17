import { Link } from '@inertiajs/react'
import ChannelBadge from '~/components/channel_badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { CHANNEL_STYLES } from '~/lib/channels'
import { cn } from '~/lib/utils'
import type { Release, ReleaseChannel } from '~/lib/types'

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value)
  )
}

/**
 * Exactly what `/api/releases/latest?channel=…` answers right now. For beta
 * that can be a stable release, when one is newer than every beta.
 */
export default function LiveNowCard({
  channel,
  release,
  className,
}: {
  channel: ReleaseChannel
  release: Release | null
  className?: string
}) {
  const style = CHANNEL_STYLES[channel]

  return (
    <Card className={cn('overflow-hidden pt-0', className)}>
      <div className={cn('h-1.5', style.strip)} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Live now on <ChannelBadge channel={channel} />
        </CardTitle>
        <CardDescription>
          What {channel} builds get from <code>/api/releases/latest?channel={channel}</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {release ? (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/ops/releases/${release.id}/edit`}
                className="font-mono text-lg font-semibold hover:underline"
              >
                {release.identifier}
              </Link>
              {release.channel !== channel && <ChannelBadge channel={release.channel} />}
            </div>
            <p className="text-sm text-muted-foreground">
              Version {release.version} · build {release.build} · released{' '}
              {formatDate(release.releasedAt)}
            </p>
            {release.title && <p className="text-sm">{release.title}</p>}
            {release.channel !== channel && (
              <p className="text-sm text-muted-foreground">
                A stable release, newer than every published beta — beta builds are offered it.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing published — the app gets a 404 and stays quiet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
