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
        categorizationPopup: 'src/content/categorizationPopup.js',
        chatBot: 'src/content/chatBot.js'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'contentScript') return 'contentScript.js';
          if (chunkInfo.name === 'categorizationPopup') return 'categorizationPopup.js';
          if (chunkInfo.name === 'chatBot') return 'chatBot.js';
          return 'assets/[name]-[hash].js';
        },
        format: 'es',
      }
    }
  }
});
