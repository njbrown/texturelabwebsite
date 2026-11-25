import { Link, router } from '@inertiajs/react'
import { AlertTriangle, ExternalLink, ImageOff, Pencil, Plus } from 'lucide-react'
import OpsLayout from '~/components/ops/ops_layout'
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
import { formatDate, type TextureCard } from '~/lib/textures'

type Row = TextureCard & {
  status: 'draft' | 'published'
  outputsStale: boolean
  outputsRevision: number
  warningCount: number
  updatedAt: string | null
}

const FILTERS = [
  { value: null, label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
] as const

export default function TexturesIndex({
  textures,
  status,
}: {
  textures: Row[]
  status: 'draft' | 'published' | null
}) {
  return (
    <OpsLayout
      title="Textures"
      description="The gallery's curated textures"
      actions={
        <Button asChild size="sm">
          <Link href="/ops/textures/create">
            <Plus className="size-4" />
            Upload texture
          </Link>
        </Button>
      }
    >
      <div className="flex gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter.label}
            size="sm"
            variant={status === filter.value ? 'secondary' : 'ghost'}
            onClick={() =>
              router.get('/ops/textures', filter.value ? { status: filter.value } : {}, {
                preserveState: true,
              })
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {textures.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">No textures yet.</p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/ops/textures/create">Upload one</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16" />
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outputs</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {textures.map((texture) => (
                  <TableRow key={texture.id}>
                    <TableCell>
                      {texture.thumbUrl ? (
                        <img
                          src={texture.thumbUrl}
                          alt=""
                          className="size-10 rounded object-cover"
                        />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded bg-muted">
                          <ImageOff className="size-4 text-muted-foreground" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/ops/textures/${texture.id}/edit`} className="hover:underline">
                        {texture.title}
                      </Link>
                      {texture.featured && (
                        <Badge variant="outline" className="ml-2">
                          Featured
                        </Badge>
                      )}
                      {texture.warningCount > 0 && (
                        <span
                          className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600"
                          title="Warnings from parsing or rendering"
                        >
                          <AlertTriangle className="size-3.5" />
                          {texture.warningCount}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{texture.category?.name ?? '—'}</TableCell>
                    <TableCell>
                      {texture.status === 'published' ? (
                        <Badge>Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {texture.outputsRevision === 0 ? (
                        <Badge variant="outline">Not rendered</Badge>
                      ) : texture.outputsStale ? (
                        <Badge variant="destructive">Stale</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {texture.channelCount} maps
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{texture.resolution}</TableCell>
                    <TableCell>{formatDate(texture.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" aria-label="Edit">
                          <Link href={`/ops/textures/${texture.id}/edit`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <Button asChild size="icon" variant="ghost" aria-label="View page">
                          <a
                            href={`/textures/${texture.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </OpsLayout>
  )
}
