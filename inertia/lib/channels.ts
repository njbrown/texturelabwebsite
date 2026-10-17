import type { ReleaseChannel } from '~/lib/types'

/**
 * The one place the channel colours are defined: stable is green, beta is
 * amber, everywhere a channel is shown — badges, the form's header strip, the
 * channel picker and the publish button and dialog. Full class names, so
 * Tailwind can see them.
 */
export const CHANNEL_STYLES: Record<
  ReleaseChannel,
  {
    label: string
    /** What publishing to this channel means, in one line. */
    consequence: string
    badge: string
    strip: string
    button: string
    panel: string
    ring: string
  }
> = {
  stable: {
    label: 'Stable',
    consequence: 'Everyone on a stable build will be offered this.',
    badge:
      'border-emerald-600/30 bg-emerald-100 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950 dark:text-emerald-200',
    strip: 'bg-emerald-600',
    button: 'bg-emerald-600 text-white hover:bg-emerald-700',
    panel:
      'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50',
    ring: 'ring-emerald-600',
  },
  beta: {
    label: 'Beta',
    consequence: 'Beta builds will be offered this.',
    badge:
      'border-amber-500/40 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-950 dark:text-amber-200',
    strip: 'bg-amber-500',
    button: 'bg-amber-500 text-amber-950 hover:bg-amber-600',
    panel:
      'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50',
    ring: 'ring-amber-500',
  },
}

/**
 * Mirrors the server's `parseIdentifier` in app/models/release.ts.
 */
const IDENTIFIER_PATTERN = /^(\d+\.\d+\.\d+)-(stable|beta)-([0-9a-f]{7,40})$/

export function parseIdentifier(identifier: string) {
  const match = IDENTIFIER_PATTERN.exec(identifier.trim())
  if (!match) return null

  return { version: match[1], channel: match[2] as ReleaseChannel, commit: match[3] }
}

type BuildKey = {
  versionMajor: number
  versionMinor: number
  versionPatch: number
  build: number
}

/**
 * Mirrors the server's `compareBuilds`. Positive when `a` is newer. Only used
 * to word the publish dialog — the server makes the actual call.
 */
export function compareBuilds(a: BuildKey, b: BuildKey) {
  return (
    a.versionMajor - b.versionMajor ||
    a.versionMinor - b.versionMinor ||
    a.versionPatch - b.versionPatch ||
    a.build - b.build
  )
}

/**
 * `0.4.0 build 963 (039faa9)` — how a build is described in prose.
 */
export function describeBuild(release: { version: string; build: number; commit: string }) {
  return `${release.version} build ${release.build} (${release.commit})`
}
