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
        popup: fromRoot('popup.html'),
        background: fromRoot('src/background.ts'),
      },
      output: {
        // The manifest refers to the service worker by a fixed name.
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
