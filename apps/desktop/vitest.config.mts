import { resolve } from 'node:path';
import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src/renderer') } },
  test: {
    name: 'desktop',
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
