import { useState } from 'react'
import { Link } from '@inertiajs/react'
import { Menu, X } from 'lucide-react'
import { GithubIcon } from './icons'
import { useSite } from '~/lib/use_site'

export default function SiteHeader() {
  const site = useSite()
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-gray-900 text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 py-4 text-lg">
            <img src="/images/logo.svg" alt="" className="h-[1.3em]" />
            {site.name}
          </Link>

          <nav className="hidden items-center md:flex">
            <Link className="px-4 py-4 text-lg hover:text-gray-300" href="/download">
              Download
            </Link>
            {site.nav.map((item) => (
              <Link
                key={item.path}
                className="px-4 py-4 text-lg hover:text-gray-300"
                href={item.path}
              >
                {item.title}
              </Link>
            ))}
            <a
              className="px-4 py-4 hover:text-gray-300"
              href={site.links.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TextureLab on GitHub"
            >
              <GithubIcon className="inline-block" size={20} />
            </a>
          </nav>

          <button
            type="button"
            className="p-3 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <nav className="flex flex-col border-t border-gray-800 pb-3 md:hidden">
            <Link className="py-3 text-lg" href="/download" onClick={() => setOpen(false)}>
              Download
            </Link>
            {site.nav.map((item) => (
              <Link
                key={item.path}
                className="py-3 text-lg"
                href={item.path}
                onClick={() => setOpen(false)}
              >
                {item.title}
              </Link>
            ))}
            <a
              className="py-3 text-lg"
              href={site.links.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </nav>
        )}
      </div>
    </header>
  )
}
