import { chmod } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './vision';

function openPath(page: Page, path: string): Promise<void> {
  return page.evaluate((file) => {
    const vision = Reflect.get(window, 'vision') as { openPath(path: string): Promise<void> };
    return vision.openPath(file);
  }, path);
}

test('shows the start screen without a file', async ({ launch }) => {
  const { window } = await launch();
  await expect(window.getByRole('heading', { name: 'Start a design' })).toBeVisible();
});

test('creates a new design and shows the empty-design hint', async ({ launch, dir }) => {
  const { app, window } = await launch();
  const file = join(dir, 'Untitled.vis');
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath });
  }, file);

  await window.getByRole('button', { name: 'New design' }).click();

  await expect(window.getByRole('heading', { name: 'This design is empty' })).toBeVisible();
  await expect(window.getByText(file)).toBeVisible();
});

test('exposes only the vision bridge to the renderer', async ({ launch }) => {
  const { window } = await launch();
  const globals = await window.evaluate(() => ({
    vision: typeof Reflect.get(window, 'vision'),
    require: typeof Reflect.get(window, 'require'),
    process: typeof Reflect.get(window, 'process'),
  }));
  expect(globals).toEqual({ vision: 'object', require: 'undefined', process: 'undefined' });
});

test('reports a file it cannot read and opens it once it can', async ({ launch, exampleCopy }) => {
  const { app, window } = await launch();
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = (...args: unknown[]) => {
      const options = args.at(-1) as { message: string; detail: string };
      Reflect.set(globalThis, 'shownError', `${options.message}: ${options.detail}`);
      return Promise.resolve({ response: 0, checkboxChecked: false });
    };
  });
  await chmod(exampleCopy, 0o000);

  await openPath(window, exampleCopy);

  expect(await app.evaluate(() => Reflect.get(globalThis, 'shownError') as string)).toMatch(
    /^Couldn't open checkout\.vis: EACCES: permission denied/,
  );
  await expect(window.getByRole('heading', { name: 'Start a design' })).toBeVisible();

  await chmod(exampleCopy, 0o644);
  await openPath(window, exampleCopy);

  await expect(
    window.frameLocator('iframe[title="Cart"]').getByText('Your order', { exact: true }),
  ).toBeVisible();
});
