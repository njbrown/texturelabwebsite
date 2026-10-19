# Texture Gallery — Implementation Plan

Status: **approved — in progress** (decisions: markdown gallery dropped, CC0 site-wide, deploy via Dokploy Dockerfile build). Each stage ends in a working, shippable state and gets its
own commit. I'll stop after each stage for review.

- [ ] Stage 0 — Vendor the web runtime (submodule, build, Docker)
- [ ] Stage 1 — Object storage (MinIO locally, DO Spaces in prod)
- [ ] Stage 2 — Data model + metadata extraction
- [ ] Stage 3 — Ops: categories and texture upload
- [ ] Stage 4 — Ops: render outputs in the admin's browser
- [ ] Stage 5 — Public gallery (browse, search, categories)
- [ ] Stage 6 — Texture page (static details)
- [ ] Stage 7 — Live 3D view, parameters, presets, outputs lightbox, downloads
- [ ] Stage 8 — Hardening, polish, docs

---

## What I found

**This site:** AdonisJS 6 + Inertia/React 19 (SSR), Lucid on Postgres (SQLite also supported),
Redis, Tailwind 4, shadcn-style UI, `/ops` admin behind session auth. Today `/gallery` renders
markdown files from `content/gallery/` (one entry: `hex-texture.md`, a render image with no
`.texture` file).

**The runtime (`njbrown/texturelab` @ `web-runtime`, `web/packages/runtime`):**

- Package `@njbrown/texturelab-runtime` with two entry points: `.` (core: parse + WebGL2 evaluate)
  and `./viewer` (three.js PBR preview, `three` is a peer dep).
- `exports` point at `dist/` (built with `tsc`), plus a `texturelab-source` condition that points
  at the `.ts` sources.
- **`parseTexture()` runs in plain Node.** I built the package and parsed all 10 example files in
  Node 24 with no GPU. The server can therefore extract metadata on upload.
- **Rendering needs WebGL2, so it only works in a browser.** The server can't render outputs or
  thumbnails. Stage 4 renders them in the admin's browser at upload time.
- What a parsed document gives us: `libraryVersion` (v1/v2/v3), `width`/`height` (the saved
  resolution, a power of two from 32 to 4096), node count, `textureChannels` (subset of albedo,
  normal, metalness, roughness, height, alpha, ao), `variables` (float/int/bool/enum/color/
  gradient/curve/image/string, with bounds and options), `presets` (named variable snapshots;
  these are the "variants"), `activePreset`, and `skippedTypes` (nodes the runtime can't load).
  The raw JSON also has `appVersion` and `export.filePattern`.
- Evaluation outputs are the **PBR channels**, not arbitrary output nodes. Channels read back as
  RGBA8, except height, which reads back as float32. Max resolution defaults to 2048 and is capped
  by the GPU.
- The texturelab repo has **nested submodules**: `public/assets` (about 92 MB of examples/HDRIs)
  and a Qt docking library. We must **not** init them recursively.
- License is **GPL-3.0-only**. See open questions.

---

## Stage 0 — Vendor the web runtime

**Goal:** the website imports `@njbrown/texturelab-runtime` from a submodule, locally and in the
Docker build.

1. `git submodule add -b web-runtime https://github.com/njbrown/texturelab.git vendor/texturelab`
   - Set `shallow = true` in `.gitmodules`. Document that it is **non-recursive**
     (`git submodule update --init vendor/texturelab`, never `--recursive`).
2. `package.json`:
   - `"@njbrown/texturelab-runtime": "file:vendor/texturelab/web/packages/runtime"` in
     `dependencies` (the server imports it at runtime for metadata).
   - Add `three` (dependency) and `@types/three` (devDependency) at the versions the runtime
     targets (`^0.186`). tsc resolves them by walking up from `vendor/…` to our root
     `node_modules`.
   - `"runtime:build": "tsc -p vendor/texturelab/web/packages/runtime/tsconfig.json"`, plus
     `predev`, `prebuild`, `pretest` and `pretypecheck` hooks that call it. I'm not using
     `postinstall`, because it would also run during `npm ci --omit=dev`, where tsc isn't
     installed.
   - Bump `typescript` to `~5.9` if the runtime's sources need it (they're written against 5.9).
3. Keep the website's tooling out of vendored code: add `vendor` to `tsconfig.json` `exclude`,
   eslint ignores, and `.prettierignore`.
4. **Dockerfile**
   - `deps` stage: copy `vendor/texturelab/web/packages/runtime/package.json` before `npm ci` so the
     `file:` link resolves.
   - `build` stage: `npm run build` instead of `node ace build`, so `prebuild` compiles the
     runtime.
   - `production` stage: copy the runtime's `package.json` and `dist/` into the same relative
     path under `/app` before `npm ci --omit=dev`. Adonis's build copies our `package.json` and
     lockfile, which reference the `file:` path.
   - Fail fast with a clear message if `vendor/texturelab/web/packages/runtime/package.json` is
     missing (submodule not checked out).
5. **Deployment checkout:** whatever builds the image must check out submodules, top level only.
   GitHub Actions: `actions/checkout` with `submodules: true` (not `recursive`). DO App Platform:
   confirm it fetches submodules, or build the image in CI and push it to DOCR. I'll document both
   in the README.
6. Smoke check: a unit test that imports `parseTexture` on the server and parses a small fixture.
   `npm run build` and `docker build .` both succeed.

**Done when:** `npm run dev`, `npm test` and `docker build` all work from a fresh
`git clone --recurse-submodules`. With `--recurse-submodules` git still honors the per-submodule
setting, so the README gives the exact commands.

---

## Stage 1 — Object storage

**Goal:** one storage API that targets MinIO locally and DO Spaces in production.

1. Add `@adonisjs/drive` (flydrive) with the S3 driver. It works with both MinIO
   (`forcePathStyle: true`) and Spaces.
2. Env (validated in `start/env.ts`, documented in `.env.example`):
   `DRIVE_DISK=s3|fs`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
   `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, `S3_PUBLIC_URL` (the Spaces CDN URL in prod,
   the MinIO URL locally). The `fs` disk serves tests.
3. `docker-compose.yml`: add a `minio` service (random host ports, like the existing services,
   with a console port) and a one-shot `minio-init` (`minio/mc`) that creates the bucket and
   sets anonymous read on `public/*`.
4. Key layout:
   ```
   textures/<id>/source/<sha256>.texture      private; served through the app
   textures/<id>/outputs/<rev>/<channel>.png  public
   textures/<id>/images/<uuid>.<ext>          public (original upload)
   textures/<id>/images/<uuid>-512.webp       public (grid thumbnail)
   ```
   Content-addressed or revisioned keys let us set `Cache-Control: public, max-age=31536000,
   immutable` on public objects.
5. A `storage_service` that wraps put, delete, publicUrl and stream, so controllers never deal
   with S3 details.

**Done when:** a functional test round-trips a file through the `fs` disk, and a manual check
uploads to MinIO and fetches it by public URL.

---

## Stage 2 — Data model + metadata extraction

### Tables

**`texture_categories`**: `id`, `slug` (unique), `name`, `description?`, `sort_order`,
timestamps.

**`textures`**

| column | notes |
|---|---|
| `id`, `slug` (unique), `title`, `description` (markdown) | |
| `category_id` → categories (nullable, `SET NULL`) | |
| `tags` | text, normalized lowercase and comma-joined (searchable with LIKE on PG and SQLite) |
| `status` | `draft` \| `published`; plus `published_at` |
| `featured`, `sort_order` | curation |
| `source_key`, `source_sha256`, `source_bytes` | the `.texture` file |
| `library_version`, `app_version` | from the file |
| `resolution` | saved resolution (from `textureWidth`) |
| `node_count`, `connection_count` | |
| `channels` | json: channels the graph defines |
| `variables` | json: summary (name, displayName, type, min/max/step, enum options, default) |
| `presets` | json: `[{ id, name }]`, plus `active_preset` |
| `warnings` | json: `skippedTypes` and anything else the runtime flagged |
| `outputs_revision` | bumped every time outputs are re-rendered |
| `download_count` | |
| timestamps | |

**`texture_outputs`** (the default render, generated in Stage 4): `texture_id`, `revision`,
`channel`, `key`, `width`, `height`, `bit_depth` (8 or 16), `format` (`png`), `bytes`,
`render_target_format` (`rgba32f`/`rgba16f`/`rgba8` on the admin's GPU).

**`texture_images`** (admin-uploaded thumbnails and renders): `texture_id`, `key`,
`thumb_key`, `width`, `height`, `bytes`, `alt`, `is_primary`, `sort_order`.

### Metadata service

`texture_metadata_service.extract(buffer)`:

- Limit 10 MB. Image nodes can embed data URLs, so files can be much larger than the 5–30 KB
  examples.
- Parse with `parseTexture(text, { maxNodes: 2000 })`. A `TextureParseError` becomes a 422 with
  the message.
- Return every field above, plus SHA-256 and byte size.
- Unit tests against fixtures copied from `texturelabdata/examples` (a few small ones), plus a
  hand-made fixture with variables and presets, plus broken files.

---

## Stage 3 — Ops: categories and texture upload

Follows the existing `ops/releases` patterns (controllers, vine validators, Inertia pages, flash
errors, `OpsLayout`, sidebar entry).

- **`/ops/categories`**: list, create, rename, reorder, delete (only if empty, or textures move
  to "uncategorized").
- **`/ops/textures`**: table with thumbnail, title, category, status, resolution, outputs (yes/no),
  updated. Filter by status and category.
- **Create** (`/ops/textures/create`):
  1. Drop a `.texture` file. Its metadata (channels, resolution, node count, variables, presets,
     warnings) is shown before saving.
  2. Title (prefilled from the filename), slug (auto, editable), category, tags, markdown
     description (reuse `ops/markdown_editor`).
  3. Saves as **draft**.
- **Edit**: same fields, plus:
  - Replace `.texture`. Re-extracts metadata and marks outputs stale.
  - Images: upload multiple (png/jpg/webp, max 10 MB each), pick primary, reorder, delete.
    `sharp` creates the 512px webp grid thumbnail.
  - Publish / unpublish. Publishing requires a primary image or rendered outputs.
  - Delete removes the database rows and storage objects.
- All routes go in the existing `middleware.auth()` group. Functional tests cover auth, upload
  validation, slug uniqueness and publish rules.

---

## Stage 4 — Ops: render outputs in the browser

The server can't run WebGL, so the admin's browser renders the "default" outputs on the edit
page and uploads them. Public pages can then show real output details (size, bit depth,
resolution) and thumbnails without any visitor loading the runtime.

1. "Render outputs" on the edit page (auto-runs after a create or a file replace):
   - Load the runtime, fetch the source through an ops route, and `evaluate` at the file's
     resolution (capped by the GPU), with a progress bar from `onProgress`.
   - Encode each channel as PNG: 8-bit RGBA or grey for color and masks, **16-bit grey for
     height** (float source). Use `fast-png`, since canvas only writes 8-bit. Flip rows, because
     GL order is bottom-to-top.
   - Upload as multipart to `/ops/textures/:id/outputs`. The server records `texture_outputs`
     with a new revision and deletes the previous revision's objects.
   - Show runtime warnings (unsupported nodes, shader errors). Saving is allowed, but the warnings
     are stored on the texture.
2. **Auto thumbnail:** the same page snapshots the three.js viewer (sphere, default sky) and offers
   it as the primary image if the admin hasn't uploaded one.
3. A "stale outputs" badge in the list when the file has changed since the last render.

---

## Stage 5 — Public gallery

Replaces the markdown gallery. `content/gallery/` and `getGalleryItems` are removed.

- **Routes**
  - `/gallery`: all published textures.
  - `/gallery/:category`: a category view. Real paths for SEO, not just a query param.
  - Query params: `q` (search), `sort` (`featured` default, `newest`, `name`), `page`.
- **Layout** (taking cues from a23d, gametextures and the Substance asset browser):
  - Header band in the existing site style.
  - Category list: a sidebar on desktop, a horizontal chip row on mobile, with counts.
  - Search box. Debounced, uses Inertia partial reloads, and syncs to the URL.
  - Responsive square-card grid (2/3/4/5 columns). Each card shows the primary thumbnail
    (`loading="lazy"`, webp), title, category, and small badges for resolution and channel count.
    On hover it swaps to the second image or the albedo output if there is one.
  - Pagination (24 per page) with real links, so it works without JS and is crawlable.
  - Empty and no-results states.
- Clicking a card **navigates** to `/textures/:slug`, a full page and not a modal.
- **Search:** case-insensitive match on title, tags, description and category name, using
  `ILIKE` on Postgres and `LIKE` on SQLite. That's enough for a curated catalog. Postgres
  full-text search can be added later if it grows.
- SEO: `Seo` component per page, canonical URLs, category pages indexed, `og:image` = primary
  thumbnail.

---

## Stage 6 — Texture page (static details)

`/textures/:slug`: drafts return 404 unless you're logged into `/ops` (preview).

- **Hero:** large primary image with an image strip for other renders. A prominent
  **"Load 3D preview"** button replaces the hero in place (Stage 7). Nothing heavy loads until
  it's clicked.
- **Details panel:**
  - Title, category (linked), tags (each a search link), markdown description, published date.
  - **Resolution:** saved resolution, plus what's downloadable (up to 2048, or 4096 where the GPU
    allows, in the live view).
  - **Outputs table**, from `texture_outputs`: channel, resolution, bit depth, format, size (KB).
  - **Source file:** `.texture` size (KB), node count, library version, saved with TextureLab
    `appVersion`.
  - **Parameters:** count and names, plus preset names (variants).
  - Primary CTA: **Download .texture** (`/textures/:slug/source`). Streams from storage, sets
    `Content-Disposition`, increments `download_count`, and is rate-limited.
  - Secondary CTA: "Open in TextureLab" or download the app (links to `/download`).
- **Default outputs grid:** thumbnails of the pre-rendered channel PNGs. Each opens in the
  lightbox (shared with Stage 7) and can be downloaded individually.
- Related textures in the same category.

---

## Stage 7 — Live 3D view, parameters, presets, outputs

All client-side, loaded with a dynamic `import()` on click, so the runtime and three.js never
reach the SSR bundle or the gallery page.

- **Capability check:** if WebGL2 isn't available, show a friendly message and keep the static
  page.
- **3D viewer** (`createViewer` from `/viewer`):
  - Mesh: sphere, cube, plane, cylinder.
  - Environment: the runtime's `SKY_PRESETS` plus studio. I'll host a couple of 1k HDRIs in the
    bucket if you want.
  - Tiling, displacement scale, exposure, normal convention (OpenGL/DirectX).
- **Parameters panel**, generated from `doc.variables`:
  - float/int: slider + number input (min/max/step).
  - bool: switch. enum: select. color: color picker.
  - gradient, curve, image: read-only label in v1. Editors for these are open question 4.
  - Each change calls `setVariable` and runs a debounced re-`evaluate`. In-flight renders are
    cancelled with `AbortSignal`. A progress indicator shows while rendering. "Reset" calls
    `resetVariables`.
- **Variants:** preset picker from `doc.presets` (`applyPreset`). It starts on `activePreset`.
- **Resolution selector** for the live render and downloads: 512 / 1024 / 2048 (4096 if the GPU
  allows). The preview renders at 1024 by default to stay fast. Downloads re-render at the chosen
  size.
- **Outputs strip below the 3D preview:** one tile per channel, updated live after each render.
  Clicking a tile opens a **lightbox**: the full channel image with prev/next and keyboard
  navigation, plus its resolution, bit depth and estimated size.
- **Downloads** from the live render, so they include parameter changes:
  - Per output: PNG (8-bit, or 16-bit for height), named with the file's `exportFilePattern`
    (`${project}_${name}`) → `copper_albedo.png`.
  - **All as .zip:** client-side with `fflate`, plus a small `README.txt` listing the parameters
    and preset used.
  - Optional (open question 5): download the modified `.texture`, with the changed variable
    values written back.
- Free GPU resources on unmount (`result.dispose()`, viewer dispose) and when navigating away.
- CPU nodes (floodfill, etc.) take about 1 s at 2048 on the main thread. That's acceptable for
  v1; moving the runtime to a worker is a later runtime change.

---

## Stage 8 — Hardening and polish

- Rate limits: source download and ops upload endpoints (existing limiter).
- Caching: immutable cache headers on public objects. Short cache on gallery HTML.
- Accessibility: alt text from `texture_images.alt`, keyboard-navigable lightbox, focus
  management.
- Mobile: viewer and parameters stack vertically, and parameters move into a sheet.
- Tests: functional tests for gallery filters, search and pagination; 404s for drafts; download
  headers. The runtime's GPU paths are covered by its own playwright smoke tests, not ours.
- README: submodule workflow (updating the runtime pin), MinIO setup, Spaces env, deploy notes.

---

## Open questions (my default in **bold**)

1. **License.** The runtime is GPL-3.0-only, and Stage 7 ships it to browsers inside this
   site's client bundle, which is marked `UNLICENSED`. Since you own both, are you fine with that
   combination, or do you want to dual-license or relicense the runtime package?
   **Assume it's fine; your call.**
2. **The existing hex-texture gallery entry** has no `.texture` file. **Drop the markdown gallery
   and re-add Hex via ops once you have its file.** Alternatively, I keep a one-off import.
3. **Texture license and attribution** shown on each page (e.g. CC0)? **One site-wide license
   line for now, with a per-texture field later.**
4. **Gradient, curve and image variables** in the parameter panel: **read-only in v1.** A
   gradient editor is a decent chunk of work on its own.
5. **"Download modified .texture"** with your parameter changes baked in: **not in v1.** It needs a
   serializer in the runtime, which only parses today.
6. **Max download resolution:** **2048 by default, 4096 when the GPU supports it.**
7. **Deploy target:** DO App Platform building from the repo, or images built in CI and pushed to
   DOCR? This decides how submodule checkout is handled. **I'll document both.**
8. **Runtime source vs dist in dev:** **use `dist` everywhere** (one code path, same as prod).
   If you're co-developing the runtime, I can add the `texturelab-source` Vite condition in dev
   for HMR.
