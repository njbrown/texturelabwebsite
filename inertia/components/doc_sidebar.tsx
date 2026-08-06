import { Link } from '@inertiajs/react'
import type { DocLink, Sidebar } from '~/lib/types'

type DocSidebarProps = {
  sidebar: Sidebar
  links: DocLink[]
  currentPath: string
  onNavigate?: () => void
}

export default function DocSidebar({ sidebar, links, currentPath, onNavigate }: DocSidebarProps) {
  const findPages = (items: string[]) =>
    items
      .map((item) => links.find((link) => link.path === item))
      .filter((link): link is DocLink => Boolean(link))

  return (
    <div className="px-4 pt-8 lg:pt-12">
      {sidebar.sections.map((section, index) => (
        <div
          key={section.title}
          className={`mb-4 border-ui-border pb-4 ${
            index < sidebar.sections.length - 1 ? 'border-b' : ''
          }`}
        >
          <h3 className="mb-1 text-sm font-semibold tracking-tight uppercase">{section.title}</h3>

          <ul className="mb-0 max-w-full pl-2">
            {findPages(section.items).map((page) => {
              const active = page.path === currentPath

              return (
                <li
                  key={page.path}
                  className={
                    active
                      ? 'text-ui-primary'
                      : 'transition hover:translate-x-1 hover:text-ui-primary'
                  }
                >
                  <Link
                    href={page.path}
                    onClick={onNavigate}
                    className="flex items-center py-1 font-semibold"
                  >
                    <span
                      className={`absolute -ml-3 h-2 w-2 origin-center rounded-full bg-ui-primary transition ${
                        active ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                      }`}
                    />
                    {page.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
