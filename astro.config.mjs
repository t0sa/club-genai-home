import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://t0sa.github.io',
  base: '/club-genai-home/',
  integrations: [tailwind(), sitemap()],
  output: 'static',
});
