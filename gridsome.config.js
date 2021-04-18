// This is where project configuration and plugin options are located.
// Learn more: https://gridsome.org/docs/config

// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

module.exports = {
  siteName: 'Gridsome',
  settings:{
    nav: {
      links: [
        { path: '/docs/', title: 'Docs' }
      ]
    },
    sidebar: [
      {
        name: 'docs',
        sections: [
          {
            title: 'Getting Started',
            items: [
              '/docs/',
              '/docs/test/',
              // '/docs/installation/',
              // '/docs/writing-content/',
              // '/docs/deploying/',
            ]
          },
          {
            title: 'Configuration',
            items: [
              // '/docs/settings/',
              // '/docs/sidebar/',
            ]
          }
        ]
      }
    ]
  },
  plugins: [
    {
      use: 'gridsome-plugin-tailwindcss',
      options: {
        tailwindConfig: './tailwind.config.js',
        purgeConfig: {
          // Prevent purging of prism classes.
          whitelistPatternsChildren: [
            /token$/
          ]
        }
      }
    },
    {
      use: '@gridsome/source-filesystem',
      options: {
        baseDir:'./content/docs',
        path: '**/*.md',
        typeName: 'DocPage',
        index: ['readme'], //  necessary to prevent conflicts between plugins
        remark: {
          externalLinksTarget: '_blank',
          externalLinksRel: ['noopener', 'noreferrer'],
          plugins: [
            '@gridsome/remark-prismjs'
          ]
        }
      }
    },
    {
			use: "@gridsome/vue-remark",
			options: {
				typeName: 'BlogPage',
				baseDir: "./content/blog",
				pathPrefix: '/blog',
				template: "./src/templates/BlogPage.vue",
				// route: "/blog/:slug",
				// refs: {
				// 	author: 'Author'
				// }
			}
		},
  ]
}
