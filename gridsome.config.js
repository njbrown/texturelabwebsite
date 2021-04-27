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
            ]
          },
          {
            title: 'Interface',
            items: [
              // '/docs/settings/',
              '/docs/interface/toolbar/',
              '/docs/interface/library/',
              '/docs/interface/editor/',
              '/docs/interface/3dview/',
              '/docs/interface/2dview/',
              '/docs/interface/settings/',
              '/docs/interface/menu/',
            ]
          },
          {
            title: 'Workflow',
            items: [
              // '/docs/settings/',
              '/docs/workflow/nodes/',
              '/docs/workflow/outputs/',
              '/docs/workflow/randomseed/',
              '/docs/workflow/resolution/',
              '/docs/workflow/exporting/'
            ]
          },
          {
            title: 'Tutorials',
            items: [
              '/docs/tutorials/cracked-tile-texture/',
            ]
          },
          {
            title: 'Development',
            items: [
              '/docs/development/building-from-source/',
              '/docs/development/creating-nodes/',
              '/docs/development/contributing/',
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
        pathPrefix: '/docs',
        typeName: 'DocPage',
        index: ['index'], //  necessary to prevent conflicts between plugins
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
				route: "/blog/:slug",
				// refs: {
				// 	author: 'Author'
				// }
			}
		},
  ]
}