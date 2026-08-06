# texturelab.io (v2)

The TextureLab website, built with [AdonisJS 6](https://adonisjs.com),
[Inertia](https://inertiajs.com), [React 19](https://react.dev) and
[Tailwind CSS 4](https://tailwindcss.com).

This replaces the v1 Gridsome/Vue site. Page content still lives as markdown under
`content/`, but it is now parsed and rendered by the server instead of at build time.

## Getting started

```bash
npm install
cp .env.example .env         # then set APP_KEY, e.g. `node ace generate:key`
node ace migration:run       # creates tmp/db.sqlite3
node ace db:seed             # creates the /ops admin from ADMIN_* env vars
npm run dev                  # http://localhost:3333
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
app/controllers/        public site (home, docs, blog, gallery)
app/controllers/api/    the public releases feed
app/controllers/ops/    the admin: session, dashboard, releases CRUD
app/models/             User, Release
app/services/           markdown rendering + content loading
config/site.ts          site metadata, nav and the docs sidebar
content/                markdown: docs/, blog/, gallery/
database/               migrations and the admin seeder
inertia/pages/          React pages, resolved by name from the controllers
inertia/pages/ops/      admin pages
inertia/components/ui/  shadcn/ui primitives
public/                 images and uploads (was `static/` in v1)
resources/views/        the Inertia root Edge template
```

Content (docs, blog, gallery) stays in markdown files. Releases live in the
database, because they are edited through the admin.

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

## Admin (`/ops`)

A session-authenticated admin, built with shadcn/ui on a sidebar app shell. It is
`noindex` and there is no public link to it.

- `/ops/login` — sign in
- `/ops` — overview: release counts, latest stable, recent releases
- `/ops/releases` — list, create, edit and delete releases

The admin account comes from the environment and is created (or updated) by the
seeder:

```bash
ADMIN_EMAIL=you@texturelab.io ADMIN_PASSWORD=... node ace db:seed
```

Re-running the seeder after changing `ADMIN_PASSWORD` rotates the password rather
than creating a second account. There is no sign-up route.

## Releases API

Public and unauthenticated — this is what the desktop app fetches on startup.
Only published releases are ever returned; drafts stay invisible.

| Endpoint                   | Description                                |
| -------------------------- | ------------------------------------------ |
| `GET /api/releases`        | Published releases, newest first           |
| `GET /api/releases/latest` | The newest published release for a channel |

Query parameters: `channel` (`stable` \| `beta`, defaults to all for the list and
to `stable` for `latest`) and `limit` (1–100, defaults to 20). Invalid parameters
return `422` with the messages; `latest` returns `404` when a channel has nothing
published. Responses are cacheable for 5 minutes.

```jsonc
// GET /api/releases/latest
{
  "data": {
    "version": "1.2.0",
    "title": "Nodes everywhere",
    "channel": "stable",
    "notes": "## Added\n- New nodes", // markdown, as authored
    "notesHtml": "<h2 id=\"added\">…", // rendered server-side
    "releasedAt": "2026-08-01T10:00:00.000+00:00",
    "downloads": { "windows": "https://…", "mac": null, "linux": null },
  },
}
```

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
`SESSION_DRIVER` (see `.env.example`), plus `ADMIN_EMAIL` / `ADMIN_PASSWORD` if
you want to seed the admin.

The database is SQLite. It defaults to `tmp/db.sqlite3`, which is **not**
persisted in the container — point `DB_FILE` at a mounted volume in production,
and run migrations on deploy:

```bash
node ace migration:run --force
node ace db:seed --force
```

## Notes on the v1 → v2 move

- Netlify CMS (`/admin`) is gone; content is edited as markdown files in this repo.
- The site now needs a database (SQLite) for the admin and releases; content
  itself is still flat files.
- The Google Analytics property was a Universal Analytics ID, which stopped
  collecting data in 2023 — it was not carried over. Hotjar is still included and
  only loads in production.
