import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const fromRoot = (file: string) => fileURLToPath(new URL(file, import.meta.url));

// The recorder runs in the page's own scope, so its top-level names must not leak onto window.
const isolateRecorder: Plugin = {
  name: 'jsondrill-isolate-recorder',
  renderChunk: (code, chunk) => (chunk.name === 'recorder' ? `(() => {\n${code}\n})();\n` : null),
};

export default defineConfig({
  // Extension pages are served from chrome-extension://<id>/, so asset URLs must be relative.
  base: './',
  plugins: [react(), tailwindcss(), isolateRecorder],
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
        viewer: fromRoot('viewer.html'),
        background: fromRoot('src/background.ts'),
        recorder: fromRoot('src/recorder/main.ts'),
      },
      output: {
        // The manifest and the service worker refer to these scripts by fixed names.
        entryFileNames: (chunk) =>
          chunk.name === 'background' || chunk.name === 'recorder'
            ? `${chunk.name}.js`
            : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
