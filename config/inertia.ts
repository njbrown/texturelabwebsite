import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import site from '#config/site'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    site: () => ({
      name: site.name,
      description: site.description,
      tagline: site.tagline,
      url: site.url,
      nav: site.nav,
      links: site.links,
    }),
    currentPath: (ctx) => ctx.request.url(),

    /**
     * Only set once a request has gone through the auth middleware, so the
     * public pages simply see `null`.
     */
    user: (ctx) => {
      const user = ctx.auth?.user
      return user ? { id: user.id, email: user.email, fullName: user.fullName } : null
    },

    errors: (ctx) => ctx.session?.flashMessages.get('errors') ?? {},
    notification: (ctx) => ctx.session?.flashMessages.get('notification') ?? null,
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: true,
    entrypoint: 'inertia/app/ssr.tsx',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {}
}
