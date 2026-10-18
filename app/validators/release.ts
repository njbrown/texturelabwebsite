import vine from '@vinejs/vine'
import {
  COMMIT_PATTERN,
  IDENTIFIER_PATTERN,
  RELEASE_CHANNELS,
  VERSION_PATTERN,
} from '#models/release'

const releaseFields = {
  /**
   * The identifier the build was published under, e.g. `0.4.0-beta-039faa9`.
   * Optional, since the fields below are what is stored — but when it is sent
   * it has to agree with them, which the controller checks.
   */
  identifier: vine.string().trim().regex(IDENTIFIER_PATTERN).nullable().optional(),
  version: vine.string().trim().regex(VERSION_PATTERN),
  channel: vine.enum(RELEASE_CHANNELS),
  build: vine.number().withoutDecimals().min(1),
  commit: vine.string().trim().toLowerCase().regex(COMMIT_PATTERN),
  title: vine.string().trim().maxLength(255).nullable().optional(),
  notes: vine.string().trim().nullable().optional(),
  windowsUrl: vine.string().trim().url().nullable().optional(),
  macUrl: vine.string().trim().url().nullable().optional(),
  linuxUrl: vine.string().trim().url().nullable().optional(),
  itchUrl: vine.string().trim().url().nullable().optional(),
  /**
   * Sent as an ISO string by the form; parsed into a DateTime in the controller.
   */
  releasedAt: vine.string().trim().nullable().optional(),
}

/**
 * What CI posts to `/api/ops/releases/drafts`. Version, channel and commit are
 * parsed out of the identifier on the server, so there is nothing for them to
 * disagree with; the remaining fields reuse the form's rules.
 */
export const releaseDraftValidator = vine.compile(
  vine.object({
    identifier: vine.string().trim().regex(IDENTIFIER_PATTERN),
    build: releaseFields.build,
    title: releaseFields.title,
    notes: releaseFields.notes,
    releasedAt: releaseFields.releasedAt,
    downloads: vine
      .object({
        windows: releaseFields.windowsUrl,
        mac: releaseFields.macUrl,
        linux: releaseFields.linuxUrl,
        itch: releaseFields.itchUrl,
      })
      .optional(),
  })
)

export const createReleaseValidator = vine.compile(vine.object(releaseFields))

export const updateReleaseValidator = vine.compile(vine.object(releaseFields))

/**
 * Publishing a stable release also takes the word "stable", typed by hand, so
 * it can't be done on autopilot. `allowOlder` lets an older build onto the
 * download page without it becoming what the app is offered.
 */
export const publishReleaseValidator = vine.compile(
  vine.object({
    confirm: vine.string().trim().nullable().optional(),
    allowOlder: vine.boolean().optional(),
  })
)

export const offerQueryValidator = vine.compile(
  vine.object({
    identifier: vine.string().trim().regex(IDENTIFIER_PATTERN),
    build: vine.number().withoutDecimals().min(1),
  })
)
