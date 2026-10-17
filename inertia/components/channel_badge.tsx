import { CHANNEL_STYLES } from '~/lib/channels'
import { cn } from '~/lib/utils'
import type { ReleaseChannel } from '~/lib/types'

/**
 * The channel, in its colour. Shared by the public download pages and /ops.
 */
export default function ChannelBadge({
  channel,
  className,
}: {
  channel: ReleaseChannel
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded border px-2 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase',
        CHANNEL_STYLES[channel].badge,
        className
      )}
    >
      {channel}
    </span>
  )
}
