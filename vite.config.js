import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL('./index.html', import.meta.url)),
        dashboard: fileURLToPath(new URL('./src/popup/dashboard.html', import.meta.url)),
        background: 'src/background/index.js',
        contentScript: 'src/content/contentScript.js'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'src/background/index.js';
          }
          if (chunkInfo.name === 'contentScript') {
            return 'src/content/contentScript.js';
          }
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
});
