import vine from '@vinejs/vine'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Tags arrive as one comma-separated string from the form.
 */
const tags = vine
  .string()
  .trim()
  .maxLength(1000)
  .optional()
  .transform((value) => (value ?? '').split(','))

const textureFields = {
  title: vine.string().trim().minLength(1).maxLength(120),
  slug: vine.string().trim().toLowerCase().regex(SLUG_PATTERN).maxLength(80).optional(),
  description: vine.string().trim().maxLength(20000).nullable().optional(),
  categoryId: vine.number().withoutDecimals().positive().nullable().optional(),
  tags,
  featured: vine.boolean().optional(),
  sortOrder: vine.number().withoutDecimals().min(-10000).max(10000).optional(),
}

/** The create form: fields plus the file, which the controller reads itself. */
export const createTextureValidator = vine.compile(
  vine.object({
    ...textureFields,
    title: textureFields.title.optional(),
  })
)

export const updateTextureValidator = vine.compile(vine.object(textureFields))

export const categoryValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(60),
    slug: vine.string().trim().toLowerCase().regex(SLUG_PATTERN).maxLength(60).optional(),
    description: vine.string().trim().maxLength(500).nullable().optional(),
    sortOrder: vine.number().withoutDecimals().min(-10000).max(10000).optional(),
  })
)

export const imageUpdateValidator = vine.compile(
  vine.object({
    alt: vine.string().trim().maxLength(200).nullable().optional(),
    isPrimary: vine.boolean().optional(),
  })
)

export const imageOrderValidator = vine.compile(
  vine.object({
    ids: vine.array(vine.number().withoutDecimals().positive()).maxLength(200),
  })
)

export const galleryQueryValidator = vine.compile(
  vine.object({
    q: vine.string().trim().maxLength(100).optional(),
    sort: vine.enum(['featured', 'newest', 'name'] as const).optional(),
    page: vine.number().withoutDecimals().min(1).max(10000).optional(),
  })
)
