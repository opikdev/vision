import { readFile, writeFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './vision';

const cart = (window: Page) => window.frameLocator('iframe[title="Cart"]');
const zoomLevel = (window: Page) => window.getByRole('button', { name: /^Zoom \d+%/ });
const layer = (window: Page) =>
  window.getByRole('region', { name: 'Canvas' }).locator('[style*="scale("]');

test('draws the artboards of an opened file', async ({ launch, exampleCopy }) => {
  const { window } = await launch(exampleCopy);
  await expect(cart(window).getByText('Your order', { exact: true })).toBeVisible();
});

test('redraws on save without moving the viewport', async ({ launch, exampleCopy }) => {
  const { window } = await launch(exampleCopy);
  await expect(cart(window).getByText('Your order', { exact: true })).toBeVisible();
  const zoom = await zoomLevel(window).textContent();
  const transform = await layer(window).getAttribute('style');

  const source = await readFile(exampleCopy, 'utf8');
  await writeFile(exampleCopy, source.replace('"Your order"', '"Your basket"'));

  await expect(cart(window).getByText('Your basket', { exact: true })).toBeVisible();
  await expect(zoomLevel(window)).toHaveText(zoom ?? '');
  await expect(layer(window)).toHaveAttribute('style', transform ?? '');
});

test('keeps the last version while a save has an error', async ({ launch, exampleCopy }) => {
  const { window } = await launch(exampleCopy);
  await expect(cart(window).getByText('Your order', { exact: true })).toBeVisible();
  const source = await readFile(exampleCopy, 'utf8');

  await writeFile(exampleCopy, source.replace('"version": 1', '"version": "one"'));

  await expect(window.getByText('Save has an error')).toBeVisible();
  await expect(window.getByRole('button', { name: 'Copy error' })).toBeVisible();
  await expect(cart(window).getByText('Your order', { exact: true })).toBeVisible();

  await writeFile(exampleCopy, source);

  await expect(window.getByText('Save has an error')).toBeHidden();
  await expect(window.getByRole('button', { name: 'Copy error' })).toBeHidden();
});

test('toggles the sidebar with ⌘\\', async ({ launch, exampleCopy }) => {
  const { window } = await launch(exampleCopy);
  const sidebar = window.getByRole('navigation', { name: 'Sidebar' });
  await expect(sidebar).toBeVisible();

  await window.keyboard.press('Meta+Backslash');
  await expect(sidebar).toBeHidden();
  await expect(window.getByRole('button', { name: 'Show sidebar' })).toBeVisible();

  await window.keyboard.press('Meta+Backslash');
  await expect(sidebar).toBeVisible();
});

test('zooms in and back to fit', async ({ launch, exampleCopy }) => {
  const { window } = await launch(exampleCopy);
  await expect(cart(window).getByText('Your order', { exact: true })).toBeVisible();
  const fit = (await zoomLevel(window).textContent()) ?? '';

  await window.getByRole('button', { name: 'Zoom in' }).click();
  await expect(zoomLevel(window)).not.toHaveText(fit);

  await window.getByRole('button', { name: 'Zoom to fit' }).click();
  await expect(zoomLevel(window)).toHaveText(fit);
});

test('opens the app menu from the keyboard and closes it with Escape', async ({
  launch,
  exampleCopy,
}) => {
  const { window } = await launch(exampleCopy);
  const trigger = window.getByRole('button', { name: 'Vision menu' });
  await trigger.focus();

  await window.keyboard.press('Enter');
  await expect(window.getByRole('menu', { name: 'Vision menu' })).toBeVisible();
  await expect(window.getByRole('menuitem', { name: /New design/ })).toBeFocused();

  await window.keyboard.press('Escape');
  await expect(window.getByRole('menu', { name: 'Vision menu' })).toBeHidden();
  await expect(trigger).toBeFocused();
});
