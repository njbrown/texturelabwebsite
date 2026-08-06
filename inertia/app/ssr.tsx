import ReactDOMServer from 'react-dom/server'
import { createInertiaApp } from '@inertiajs/react'
import type { ComponentType } from 'react'

export default function render(page: any) {
  return createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) => {
      const pages = import.meta.glob<{ default: ComponentType<any> }>('../pages/**/*.tsx', {
        eager: true,
      })
      return pages[`../pages/${name}.tsx`]
    },
    setup: ({ App, props }) => <App {...props} />,
  })
}
