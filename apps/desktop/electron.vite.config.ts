import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {},
  preload: {
    build: { externalizeDeps: false },
  },
  renderer: {
    plugins: [react(), tailwindcss()],
  },
});
