import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { resolve } from 'node:path';

export default defineConfig({
  main: {},
  preload: {
    build: { externalizeDeps: false },
  },
  renderer: {
    resolve: { alias: { '@': resolve('src/renderer') } },
    plugins: [react(), tailwindcss()],
  },
});
