import vine from '@vinejs/vine'
import { RELEASE_CHANNELS } from '#models/release'

const releaseFields = {
  version: vine
    .string()
    .trim()
    .maxLength(50)
    .regex(/^[\w.+-]+$/),
  title: vine.string().trim().maxLength(255).nullable().optional(),
  channel: vine.enum(RELEASE_CHANNELS),
  notes: vine.string().trim().nullable().optional(),
  windowsUrl: vine.string().trim().url().nullable().optional(),
  macUrl: vine.string().trim().url().nullable().optional(),
  linuxUrl: vine.string().trim().url().nullable().optional(),
  itchUrl: vine.string().trim().url().nullable().optional(),
  isPublished: vine.boolean(),
  /**
   * Sent as an ISO string by the form; parsed into a DateTime in the controller.
   */
  releasedAt: vine.string().trim().nullable().optional(),
}

export const createReleaseValidator = vine.compile(vine.object(releaseFields))

export const updateReleaseValidator = vine.compile(vine.object(releaseFields))
