import { useEffect, useState, type ReactNode } from 'react'
import { Head, usePage } from '@inertiajs/react'
import { CheckCircle2, X } from 'lucide-react'
import { Separator } from '~/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import OpsSidebar from './ops_sidebar'
import { useCurrentPath } from '~/lib/use_site'

type OpsLayoutProps = {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export default function OpsLayout({ title, description, actions, children }: OpsLayoutProps) {
  const currentPath = useCurrentPath()
  const notification = usePage().props.notification as string | null
  const [flash, setFlash] = useState<string | null>(notification)

  useEffect(() => setFlash(notification), [notification])

  return (
    <div className="ops-shell bg-background text-foreground">
      <Head title={`${title} · Ops`}>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <SidebarProvider>
        <OpsSidebar currentPath={currentPath} />

        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold">{title}</h1>
              {description && (
                <p className="truncate text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>

          <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            {flash && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                <CheckCircle2 className="size-4" />
                <span className="flex-1">{flash}</span>
                <button
                  type="button"
                  onClick={() => setFlash(null)}
                  aria-label="Dismiss"
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
