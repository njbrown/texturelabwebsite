import type { ReactNode } from 'react'
import SiteFooter from './site_footer'
import SiteHeader from './site_header'

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
