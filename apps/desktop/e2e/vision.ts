import { _electron, test as base, type ElectronApplication, type Page } from '@playwright/test';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const appDir = resolve(__dirname, '..');
const example = resolve(appDir, '../../examples/larkspur-checkout.vis');

export interface Vision {
  app: ElectronApplication;
  window: Page;
}

export const test = base.extend<{
  dir: string;
  exampleCopy: string;
  launch: (...files: string[]) => Promise<Vision>;
}>({
  dir: async ({}, use) => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-e2e-'));
    await use(dir);
    await rm(dir, { recursive: true, force: true });
  },
  exampleCopy: async ({ dir }, use) => {
    const file = join(dir, 'checkout.vis');
    await copyFile(example, file);
    await use(file);
  },
  launch: async ({ dir }, use) => {
    const apps: ElectronApplication[] = [];
    await use(async (...files) => {
      const app = await _electron.launch({
        args: [appDir, `--user-data-dir=${join(dir, 'user-data')}`, ...files],
      });
      apps.push(app);
      return { app, window: await app.firstWindow() };
    });
    for (const app of apps) await app.close();
  },
});

export { expect } from '@playwright/test';
