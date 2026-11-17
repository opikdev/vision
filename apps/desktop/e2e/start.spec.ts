import { join } from 'node:path';
import { expect, test } from './vision';

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
