import { Link, router, usePage } from '@inertiajs/react'
import { FileText, Images, LayoutDashboard, LogOut, Package, ExternalLink } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar'
import type { AuthUser } from '~/lib/types'

const NAV = [
  { title: 'Overview', url: '/ops', icon: LayoutDashboard },
  { title: 'Releases', url: '/ops/releases', icon: Package },
]

const SITE_LINKS = [
  { title: 'Docs', url: '/docs', icon: FileText },
  { title: 'Blog', url: '/blog', icon: FileText },
  { title: 'Gallery', url: '/gallery', icon: Images },
]

export default function OpsSidebar({ currentPath }: { currentPath: string }) {
  const user = usePage().props.user as AuthUser | null

  function logout(event: React.MouseEvent) {
    event.preventDefault()
    router.post('/ops/logout')
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/images/logo.png" alt="" className="size-7" />
          <div className="leading-tight">
            <div className="font-semibold text-sidebar-foreground">TextureLab</div>
            <div className="text-xs text-muted-foreground">Ops</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === '/ops'
                        ? currentPath === '/ops'
                        : currentPath.startsWith(item.url)
                    }
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Public site</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SITE_LINKS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                      <ExternalLink className="ml-auto size-3 opacity-50" />
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {user?.email ?? 'Signed in'}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut className="size-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
