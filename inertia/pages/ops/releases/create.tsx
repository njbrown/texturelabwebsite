import OpsLayout from '~/components/ops/ops_layout'
import ReleaseForm from '~/components/ops/release_form'

export default function ReleaseCreate() {
  return (
    <OpsLayout title="New release" description="Drafts stay off the public feed until published">
      <ReleaseForm />
    </OpsLayout>
  )
}
