import vine from '@vinejs/vine'

/**
 * Days until a token stops working, or "never".
 */
export const TOKEN_EXPIRY_OPTIONS = ['never', '30', '90', '365'] as const

export const createApiTokenValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    expiresIn: vine.enum(TOKEN_EXPIRY_OPTIONS),
  })
)
