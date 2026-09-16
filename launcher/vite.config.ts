import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(rootDir, './src'),
    },
  },

  // Dev server — Tauri dev mode uses this
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },

  build: {
    target: ['es2020', 'chrome105'],
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query:  ['@tanstack/react-query'],
          motion: ['framer-motion'],
        },
      },
    },
  },

  // Only VITE_ prefixed vars are exposed to the client
  envPrefix: ['VITE_'],
});
