import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import MarkdownEditor from './markdown_editor'

export type CategoryOption = { id: string; slug: string; name: string }

export type TextureFieldValues = {
  title: string
  slug: string
  categoryId: string
  tags: string
  featured: boolean
  sortOrder: string
  description: string
}

type TextureFieldsProps = {
  data: TextureFieldValues
  setData: <K extends keyof TextureFieldValues>(key: K, value: TextureFieldValues[K]) => void
  errors: Partial<Record<keyof TextureFieldValues | string, string>>
  categories: CategoryOption[]
}

/**
 * The editable fields of a texture, shared by the create and edit pages.
 */
export default function TextureFields({ data, setData, errors, categories }: TextureFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={data.title}
          onChange={(event) => setData('title', event.target.value)}
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          className="font-mono"
          value={data.slug}
          placeholder="generated from the title"
          onChange={(event) => setData('slug', event.target.value)}
          aria-invalid={Boolean(errors.slug)}
        />
        {errors.slug ? (
          <p className="text-sm text-destructive">{errors.slug}</p>
        ) : (
          <p className="text-xs text-muted-foreground">/textures/{data.slug || '…'}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          className="h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
          value={data.categoryId}
          onChange={(event) => setData('categoryId', event.target.value)}
        >
          <option value="">Uncategorized</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {categories.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Add categories under{' '}
            <a href="/ops/categories" className="underline">
              Categories
            </a>
            .
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={data.tags}
          placeholder="metal, worn, sci-fi"
          onChange={(event) => setData('tags', event.target.value)}
        />
        <p className="text-xs text-muted-foreground">Comma-separated. Searchable.</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
        <div>
          <Label htmlFor="featured">Featured</Label>
          <p className="text-xs text-muted-foreground">Listed first in the gallery.</p>
        </div>
        <Switch
          id="featured"
          checked={data.featured}
          onCheckedChange={(checked) => setData('featured', checked)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sortOrder">Sort order</Label>
        <Input
          id="sortOrder"
          type="number"
          value={data.sortOrder}
          onChange={(event) => setData('sortOrder', event.target.value)}
        />
        <p className="text-xs text-muted-foreground">Lower comes first among featured textures.</p>
      </div>

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <MarkdownEditor
          id="description"
          value={data.description}
          onChange={(value) => setData('description', value)}
          rows={6}
          placeholder="What it is, how it was made, tips for using it…"
        />
      </div>
    </div>
  )
}

/** Form strings → what the validators take. */
export function fieldsPayload(data: TextureFieldValues) {
  return {
    title: data.title.trim(),
    slug: data.slug.trim() || undefined,
    categoryId: data.categoryId || null,
    tags: data.tags,
    featured: data.featured,
    sortOrder: data.sortOrder === '' ? 0 : Number(data.sortOrder),
    description: data.description || null,
  }
}
