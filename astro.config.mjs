import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  site: 'https://sf55sf.github.io',
  base: isGitHubPages ? '/arendasklada' : '/',
  trailingSlash: 'always',

  build: {
    inlineStylesheets: 'always',
  },

  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin/'),
    }),
  ],
});
