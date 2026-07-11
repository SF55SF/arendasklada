import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ARENDASKLADA_MARKER_DOMAIN: replace here if the production domain changes.
export default defineConfig({
  site: 'https://arendasklada.uz',
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
