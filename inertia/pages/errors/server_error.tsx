import { Link } from '@inertiajs/react'
import Seo from '~/components/seo'
import SiteLayout from '~/components/site_layout'

export default function ServerError({ error }: { error?: { message?: string } }) {
  return (
    <SiteLayout>
      <Seo title="Something went wrong" description="An unexpected error occurred." />

      <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
        <h1 className="font-display text-5xl font-bold text-gray-800">Something went wrong</h1>
        <p className="mt-4 text-lg text-gray-500">
          {error?.message || 'An unexpected error occurred.'}
        </p>
        <Link
          href="/"
          className="mt-8 rounded bg-gray-900 px-5 py-3 font-bold text-white hover:bg-gray-700"
        >
          Back home
        </Link>
      </div>
    </SiteLayout>
  )
}
