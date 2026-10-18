import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds to ./dist, which the server finds and hosts.
export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    fs: {
      // ../shared/protocol.js is imported by hooks/useBackend.ts and lives
      // outside this root, so the dev server must be allowed to read it.
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
