import { useState } from 'react'
import ChannelBadge from '~/components/channel_badge'
import OpsLayout from '~/components/ops/ops_layout'
import PublishDialog, { PublishButton } from '~/components/ops/publish_dialog'
import ReleaseForm from '~/components/ops/release_form'
import type { LiveReleases, Release } from '~/lib/types'

export default function ReleaseEdit({ release, live }: { release: Release; live: LiveReleases }) {
  const [publishing, setPublishing] = useState(false)

  return (
    <OpsLayout
      title={`Release ${release.identifier}`}
      description={`Build ${release.build} · ${release.isPublished ? 'Published' : 'Draft'}`}
      actions={
        <>
          <ChannelBadge channel={release.channel} />
          <PublishButton release={release} onClick={() => setPublishing(true)} />
        </>
      }
    >
      {/* Keyed so the form picks up the saved values after a publish round-trip. */}
      <ReleaseForm key={release.updatedAt ?? release.id} release={release} />

      <PublishDialog
        release={publishing ? release : null}
        live={live}
        onClose={() => setPublishing(false)}
      />
    </OpsLayout>
  )
}
