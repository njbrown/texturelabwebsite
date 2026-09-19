import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import { Apple, ExternalLink, Monitor, Pencil, Plus, Terminal, Trash2 } from 'lucide-react'
import OpsLayout from '~/components/ops/ops_layout'
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
import type { Release } from '~/lib/types'

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value)
  )
}

export default function ReleasesIndex({ releases }: { releases: Release[] }) {
  const [pendingDelete, setPendingDelete] = useState<Release | null>(null)

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
      <Card>
        <CardContent className="p-0">
          {releases.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">No releases yet.</p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/ops/releases/create">Create the first one</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell className="font-medium">{release.version}</TableCell>
                    <TableCell className="max-w-[18rem] truncate text-muted-foreground">
                      {release.title || '—'}
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
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {release.windowsUrl && <Monitor className="size-4" aria-label="Windows" />}
                        {release.macUrl && <Apple className="size-4" aria-label="macOS" />}
                        {release.linuxUrl && <Terminal className="size-4" aria-label="Linux" />}
                        {!release.windowsUrl && !release.macUrl && !release.linuxUrl && '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {release.isPublished && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`/download/${encodeURIComponent(release.version)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="size-4" />
                            <span className="sr-only">View public page for {release.version}</span>
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/ops/releases/${release.id}/edit`}>
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit {release.version}</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(release)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete {release.version}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete release {pendingDelete?.version}?</AlertDialogTitle>
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
