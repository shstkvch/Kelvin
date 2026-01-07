import { defineConfig } from 'vitepress'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load the Kelvin TextMate grammar
const kelvinGrammar = JSON.parse(
  readFileSync(join(__dirname, 'kelvin.tmLanguage.json'), 'utf-8')
)

export default defineConfig({
  title: 'Kelvin',
  description: 'A declarative language for building web applications',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3B82F6' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Kelvin' }],
    ['meta', { property: 'og:description', content: 'A declarative language for building web applications' }],
  ],

  // GitHub Pages base path
  base: '/Kelvin/',

  // Ignore localhost links in examples
  ignoreDeadLinks: [
    /^http:\/\/localhost/
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Docs', link: '/getting-started/' },
      { text: 'Tutorials', link: '/tutorials/' },
      { text: 'Reference', link: '/reference/' },
      { text: 'Examples', link: '/examples/' },
      {
        text: 'v0.1.1',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'GitHub', link: 'https://github.com/shstkvch/Kelvin' }
        ]
      }
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/' },
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Quickstart', link: '/getting-started/quickstart' },
            { text: 'Editor Setup', link: '/getting-started/editor-setup' }
          ]
        }
      ],
      '/tutorials/': [
        {
          text: 'Tutorials',
          items: [
            { text: 'Overview', link: '/tutorials/' },
            { text: 'Guestbook in 5 Minutes', link: '/tutorials/guestbook' },
            { text: 'Build a Blog', link: '/tutorials/blog' },
            { text: 'Todo App', link: '/tutorials/todo-app' }
          ]
        }
      ],
      '/concepts/': [
        {
          text: 'Core Concepts',
          items: [
            { text: 'Overview', link: '/concepts/' },
            { text: 'Entities', link: '/concepts/entities' },
            { text: 'Views', link: '/concepts/views' },
            { text: 'Authentication', link: '/concepts/authentication' },
            { text: 'Actions', link: '/concepts/actions' },
            { text: 'Triggers', link: '/concepts/triggers' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Overview', link: '/reference/' },
            { text: 'CLI Commands', link: '/reference/cli' },
            { text: 'Field Types', link: '/reference/types' },
            { text: 'Generated API', link: '/reference/api' },
            { text: 'Grammar', link: '/reference/grammar' }
          ]
        }
      ],
      '/cookbooks/': [
        {
          text: 'Cookbooks',
          items: [
            { text: 'Overview', link: '/cookbooks/' },
            { text: 'Soft Delete', link: '/cookbooks/soft-delete' },
            { text: 'Deployment', link: '/cookbooks/deployment' },
            { text: 'Email Notifications', link: '/cookbooks/email-notifications' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Gallery', link: '/examples/' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/shstkvch/Kelvin' }
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, text: 2, headers: 3 }
          }
        }
      }
    },

    editLink: {
      pattern: 'https://github.com/shstkvch/Kelvin/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    shikiSetup: async (shiki) => {
      // Register the Kelvin language with Shiki
      await shiki.loadLanguage({
        name: 'kelvin',
        scopeName: 'source.kelvin',
        ...kelvinGrammar,
        aliases: ['kelvin', 'kv']
      })
    }
  }
})
