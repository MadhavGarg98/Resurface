import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
        contentScript: 'src/content/contentScript.js',
        categorizationPopup: 'src/content/categorizationPopup.js'
      },
      output: {
        // Ensure background and contentScript are flat and easy to find
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'src/background/index.js';
          if (chunkInfo.name === 'contentScript') return 'src/content/contentScript.js';
          if (chunkInfo.name === 'categorizationPopup') return 'src/content/categorizationPopup.js';
          return 'assets/[name]-[hash].js';
        },
        // IMPORTANT: Content scripts cannot be ES modules in manifest.json
        // We force them to be iife (immediately invoked function expression)
        format: 'es', // background needs 'es' for type: module
      }
    }
  }
});
