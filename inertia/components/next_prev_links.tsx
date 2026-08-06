import { Link } from '@inertiajs/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { DocLink, DocPage } from '~/lib/types'

export default function NextPrevLinks({ page, links }: { page: DocPage; links: DocLink[] }) {
  const prev = page.prev ? links.find((link) => link.path === page.prev) : undefined
  const next = page.next ? links.find((link) => link.path === page.next) : undefined

  if (!prev && !next) return null

  const style =
    'flex items-center rounded-lg border border-ui-border px-4 py-2 font-bold text-ui-primary transition-colors hover:bg-ui-primary hover:text-white'

  return (
    <div className="flex flex-col items-center justify-between sm:flex-row">
      {prev && (
        <Link href={prev.path} className={`${style} mr-auto mb-4 sm:mb-0`}>
          <ArrowLeft className="mr-2" size={16} />
          {prev.title}
        </Link>
      )}

      {next && (
        <Link href={next.path} className={`${style} ml-auto`}>
          {next.title}
          <ArrowRight className="ml-2" size={16} />
        </Link>
      )}
    </div>
  )
}
