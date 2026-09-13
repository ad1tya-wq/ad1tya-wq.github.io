import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://ad1tya-wq.github.io',
  output: 'static',
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Syne',
      cssVariable: '--font-display',
      weights: ['400 800'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Arial Black', 'Impact', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-mono',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Consolas', 'Menlo', 'monospace'],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-body',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Segoe UI', 'Helvetica Neue', 'sans-serif'],
    },
  ],
});
