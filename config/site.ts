/*
|--------------------------------------------------------------------------
| Site configuration
|--------------------------------------------------------------------------
|
| Site wide metadata, navigation and the docs sidebar. This is the v2 port of
| the `settings` block that used to live in `gridsome.config.js`.
|
*/

export type SidebarSection = {
  title: string
  items: string[]
}

export type Sidebar = {
  name: string
  sections: SidebarSection[]
}

const site = {
  name: 'TextureLab',
  description: 'Procedural texture creation made easy',
  tagline: 'Create beautiful procedural materials easily',
  url: 'https://texturelab.io',

  links: {
    download: 'https://njbrown.itch.io/texturelab',
    github: 'https://github.com/njbrown/texturelab',
    discord: 'https://discord.gg/975NdQPsSc',
    twitter: 'https://twitter.com/njbrown92',
    itchCommunity: 'https://njbrown.itch.io/texturelab/community',
    roadmap: 'https://github.com/njbrown/texturelab/projects',
    issues: 'https://github.com/njbrown/texturelab/issues',
    pulls: 'https://github.com/njbrown/texturelab/pulls',
  },

  nav: [
    { path: '/docs', title: 'Docs' },
    { path: '/blog', title: 'Blog' },
    { path: '/gallery', title: 'Gallery' },
  ],

  sidebars: [
    {
      name: 'docs',
      sections: [
        {
          title: 'Getting Started',
          items: ['/docs'],
        },
        {
          title: 'Interface',
          items: [
            '/docs/interface/toolbar',
            '/docs/interface/library',
            '/docs/interface/editor',
            '/docs/interface/3dview',
            '/docs/interface/2dview',
            '/docs/interface/properties',
            '/docs/interface/menu',
          ],
        },
        {
          title: 'Workflow',
          items: [
            '/docs/workflow/nodes',
            '/docs/workflow/outputs',
            '/docs/workflow/randomseed',
            '/docs/workflow/resolution',
            '/docs/workflow/exporting',
          ],
        },
        {
          title: 'Development',
          items: [
            '/docs/development/building-from-source',
            '/docs/development/creating-nodes',
            '/docs/development/contributing',
          ],
        },
      ],
    },
  ] satisfies Sidebar[],
}

export default site
