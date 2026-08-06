# texturelab.io (v2)

The TextureLab website, built with [AdonisJS 6](https://adonisjs.com),
[Inertia](https://inertiajs.com), [React 19](https://react.dev) and
[Tailwind CSS 4](https://tailwindcss.com).

This replaces the v1 Gridsome/Vue site. Page content still lives as markdown under
`content/`, but it is now parsed and rendered by the server instead of at build time.

## Getting started

```bash
npm install
cp .env.example .env   # then set APP_KEY, e.g. `node ace generate:key`
npm run dev            # http://localhost:3333
```

## Scripts

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Dev server with HMR                             |
| `npm run build`     | Production build into `build/`                  |
| `npm start`         | Run the built server (from `build/`)            |
| `npm test`          | Unit + functional suites                        |
| `npm run lint`      | ESLint                                          |
| `npm run format`    | Prettier                                        |
| `npm run typecheck` | `tsc --noEmit` (backend; see below for the SPA) |

The React side has its own tsconfig: `npx tsc --noEmit -p inertia/tsconfig.json`.

## Layout

```
app/controllers/        one controller per section (home, docs, blog, gallery)
app/services/           markdown rendering + content loading
config/site.ts          site metadata, nav and the docs sidebar
content/                markdown: docs/, blog/, gallery/
inertia/pages/          React pages, resolved by name from the controllers
inertia/components/     header, footer, docs sidebar, table of contents, SEO
public/                 images and uploads (was `static/` in v1)
resources/views/        the Inertia root Edge template
```

## Content

Markdown is read from `content/` at request time, parsed with `markdown-it`
(front matter via `gray-matter`, syntax highlighting via `shiki`) and cached in
memory in production. In development the cache is bypassed, so edits show up on
reload without restarting the server.

**Docs** — file path determines the URL: `content/docs/index.md` → `/docs`,
`content/docs/interface/toolbar.md` → `/docs/interface/toolbar`. Front matter:

```yaml
---
description: '' # used for meta tags
sidebar: 'docs' # which sidebar from config/site.ts to show
next: '/docs/interface/library' # optional
prev: '/docs/interface/toolbar' # optional
---
```

The page title is the first `# heading` unless `title:` is set. Sidebar ordering
lives in `config/site.ts` — a page is only linked from the sidebar if it is
listed there.

**Blog** — `content/blog/*.md`, with `title`, `description`, `date`, `image`,
`draft` and an optional `slug` (defaults to the filename). Drafts are excluded
and posts are sorted newest first.

**Gallery** — `content/gallery/*.md`, with `title`, `date`, `image`, `thumbnail`
and `description`.

Image paths written the v1 way (`../../static/images/foo.png`) are rewritten onto
`/images/foo.png` automatically.

## Rendering

Pages are server-side rendered (`config/inertia.ts` → `ssr.enabled`) and then
hydrated on the client, so crawlers get complete HTML for the marketing and docs
pages.

## Deploying

v1 was a static Netlify build; v2 is a Node server, so it needs a Node host
(Fly.io, Render, a container platform, etc.) rather than Netlify's static
publish. The included `Dockerfile` produces a runnable image:

```bash
docker build -t texturelab-site .
docker run -p 3333:3333 -e APP_KEY=... -e HOST=0.0.0.0 texturelab-site
```

Required env vars: `APP_KEY`, `HOST`, `PORT`, `NODE_ENV`, `LOG_LEVEL`,
`SESSION_DRIVER` (see `.env.example`).

## Notes on the v1 → v2 move

- Netlify CMS (`/admin`) is gone; content is edited as markdown files in this repo.
- The Google Analytics property was a Universal Analytics ID, which stopped
  collecting data in 2023 — it was not carried over. Hotjar is still included and
  only loads in production.
