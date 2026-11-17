import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'bench',
  testMatch: '*.bench.ts',
  workers: 1,
  reporter: 'list',
});
