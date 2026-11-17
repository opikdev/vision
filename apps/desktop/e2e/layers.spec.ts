import { readFile, writeFile } from 'node:fs/promises';
import { askSelection } from '@vision/activity/node';
import type { Page } from '@playwright/test';
import { expect, test } from './vision';

const cart = (window: Page) => window.frameLocator('iframe[title="Cart"]');
const tree = (window: Page) => window.getByRole('tree', { name: 'Layers' });
const row = (window: Page, name: string) =>
  tree(window).getByRole('treeitem', { name, exact: true });
const zoomLevel = (window: Page) => window.getByRole('button', { name: /^Zoom \d+%/ });
const layer = (window: Page) =>
  window.getByRole('region', { name: 'Canvas' }).locator('[style*="scale("]').first();
const selectedOutline = (window: Page) => window.getByTestId('selected-layer');
const size = (window: Page) => window.getByTestId('layer-size');

async function open(window: Page): Promise<void> {
  await expect(cart(window).getByText('Your order', { exact: true })).toBeVisible();
}

async function expandToSummary(window: Page): Promise<void> {
  await row(window, 'Cart').focus();
  for (const name of ['Cart', 'Cart layout', 'Main · Your order', 'Cart summary']) {
    await expect(row(window, name)).toBeFocused();
    await window.keyboard.press('ArrowRight');
    await window.keyboard.press('ArrowRight');
    if (name === 'Cart layout' || name === 'Main · Your order') {
      await window.keyboard.press('ArrowDown');
    }
  }
}

test('outlines the layer under a hovered row', async ({ launch, exampleCopy }) => {
  const { window } = await launch(exampleCopy);
  await open(window);
  await expect(window.getByTestId('hovered-layer')).toHaveCount(0);

  await row(window, 'Cart').hover();
  await expect(window.getByTestId('hovered-layer')).toBeVisible();

  const artboard = await window.locator('iframe[title="Cart"]').boundingBox();
  const outline = await window.getByTestId('hovered-layer').boundingBox();
  expect(outline).not.toBeNull();
  expect(Math.round(outline?.x ?? 0)).toBe(Math.round(artboard?.x ?? -1));
  expect(Math.round(outline?.width ?? 0)).toBe(Math.round(artboard?.width ?? -1));
});

test('selects a row and shows the layer size on the canvas', async ({ launch, exampleCopy }) => {
  const { window } = await launch(exampleCopy);
  await open(window);
  await expandToSummary(window);

  await row(window, 'Continue to payment').click();

  await expect(row(window, 'Continue to payment')).toHaveAttribute('aria-selected', 'true');
  await expect(selectedOutline(window)).toBeVisible();
  await expect(size(window)).toHaveText('330 × 48');
});

test('selects what is clicked on the canvas and reveals its row', async ({
  launch,
  exampleCopy,
}) => {
  const { window } = await launch(exampleCopy);
  await open(window);
  const transform = await layer(window).getAttribute('style');

  await cart(window).getByText('Sales tax', { exact: true }).click();

  const salesTax = tree(window).getByRole('treeitem', { name: 'Sales tax', exact: true });
  await expect(salesTax).toHaveAttribute('aria-selected', 'true');
  await expect(salesTax).toBeInViewport();
  await expect(row(window, 'Row · Sales tax')).toHaveAttribute('aria-expanded', 'true');
  await expect(layer(window)).toHaveAttribute('style', transform ?? '');

  await window.keyboard.press('Escape');
  await expect(salesTax).toHaveAttribute('aria-selected', 'false');
  await expect(selectedOutline(window)).toHaveCount(0);
});

test('keeps the selection on save until the layer is removed', async ({ launch, exampleCopy }) => {
  const { window } = await launch(exampleCopy);
  await open(window);
  await cart(window).getByText('Sales tax', { exact: true }).click();
  const salesTax = tree(window).getByRole('treeitem', { name: 'Sales tax', exact: true });
  await expect(salesTax).toHaveAttribute('aria-selected', 'true');
  const source = await readFile(exampleCopy, 'utf8');

  await writeFile(exampleCopy, source.replace('"Your order"', '"Your basket"'));
  await expect(cart(window).getByText('Your basket', { exact: true })).toBeVisible();
  await expect(salesTax).toHaveAttribute('aria-selected', 'true');
  await expect(selectedOutline(window)).toBeVisible();

  await writeFile(exampleCopy, source.replace('"id": "span-22"', '"id": "sales-tax-label"'));
  await expect(tree(window).getByRole('treeitem', { selected: true })).toHaveCount(0);
  await expect(selectedOutline(window)).toHaveCount(0);
});

test('selects an artboard from its name and clears on empty canvas', async ({
  launch,
  exampleCopy,
}) => {
  const { window } = await launch(exampleCopy);
  await open(window);
  const canvas = window.getByRole('region', { name: 'Canvas' });

  await canvas.getByText('Cart, mobile', { exact: true }).click();
  await expect(row(window, 'Cart, mobile')).toHaveAttribute('aria-selected', 'true');
  await expect(size(window)).toHaveText('390 × 844');

  const box = await canvas.boundingBox();
  await window.mouse.click((box?.x ?? 0) + 20, (box?.y ?? 0) + (box?.height ?? 0) - 20);
  await expect(row(window, 'Cart, mobile')).toHaveAttribute('aria-selected', 'false');
});

test('copies a layer id and zooms to a layer from the context menu', async ({
  launch,
  exampleCopy,
}) => {
  const { app, window } = await launch(exampleCopy);
  await open(window);
  await expandToSummary(window);

  await row(window, 'Order summary').click({ button: 'right' });
  const menu = window.getByRole('menu', { name: 'Order summary' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: /Copy layer id/ }).click();
  await expect(menu).toBeHidden();
  await expect(row(window, 'Order summary')).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => app.evaluate(({ clipboard }) => clipboard.readText())).toBe('h2-2');

  const fit = (await zoomLevel(window).textContent()) ?? '';
  await cart(window).getByText('Continue to payment').click({ button: 'right' });
  await window.getByRole('menuitem', { name: /Zoom to layer/ }).click();
  await expect(zoomLevel(window)).not.toHaveText(fit);

  await window.getByRole('button', { name: 'Zoom to fit' }).click();
  await expect(zoomLevel(window)).toHaveText(fit);
  await window.keyboard.press('Shift+Digit2');
  await expect(zoomLevel(window)).not.toHaveText(fit);
});

test('draws an off-screen artboard again to select and zoom to its layer', async ({
  launch,
  exampleCopy,
}) => {
  const { window } = await launch(exampleCopy);
  await open(window);
  await window
    .getByRole('region', { name: 'Canvas' })
    .getByText('Cart, mobile', { exact: true })
    .click();
  await window.keyboard.press('Shift+Digit2');
  await window.keyboard.press('Escape');
  const cartFrame = window.locator('iframe[title="Cart"]');
  for (let step = 0; step < 12 && (await cartFrame.count()) > 0; step++) {
    await window.keyboard.press('ControlOrMeta+Equal');
    await window.waitForTimeout(150);
  }
  await expect(cartFrame).toHaveCount(0);
  const zoomed = (await zoomLevel(window).textContent()) ?? '';

  await expandToSummary(window);
  await row(window, 'Continue to payment').click();
  await window.keyboard.press('Shift+Digit2');

  await expect(cartFrame).toHaveCount(1);
  await expect(zoomLevel(window)).not.toHaveText(zoomed);
  await expect(selectedOutline(window)).toBeVisible();
  await expect(size(window)).toHaveText('330 × 48');
});

test('answers selection requests from the MCP server', async ({
  launch,
  exampleCopy,
  activitySocket,
}) => {
  const { window } = await launch(exampleCopy);
  await open(window);

  await expect
    .poll(() => askSelection(activitySocket, exampleCopy))
    .toEqual({ status: 'open', selection: { pageId: 'checkout', nodeIds: [] } });

  await cart(window).getByText('Continue to payment').click();
  await expect
    .poll(() => askSelection(activitySocket, exampleCopy))
    .toEqual({ status: 'open', selection: { pageId: 'checkout', nodeIds: ['span-26'] } });
  expect(await askSelection(activitySocket, `${exampleCopy}.missing`)).toEqual({
    status: 'not-open',
  });
});
