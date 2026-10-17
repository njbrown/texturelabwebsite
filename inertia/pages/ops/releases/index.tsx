import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import { Apple, ExternalLink, Monitor, Pencil, Plus, Terminal, Trash2 } from 'lucide-react'
import ChannelBadge from '~/components/channel_badge'
import { ItchIcon } from '~/components/icons'
import LiveNowCard from '~/components/ops/live_now_card'
import OpsLayout from '~/components/ops/ops_layout'
import PublishDialog, { PublishButton } from '~/components/ops/publish_dialog'
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
import { Card, CardContent } from '~/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { RELEASE_CHANNELS, type LiveReleases, type Release } from '~/lib/types'

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value)
  )
}

type ReleasesIndexProps = {
  releases: Release[]
  live: LiveReleases
}

export default function ReleasesIndex({ releases, live }: ReleasesIndexProps) {
  const [pendingDelete, setPendingDelete] = useState<Release | null>(null)
  const [pendingPublish, setPendingPublish] = useState<Release | null>(null)

  function confirmDelete() {
    if (!pendingDelete) return

    router.delete(`/ops/releases/${pendingDelete.id}`, {
      onFinish: () => setPendingDelete(null),
    })
  }

  return (
    <OpsLayout
      title="Releases"
      description="What the desktop app fetches on startup"
      actions={
        <Button asChild size="sm">
          <Link href="/ops/releases/create">
            <Plus className="size-4" />
            New release
          </Link>
        </Button>
      }
    >
      <Tabs defaultValue="stable" className="gap-4">
        <TabsList>
          {RELEASE_CHANNELS.map((channel) => (
            <TabsTrigger key={channel} value={channel} className="gap-2 px-3">
              <ChannelBadge channel={channel} />
              <span className="tabular-nums text-muted-foreground">
                {releases.filter((release) => release.channel === channel).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {RELEASE_CHANNELS.map((channel) => {
          const rows = releases.filter((release) => release.channel === channel)

          return (
            <TabsContent key={channel} value={channel} className="grid gap-4">
              <LiveNowCard channel={channel} release={live[channel]} />

              <Card>
                <CardContent className="p-0">
                  {rows.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-sm text-muted-foreground">No {channel} releases yet.</p>
                      <Button asChild className="mt-4" size="sm">
                        <Link href="/ops/releases/create">Create one</Link>
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Identifier</TableHead>
                          <TableHead>Build</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Released</TableHead>
                          <TableHead>Downloads</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((release) => (
                          <TableRow key={release.id}>
                            <TableCell className="font-mono font-medium">
                              <span className="flex items-center gap-2">
                                <ChannelBadge channel={release.channel} />
                                {release.identifier}
                              </span>
                            </TableCell>
                            <TableCell className="tabular-nums">{release.build}</TableCell>
                            <TableCell className="max-w-[14rem] truncate text-muted-foreground">
                              {release.title || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={release.isPublished ? 'default' : 'outline'}>
                                {release.isPublished ? 'Published' : 'Draft'}
                              </Badge>
                              {live[channel]?.id === release.id && (
                                <Badge variant="secondary" className="ml-1">
                                  Live
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(release.releasedAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                {release.windowsUrl && (
                                  <Monitor className="size-4" aria-label="Windows" />
                                )}
                                {release.macUrl && <Apple className="size-4" aria-label="macOS" />}
                                {release.linuxUrl && (
                                  <Terminal className="size-4" aria-label="Linux" />
                                )}
                                {release.itchUrl && (
                                  <ItchIcon className="size-4" aria-label="itch.io" />
                                )}
                                {!release.windowsUrl &&
                                  !release.macUrl &&
                                  !release.linuxUrl &&
                                  !release.itchUrl &&
                                  '—'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <PublishButton
                                release={release}
                                onClick={() => setPendingPublish(release)}
                              />
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
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/ops/releases/${release.id}/edit`}>
                                  <Pencil className="size-4" />
                                  <span className="sr-only">Edit {release.identifier}</span>
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPendingDelete(release)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                                <span className="sr-only">Delete {release.identifier}</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      <PublishDialog release={pendingPublish} live={live} onClose={() => setPendingPublish(null)} />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete release {pendingDelete?.identifier}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the public feed immediately. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OpsLayout>
  )
}
