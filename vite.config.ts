import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const fromRoot = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  // Extension pages are served from chrome-extension://<id>/, so asset URLs must be relative.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome120',
    modulePreload: { polyfill: false },
    rolldownOptions: {
      input: {
        devtools: fromRoot('devtools.html'),
        panel: fromRoot('panel.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
