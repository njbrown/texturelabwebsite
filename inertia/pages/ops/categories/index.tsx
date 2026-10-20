import { useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import OpsLayout from '~/components/ops/ops_layout'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

type Category = {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  textureCount: number
}

function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false)
  const form = useForm({
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    sortOrder: String(category.sortOrder),
  })

  function save() {
    form.transform(
      (data) =>
        ({
          ...data,
          description: data.description || null,
          sortOrder: Number(data.sortOrder) || 0,
        }) as never
    )
    form.put(`/ops/categories/${category.id}`, {
      preserveScroll: true,
      onSuccess: () => setEditing(false),
    })
  }

  function remove() {
    const note = category.textureCount
      ? ` Its ${category.textureCount} texture(s) become uncategorized.`
      : ''
    if (window.confirm(`Delete ${category.name}?${note}`)) {
      router.delete(`/ops/categories/${category.id}`, { preserveScroll: true })
    }
  }

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
        </TableCell>
        <TableCell>
          <Input
            className="font-mono"
            value={form.data.slug}
            onChange={(e) => form.setData('slug', e.target.value)}
            aria-invalid={Boolean(form.errors.slug)}
          />
          {form.errors.slug && <p className="text-xs text-destructive">{form.errors.slug}</p>}
        </TableCell>
        <TableCell>
          <Input
            value={form.data.description}
            onChange={(e) => form.setData('description', e.target.value)}
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            className="w-20"
            value={form.data.sortOrder}
            onChange={(e) => form.setData('sortOrder', e.target.value)}
          />
        </TableCell>
        <TableCell>{category.textureCount}</TableCell>
        <TableCell className="text-right">
          <Button size="icon" variant="ghost" onClick={save} aria-label="Save">
            {form.processing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel">
            <X className="size-4" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{category.name}</TableCell>
      <TableCell className="font-mono text-sm">{category.slug}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{category.description ?? '—'}</TableCell>
      <TableCell className="tabular-nums">{category.sortOrder}</TableCell>
      <TableCell className="tabular-nums">{category.textureCount}</TableCell>
      <TableCell className="text-right">
        <Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit">
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive"
          onClick={remove}
          aria-label="Delete"
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function CategoriesIndex({ categories }: { categories: Category[] }) {
  const form = useForm({ name: '', slug: '', description: '', sortOrder: '0' })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    form.transform(
      (data) =>
        ({
          name: data.name,
          slug: data.slug || undefined,
          description: data.description || null,
          sortOrder: Number(data.sortOrder) || 0,
        }) as never
    )
    form.post('/ops/categories', { preserveScroll: true, onSuccess: () => form.reset() })
  }

  return (
    <OpsLayout title="Categories" description="How the gallery is grouped">
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>New category</CardTitle>
          <CardDescription>
            Shown in the gallery sidebar once it has a published texture, at /gallery/slug.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={submit}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_100px_auto] sm:items-end"
          >
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.data.name}
                placeholder="Metal"
                onChange={(e) => form.setData('name', e.target.value)}
                aria-invalid={Boolean(form.errors.name)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                className="font-mono"
                value={form.data.slug}
                placeholder="from the name"
                onChange={(e) => form.setData('slug', e.target.value)}
                aria-invalid={Boolean(form.errors.slug)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={form.data.sortOrder}
                onChange={(e) => form.setData('sortOrder', e.target.value)}
              />
            </div>
            <Button type="submit" disabled={form.processing || !form.data.name.trim()}>
              <Plus className="size-4" />
              Add
            </Button>
            <div className="grid gap-2 sm:col-span-4">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={form.data.description}
                placeholder="Shown at the top of the category page"
                onChange={(e) => form.setData('description', e.target.value)}
              />
            </div>
            {(form.errors.name || form.errors.slug) && (
              <p className="text-sm text-destructive sm:col-span-4">
                {form.errors.name ?? form.errors.slug}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-4xl">
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No categories yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Textures</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <CategoryRow
                    key={`${category.id}-${category.slug}-${category.name}`}
                    category={category}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </OpsLayout>
  )
}
