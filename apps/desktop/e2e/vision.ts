import {
  _electron,
  test as base,
  expect,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
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
  activitySocket: string;
  exampleCopy: string;
  launch: (...files: string[]) => Promise<Vision>;
}>({
  dir: async ({}, use) => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-e2e-'));
    await use(dir);
    await rm(dir, { recursive: true, force: true });
  },
  activitySocket: async ({ dir }, use) => {
    await use(join(dir, 'activity.sock'));
  },
  exampleCopy: async ({ dir }, use) => {
    const file = join(dir, 'checkout.vis');
    await copyFile(example, file);
    await use(file);
  },
  launch: async ({ dir, activitySocket }, use) => {
    const apps: ElectronApplication[] = [];
    const cspViolations: string[] = [];
    const watch = (page: Page) => {
      page.on('console', (message) => {
        if (message.text().includes('Content Security Policy')) cspViolations.push(message.text());
      });
    };
    await use(async (...files) => {
      const app = await _electron.launch({
        args: [appDir, `--user-data-dir=${join(dir, 'user-data')}`, ...files],
        env: { ...process.env, VISION_ACTIVITY_SOCKET: activitySocket },
      });
      apps.push(app);
      app.on('window', watch);
      const window = await app.firstWindow();
      watch(window);
      return { app, window };
    });
    for (const app of apps) await app.close();
    expect(cspViolations).toEqual([]);
  },
});

export { expect };
