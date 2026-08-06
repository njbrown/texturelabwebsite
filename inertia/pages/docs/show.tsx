import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import DocSidebar from '~/components/doc_sidebar'
import NextPrevLinks from '~/components/next_prev_links'
import OnThisPage from '~/components/on_this_page'
import Seo from '~/components/seo'
import SiteFooter from '~/components/site_footer'
import SiteHeader from '~/components/site_header'
import type { DocLink, DocPage, Sidebar } from '~/lib/types'

type DocsShowProps = {
  page: DocPage
  sidebar: Sidebar | null
  links: DocLink[]
}

export default function DocsShow({ page, sidebar, links }: DocsShowProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-ui-background text-ui-typo">
      <Seo title={page.title} description={page.description} />

      <div className="sticky top-0 z-30 w-full border-b border-ui-border">
        <SiteHeader />
      </div>

      <main className="container relative mx-auto flex w-full flex-1 flex-wrap justify-start px-4">
        {sidebar && (
          <aside
            className={`fixed inset-x-0 bottom-0 z-40 w-full overflow-y-auto border-r border-ui-border bg-ui-background px-4 transition-transform lg:sticky lg:top-0 lg:bottom-auto lg:z-0 lg:inset-x-auto lg:w-1/6 lg:translate-x-0 lg:bg-transparent lg:px-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ top: '4rem', height: 'calc(100vh - 4rem)' }}
          >
            <div className="w-full bg-ui-background pb-16">
              <DocSidebar
                sidebar={sidebar}
                links={links}
                currentPath={page.path}
                onNavigate={() => setSidebarOpen(false)}
              />
            </div>
          </aside>
        )}

        <div className={`w-full pb-24 ${sidebar ? 'lg:w-5/6 lg:pl-12' : ''}`}>
          <div className="flex flex-wrap items-start justify-start">
            <div
              className="order-2 w-full sm:pl-4 md:sticky md:w-1/4 md:pl-6 lg:pl-8"
              style={{ top: '4rem' }}
            >
              <OnThisPage headings={page.headings} path={page.path} />
            </div>

            <article className="order-1 w-full pt-8 md:w-3/4">
              <div className="markdown" dangerouslySetInnerHTML={{ __html: page.html }} />

              <div className="mt-8 border-t border-ui-border pt-8 lg:mt-12 lg:pt-12">
                <NextPrevLinks page={page} links={links} />
              </div>
            </article>
          </div>
        </div>
      </main>

      {sidebar && (
        <div className="fixed right-0 bottom-0 z-50 p-8 lg:hidden">
          <button
            type="button"
            className="rounded-full bg-ui-primary p-3 text-white shadow-lg"
            aria-label="Toggle docs navigation"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      )}

      <SiteFooter />
    </div>
  )
}
