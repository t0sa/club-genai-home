import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://t0sa.github.io',
  base: '/club-genai-home/',
  integrations: [tailwind()],
  output: 'static',
});
