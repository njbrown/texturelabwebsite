/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import '@fontsource/barlow/800.css'
import '../css/app.css'

import { hydrateRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import type { ComponentType } from 'react'

const appName = import.meta.env.VITE_APP_NAME || 'TextureLab'

createInertiaApp({
  progress: { color: '#60a5fa' },

  title: (title) => (title ? `${title} - ${appName}` : appName),

  resolve: (name) => {
    // Inertia resolves the module and unwraps `default` at runtime, but its
    // published types only describe the component itself.
    return resolvePageComponent(
      `../pages/${name}.tsx`,
      import.meta.glob('../pages/**/*.tsx') as Record<string, () => Promise<ComponentType<any>>>
    )
  },

  setup({ el, App, props }) {
    hydrateRoot(el, <App {...props} />)
  },
})
