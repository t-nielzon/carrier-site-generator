import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  output: 'static',
  integrations: [preact()],
  // carrier sites live under /carrier-sites/<slug>/, so the bare prefix sends visitors to the generator
  redirects: { '/carrier-sites': '/' },
});
