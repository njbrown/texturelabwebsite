import { Link } from '@inertiajs/react'
import { ExternalLink, Plus } from 'lucide-react'
import ChannelBadge from '~/components/channel_badge'
import LiveNowCard from '~/components/ops/live_now_card'
import OfferCheck from '~/components/ops/offer_check'
import OpsLayout from '~/components/ops/ops_layout'
import { UsageChart } from '~/components/ops/usage_chart'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import type { LiveReleases, Release } from '~/lib/types'

type DashboardProps = {
  stats: {
    releases: number
    publishedReleases: number
    draftReleases: number
    docs: number
    posts: number
    gallery: number
  }
  live: LiveReleases
  recent: Release[]
  usage: { day: string; visitors: number }[]
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export default function OpsDashboard({ stats, live, recent, usage }: DashboardProps) {
  const tiles = [
    { label: 'Published releases', value: stats.publishedReleases },
    { label: 'Drafts', value: stats.draftReleases },
    { label: 'Doc pages', value: stats.docs },
    { label: 'Blog posts', value: stats.posts },
    { label: 'Gallery items', value: stats.gallery },
  ]

  const todayUsers = usage.at(-1)?.visitors ?? 0
  const averageUsers = usage.length
    ? Math.round(usage.reduce((sum, point) => sum + point.visitors, 0) / usage.length)
    : 0

  return (
    <OpsLayout
      title="Overview"
      description="Releases and content at a glance"
      actions={
        <Button asChild size="sm">
          <Link href="/ops/releases/create">
            <Plus className="size-4" />
            New release
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-2">
              <CardDescription>{tile.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{tile.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Daily app users · last 30 days (UTC)</CardDescription>
          <CardTitle className="flex items-baseline gap-3">
            <span className="text-3xl tabular-nums">{todayUsers}</span>
            <span className="text-sm font-normal text-muted-foreground">
              today · {averageUsers} avg/day
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart data={usage} />
          <p className="mt-3 text-xs text-muted-foreground">
            Unique update checks per day, counted with a daily-rotating salted hash. No IPs or
            identifiers are stored.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <LiveNowCard channel="stable" release={live.stable} />
        <LiveNowCard channel="beta" release={live.beta} />
        <OfferCheck />
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent releases</CardTitle>
            <CardDescription>Newest build first</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No releases yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Build</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Released</TableHead>
                    <TableHead>
                      <span className="sr-only">Public page</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((release) => (
                    <TableRow key={release.id}>
                      <TableCell className="font-mono font-medium">
                        <Link href={`/ops/releases/${release.id}/edit`} className="hover:underline">
                          {release.identifier}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums">{release.build}</TableCell>
                      <TableCell>
                        <ChannelBadge channel={release.channel} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={release.isPublished ? 'default' : 'outline'}>
                          {release.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(release.releasedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {release.isPublished && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`/download/${encodeURIComponent(release.identifier)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="size-4" />
                              <span className="sr-only">
                                View public page for {release.identifier}
                              </span>
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </OpsLayout>
  )
}
