export type SiteLinks = {
  download: string
  github: string
  discord: string
  twitter: string
  itchCommunity: string
  roadmap: string
  issues: string
  pulls: string
}

export type Site = {
  name: string
  description: string
  tagline: string
  url: string
  nav: { path: string; title: string }[]
  links: SiteLinks
}

export type Heading = {
  depth: number
  value: string
  anchor: string
}

export type DocLink = {
  path: string
  title: string
}

export type DocPage = DocLink & {
  description: string
  sidebar: string | null
  next: string | null
  prev: string | null
  html: string
  headings: Heading[]
}

export type Sidebar = {
  name: string
  sections: { title: string; items: string[] }[]
}

export type BlogPostSummary = {
  slug: string
  path: string
  title: string
  description: string
  category: string | null
  date: string | null
  dateLabel: string | null
  image: string | null
  authors: string[]
}

export type BlogPost = BlogPostSummary & {
  html: string
}

export type AuthUser = {
  id: number
  email: string
  fullName: string | null
}

export const RELEASE_CHANNELS = ['stable', 'beta'] as const
export type ReleaseChannel = (typeof RELEASE_CHANNELS)[number]

export type Release = {
  id: number
  identifier: string
  version: string
  versionMajor: number
  versionMinor: number
  versionPatch: number
  build: number
  commit: string
  title: string | null
  channel: ReleaseChannel
  notes: string | null
  windowsUrl: string | null
  macUrl: string | null
  linuxUrl: string | null
  itchUrl: string | null
  isPublished: boolean
  /** "ci" when drafted by the release workflow through the API. */
  source: 'ops' | 'ci'
  releasedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export type GalleryItem = {
  slug: string
  title: string
  date: string | null
  dateLabel: string | null
  image: string | null
  thumbnail: string | null
  html: string
}

export type ReleaseDownloads = {
  windows: string | null
  mac: string | null
  linux: string | null
  itch: string | null
}

/**
 * The published shape of a release, as served by the public download pages.
 */
export type ReleaseSummary = {
  identifier: string
  version: string
  channel: ReleaseChannel
  build: number
  commit: string
  title: string | null
  path: string
  releasedAt: string | null
  releasedAtLabel: string | null
  downloads: ReleaseDownloads
}

export type ReleaseDetail = ReleaseSummary & {
  notesHtml: string | null
}

/**
 * The shape `/api/releases/latest` serves the desktop app.
 */
export type ApiRelease = {
  identifier: string
  version: string
  channel: ReleaseChannel
  build: number
  commit: string
  title: string | null
  notes: string | null
  notesHtml: string
  releasedAt: string | null
  downloads: ReleaseDownloads
  pageUrl: string
}

/**
 * What each channel's update check returns right now.
 */
export type LiveReleases = Record<ReleaseChannel, Release | null>

/**
 * An API token as listed in /ops/tokens — never its value.
 */
export type ApiToken = {
  id: number
  name: string | null
  abilities: string[]
  createdBy: string
  createdAt: string | null
  lastUsedAt: string | null
  expiresAt: string | null
  status: 'active' | 'expired'
}

/**
 * Only present in the response that created the token.
 */
export type NewApiToken = {
  id: number
  name: string
  value: string
}
