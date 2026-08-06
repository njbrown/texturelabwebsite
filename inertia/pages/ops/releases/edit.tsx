import OpsLayout from '~/components/ops/ops_layout'
import ReleaseForm from '~/components/ops/release_form'
import type { Release } from '~/lib/types'

export default function ReleaseEdit({ release }: { release: Release }) {
  return (
    <OpsLayout
      title={`Release ${release.version}`}
      description={release.isPublished ? 'Published' : 'Draft'}
    >
      <ReleaseForm release={release} />
    </OpsLayout>
  )
}
