import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import Release, { type ReleaseChannel } from '#models/release'

/**
 * Sample release history for local work on the /download pages and the ops
 * release editor. The container entrypoint only ever seeds `admin_seeder`, but
 * this refuses to run in production regardless — these are made up builds
 * pointing at download URLs that do not exist.
 *
 * Keyed on version, so re-running it updates the rows rather than duplicating
 * them and never touches a release that was created by hand.
 */

const GITHUB = 'https://github.com/njbrown/texturelab/releases/download'

type Seed = {
  version: string
  title: string | null
  channel: ReleaseChannel
  releasedAt: string
  platforms: ('windows' | 'mac' | 'linux')[]
  isPublished?: boolean
  notes: string
}

const RELEASES: Seed[] = [
  {
    version: '0.9.0',
    title: 'First public build',
    channel: 'stable',
    releasedAt: '2023-11-14',
    platforms: ['windows'],
    notes: `## Added

- Node graph editor with live previews on every node
- Shape, noise and filter nodes — all seamless by default
- 2D and 3D preview panes
- PNG export at 512, 1024 and 2048

> Windows only for now. macOS and Linux builds are coming once the GPU path is stable on both.`,
  },
  {
    version: '0.9.1',
    title: null,
    channel: 'stable',
    releasedAt: '2023-12-02',
    platforms: ['windows'],
    notes: `## Fixed

- Crash when deleting a node that was still connected downstream
- Preview thumbnails going black after an undo
- \`Ctrl+S\` saving to the wrong path when the project had been renamed`,
  },
  {
    version: '1.0.0',
    title: 'TextureLab 1.0',
    channel: 'stable',
    releasedAt: '2024-02-20',
    platforms: ['windows', 'mac', 'linux'],
    notes: `The first stable release. Thanks to everyone who filed issues during the
0.9 previews — a lot of this came straight out of that feedback.

## Added

- macOS and Linux builds
- Library panel with search and drag-to-place
- Project files (\`.tlab\`) with a stable on-disk format
- Metallic PBR output set: albedo, normal, roughness, metalness, height

## Changed

- Node properties moved into their own dockable panel
- Default resolution is now 1024, up from 512

## Fixed

- Random seed no longer changes when the canvas is resized`,
  },
  {
    version: '1.0.2',
    title: null,
    channel: 'stable',
    releasedAt: '2024-03-08',
    platforms: ['windows', 'mac', 'linux'],
    notes: `## Fixed

- macOS builds refusing to open on first launch
- Blend node ignoring its opacity input
- Export dialog forgetting the last used directory`,
  },
  {
    version: '1.1.0',
    title: 'Nodes everywhere',
    channel: 'stable',
    releasedAt: '2024-05-30',
    platforms: ['windows', 'mac', 'linux'],
    notes: `## Added

- 12 new nodes, including \`Voronoi\`, \`Warp\`, \`Curve\` and \`Gradient Map\`
- Node search — hit <kbd>Tab</kbd> on the canvas to place one by name
- Comment boxes for annotating a graph

## Changed

- Graph evaluation is incremental, so only the nodes downstream of an edit
  re-render

## Fixed

- Undo history growing without bound on large graphs`,
  },
  {
    version: '1.2.0',
    title: 'Unity export',
    channel: 'stable',
    releasedAt: '2024-09-12',
    platforms: ['windows', 'mac', 'linux'],
    notes: `## Added

- Export straight to a Unity material — see [the docs](/docs/workflow/exporting)
- Batch export of every output node in one pass
- Per-output resolution overrides

## Fixed

- Normal maps exporting with an inverted green channel
- Tiling seams on the \`Warp\` node at non-power-of-two resolutions`,
  },
  {
    version: '1.2.1',
    title: null,
    channel: 'stable',
    releasedAt: '2024-10-01',
    platforms: ['windows', 'mac', 'linux'],
    notes: `## Fixed

- Unity export writing an empty material when the project had never been saved
- Slow first render after opening a project with more than 60 nodes`,
  },
  {
    version: '1.3.0',
    title: 'Faster graphs',
    channel: 'stable',
    releasedAt: '2025-01-23',
    platforms: ['windows', 'mac', 'linux'],
    notes: `## Changed

- Node previews render on the GPU in a single pass, roughly 4x faster on large
  graphs
- Project files are compressed — expect them to be about a third of the size

## Added

- Pin a node's preview to the 2D view
- \`Ctrl+D\` duplicates the selection in place

## Fixed

- Memory not being released when closing a project`,
  },
  {
    version: '1.4.0',
    title: 'Custom nodes',
    channel: 'stable',
    releasedAt: '2025-05-07',
    platforms: ['windows', 'mac', 'linux'],
    notes: `## Added

- Write your own nodes in GLSL — see
  [creating nodes](/docs/development/creating-nodes)
- Reusable node groups
- A starter library of 20 community nodes

## Changed

- The library panel groups nodes by category instead of one flat list`,
  },
  {
    version: '1.4.2',
    title: null,
    channel: 'stable',
    releasedAt: '2025-06-19',
    platforms: ['windows', 'mac', 'linux'],
    notes: `## Fixed

- Custom nodes losing their parameters when a project was reopened
- Editor freezing when a GLSL node failed to compile — it now reports the
  compiler error on the node instead`,
  },
  {
    version: '1.5.0',
    title: 'Layers',
    channel: 'stable',
    releasedAt: '2025-11-04',
    platforms: ['windows', 'mac', 'linux'],
    notes: `## Added

- Layer stack, so a material can be composed without wiring every blend by hand
- Masks on any layer
- Drag a texture in from the desktop to create an image node

## Changed

- New default project template

## Fixed

- Height output being clamped to 8 bits on export`,
  },
  {
    version: '1.5.1',
    title: null,
    channel: 'stable',
    releasedAt: '2026-02-11',
    platforms: ['windows', 'mac', 'linux'],
    notes: `## Fixed

- Masks rendering one layer too low in the stack
- Crash on startup for GPUs without \`OES_texture_float_linear\``,
  },
  {
    version: '2.0.0-beta.1',
    title: 'The 2.0 preview',
    channel: 'beta',
    releasedAt: '2026-06-15',
    platforms: ['windows', 'linux'],
    notes: `First preview of 2.0. **Do not use this on work you cannot afford to lose** —
the project format has changed and 1.x cannot open what it writes.

## Added

- Rebuilt renderer with compute shader support
- Non-destructive history you can scrub through
- Multi-material projects

## Known issues

- macOS build is not ready yet
- Unity export is disabled in this preview`,
  },
  {
    version: '2.0.0-beta.2',
    title: null,
    channel: 'beta',
    releasedAt: '2026-08-03',
    platforms: ['windows', 'linux'],
    notes: `## Added

- Unity export is back
- History scrubbing now shows a preview at each step

## Fixed

- Projects saved by beta.1 failing to reopen
- Compute path falling back to the old renderer on some AMD cards`,
  },
  {
    version: '2.0.0',
    title: 'Not out yet',
    channel: 'stable',
    releasedAt: '2026-09-30',
    platforms: ['windows', 'mac', 'linux'],
    isPublished: false,
    notes: `Draft notes for the 2.0 release — this one is unpublished, so it should not
appear anywhere on the public site.`,
  },
]

function downloadUrl(version: string, platform: 'windows' | 'mac' | 'linux') {
  const file = {
    windows: `TextureLab-${version}-win-x64.zip`,
    mac: `TextureLab-${version}-mac-universal.dmg`,
    linux: `TextureLab-${version}-linux-x86_64.AppImage`,
  }[platform]

  return `${GITHUB}/v${version}/${file}`
}

export default class extends BaseSeeder {
  async run() {
    if (app.inProduction) {
      throw new Error('The release seeder writes sample data and must not run in production')
    }

    for (const seed of RELEASES) {
      await Release.updateOrCreate(
        { version: seed.version },
        {
          title: seed.title,
          channel: seed.channel,
          notes: seed.notes,
          windowsUrl: seed.platforms.includes('windows')
            ? downloadUrl(seed.version, 'windows')
            : null,
          macUrl: seed.platforms.includes('mac') ? downloadUrl(seed.version, 'mac') : null,
          linuxUrl: seed.platforms.includes('linux') ? downloadUrl(seed.version, 'linux') : null,
          isPublished: seed.isPublished ?? true,
          releasedAt: DateTime.fromISO(`${seed.releasedAt}T10:00:00`, { zone: 'utc' }),
        }
      )
    }

    logger.info(`Seeded ${RELEASES.length} sample releases`)
  }
}
