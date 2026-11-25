import { useRef, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { ArrowLeft, ArrowRight, Loader2, Star, Trash2, Upload } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { formatBytes, type Texture } from '~/lib/textures'

/**
 * Thumbnails and renders: upload, choose the primary one (the gallery
 * thumbnail), reorder, delete.
 */
export default function TextureImages({ texture }: { texture: Texture }) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const errors = (usePage().props.errors ?? {}) as Record<string, string | undefined>
  const base = `/ops/textures/${texture.id}/images`
  const options = { preserveScroll: true }

  function upload(files: FileList | null) {
    if (!files?.length) return
    const queue = [...files]
    setUploading(true)

    const next = () => {
      const file = queue.shift()
      if (!file) {
        setUploading(false)
        if (input.current) input.current.value = ''
        return
      }
      router.post(base, { image: file }, { ...options, forceFormData: true, onFinish: next })
    }
    next()
  }

  function move(index: number, by: number) {
    const ids = texture.images.map((image) => image.id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + by, 0, id)
    router.put(`${base}/order`, { ids }, options)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Images</CardTitle>
        <CardDescription>
          The primary image is the gallery thumbnail and the hero on the texture page. PNG, JPEG or
          WebP up to 25 MB; stored as WebP (2048px, plus a 512px thumbnail).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {texture.images.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No images yet. Upload one, or capture the 3D preview above.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {texture.images.map((image, index) => (
            <div key={image.id} className="overflow-hidden rounded-md border">
              <div className="relative">
                <img
                  src={image.thumbUrl}
                  alt={image.alt ?? ''}
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute top-1.5 left-1.5 flex gap-1">
                  {image.isPrimary && <Badge>Primary</Badge>}
                  {image.source === 'render' && <Badge variant="secondary">Render</Badge>}
                </div>
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <span className="truncate px-1 text-xs text-muted-foreground">
                  {image.width}×{image.height} · {formatBytes(image.bytes)}
                </span>
                <div className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move earlier"
                  >
                    <ArrowLeft className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={index === texture.images.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move later"
                  >
                    <ArrowRight className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={image.isPrimary}
                    onClick={() => router.put(`${base}/${image.id}`, { isPrimary: true }, options)}
                    aria-label="Make primary"
                  >
                    <Star className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive"
                    onClick={() => router.delete(`${base}/${image.id}`, options)}
                    aria-label="Delete image"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(event) => upload(event.target.files)}
          />
          <Button variant="outline" onClick={() => input.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Upload images
          </Button>
          {errors.image && <p className="text-sm text-destructive">{errors.image}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
