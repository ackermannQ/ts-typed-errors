import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'ts-typed-errors',
  description: 'Exhaustive error matching for TypeScript',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/reference' },
      { text: 'GitHub', link: 'https://github.com/ackermannQ/ts-typed-errors' }
    ],
    sidebar: {
      '/guide/': [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Why & Concepts', link: '/guide/why' },
        { text: 'Examples', link: '/guide/examples' }
      ],
      '/api/': [
        { text: 'Reference', link: '/api/reference' }
      ]
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/ackermannQ/ts-typed-errors' }, { icon: 'linkedin', link: 'https://ca.linkedin.com/in/quentin-ackermann-537178176' }]
  }
});
