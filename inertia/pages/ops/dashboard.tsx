import { Link } from '@inertiajs/react'
import { Plus } from 'lucide-react'
import OpsLayout from '~/components/ops/ops_layout'
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
import type { Release } from '~/lib/types'

type DashboardProps = {
  stats: {
    releases: number
    publishedReleases: number
    draftReleases: number
    docs: number
    posts: number
    gallery: number
  }
  latest: Release | null
  recent: Release[]
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export default function OpsDashboard({ stats, latest, recent }: DashboardProps) {
  const tiles = [
    { label: 'Published releases', value: stats.publishedReleases },
    { label: 'Drafts', value: stats.draftReleases },
    { label: 'Doc pages', value: stats.docs },
    { label: 'Blog posts', value: stats.posts },
    { label: 'Gallery items', value: stats.gallery },
  ]

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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Latest stable</CardTitle>
            <CardDescription>What the app sees at /api/releases/latest</CardDescription>
          </CardHeader>
          <CardContent>
            {latest ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold">{latest.version}</span>
                  <Badge variant="secondary">{latest.channel}</Badge>
                </div>
                {latest.title && <p className="text-sm">{latest.title}</p>}
                <p className="text-sm text-muted-foreground">
                  Released {formatDate(latest.releasedAt)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing published yet — the app will get an empty feed.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent releases</CardTitle>
            <CardDescription>Newest first</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No releases yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Released</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((release) => (
                    <TableRow key={release.id}>
                      <TableCell className="font-medium">
                        <Link href={`/ops/releases/${release.id}/edit`} className="hover:underline">
                          {release.version}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{release.channel}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={release.isPublished ? 'default' : 'outline'}>
                          {release.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(release.releasedAt)}
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
