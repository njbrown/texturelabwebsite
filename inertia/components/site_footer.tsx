import { Link } from '@inertiajs/react'
import { DiscordIcon, GithubIcon, TwitterIcon } from './icons'
import { useSite } from '~/lib/use_site'

export default function SiteFooter() {
  const site = useSite()
  const year = new Date().getUTCFullYear()

  const socials = [
    { href: site.links.twitter, label: 'Twitter', Icon: TwitterIcon },
    { href: site.links.github, label: 'GitHub', Icon: GithubIcon },
    { href: site.links.discord, label: 'Discord', Icon: DiscordIcon },
  ]

  return (
    <footer className="bg-gray-800 py-4 text-gray-300">
      <div className="container mx-auto grid px-4 md:grid-cols-2">
        <div className="text-center md:text-left">
          <Link className="inline-block px-4 py-4" href="/">
            © {year} {site.name}, All Rights Reserved
          </Link>
        </div>
        <div className="flex items-center justify-center md:justify-end">
          {socials.map(({ href, label, Icon }) => (
            <a
              key={label}
              className="mx-1 px-2 py-2 hover:text-gray-500"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
            >
              <Icon size={20} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
