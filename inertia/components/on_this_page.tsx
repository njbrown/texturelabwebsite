import { useEffect, useState } from 'react'
import type { Heading } from '~/lib/types'

const INDENT: Record<number, string> = {
  2: 'pl-0',
  3: 'pl-2',
  4: 'pl-3',
  5: 'pl-4',
  6: 'pl-5',
}

/**
 * Table of contents for the current doc page. The active entry follows the
 * heading that is currently intersecting the top of the viewport.
 */
export default function OnThisPage({ headings, path }: { headings: Heading[]; path: string }) {
  const [activeAnchor, setActiveAnchor] = useState('')
  const entries = headings.filter((heading) => heading.depth > 1)

  useEffect(() => {
    if (window.location.hash) {
      setActiveAnchor(window.location.hash)
    }

    const observer = new IntersectionObserver(
      (intersections) => {
        // Guards against the active entry jumping around when several
        // headings enter the viewport at once (e.g. after an anchor click).
        if (intersections.length > 1) return

        const id = intersections[0]?.target.id
        if (!id) return

        setActiveAnchor(`#${id}`)
        history.replaceState(null, '', `#${id}`)
      },
      { rootMargin: '0px 0px 99999px', threshold: 1 }
    )

    document
      .querySelectorAll('.markdown h2, .markdown h3, .markdown h4, .markdown h5, .markdown h6')
      .forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [path])

  if (!entries.length) return null

  return (
    <div className="mt-8 border-ui-border sm:border-l sm:pb-16 sm:pl-4 md:mt-0 md:pt-12 md:pl-6 lg:pl-8">
      <h3 className="mt-0 pt-0 text-sm font-semibold tracking-wide uppercase">On this page</h3>
      <ul>
        {entries.map((heading, index) => {
          const active = activeAnchor === heading.anchor

          return (
            <li
              key={`${path}${heading.anchor}`}
              className={[
                index > 0 && heading.depth === 2
                  ? 'mt-2 border-t border-dashed border-ui-border pt-2'
                  : '',
                heading.depth === 2 ? 'font-semibold' : '',
              ].join(' ')}
            >
              <a
                href={`${path}${heading.anchor}`}
                className={`relative flex items-center py-1 text-sm transition hover:translate-x-1 ${
                  INDENT[heading.depth] ?? ''
                } ${active ? 'font-bold text-ui-primary' : ''}`}
              >
                <span
                  className={`absolute -ml-3 h-2 w-2 origin-center rounded-full bg-ui-primary transition ${
                    active ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                  }`}
                />
                {heading.value}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
