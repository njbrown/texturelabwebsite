// This is the main.js file. Import global CSS and scripts here.
// The Client API can be used here. Learn more: gridsome.org/docs/client-api

import DefaultLayout from '~/layouts/Default.vue'
import "@fontsource/inter"
import "@fontsource/barlow"

// https://timdeschryver.dev/blog/gridsome-social-cards#social-media-cards
export default function (Vue, { router, head, isClient }) {
  // Set default layout as a global component
  Vue.component('Layout', DefaultLayout)

  head.meta.push({
    key: 'og:description',
    name: 'og:description',
    content: `Create beautiful procedural materials`,
  })

  head.meta.push({
    key: 'twitter:description',
    name: 'twitter:description',
    content: `Create beautiful procedural materials`,
  })

  router.beforeEach((to, _from, next) => {
    head.meta.push({
      key: 'og:url',
      name: 'og:url',
      content: process.env.GRIDSOME_BASE_PATH + to.path,
    })
    next()
  })
}
