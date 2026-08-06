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

export type GalleryItem = {
  slug: string
  title: string
  date: string | null
  dateLabel: string | null
  image: string | null
  thumbnail: string | null
  html: string
}
