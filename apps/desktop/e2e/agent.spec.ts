import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createConnection, type Socket } from 'node:net';
import type { Page } from '@playwright/test';
import { expect, test } from './vision';

const cart = (window: Page) => window.frameLocator('iframe[title="Cart"]');
const canvas = (window: Page) => window.getByRole('region', { name: 'Canvas' });
const layer = (window: Page) => canvas(window).locator('[style*="scale("]').first();
const zoomLevel = (window: Page) => window.getByRole('button', { name: /^Zoom \d+%/ });
const session = randomUUID();

async function connect(path: string): Promise<Socket> {
  let socket: Socket | undefined;
  await expect(async () => {
    socket = await new Promise<Socket>((resolve, reject) => {
      const attempt = createConnection(path);
      attempt.once('connect', () => {
        resolve(attempt);
      });
      attempt.once('error', reject);
    });
  }).toPass();
  if (socket === undefined) throw new Error(`Couldn't connect to ${path}`);
  return socket;
}

function send(socket: Socket, file: string, activity: Record<string, unknown>): void {
  const message = { v: 1, session, agent: 'Claude Code', file, at: Date.now(), activity };
  socket.write(`${JSON.stringify(message)}\n`);
}

test('shows the agent and reveals what it adds', async ({
  launch,
  exampleCopy,
  activitySocket,
}) => {
  const { window } = await launch(exampleCopy);
  await expect(cart(window).getByText('Your order', { exact: true })).toBeVisible();
  const socket = await connect(activitySocket);

  send(socket, exampleCopy, {
    kind: 'edit',
    artboard: 'cart',
    nodes: ['agent-note'],
    summary: 'is adding 1 element to Cart',
  });
  const design = JSON.parse(await readFile(exampleCopy, 'utf8')) as {
    pages: { artboards: { id: string; children: unknown[] }[] }[];
  };
  design.pages[0]?.artboards[0]?.children.push({
    type: 'text',
    id: 'agent-note',
    class: 'p-6 text-2xl',
    text: 'Free delivery over $50',
  });
  await writeFile(exampleCopy, JSON.stringify(design));

  await expect(window.getByRole('status')).toHaveText('Claude Code is adding 1 element to Cart');
  await expect(canvas(window).getByText('Claude Code', { exact: true })).toBeAttached();
  await expect(
    window.getByRole('navigation', { name: 'Sidebar' }).getByText('Claude Code'),
  ).toBeVisible();
  const note = cart(window).getByText('Free delivery over $50');
  await expect(note).toBeVisible();
  await expect(note).not.toHaveAttribute('data-reveal');
  await expect(note).toHaveCSS('opacity', '1');
  await expect(window.getByRole('status')).toHaveText('Claude Code is thinking');

  send(socket, exampleCopy, { kind: 'done' });
  await expect(window.getByRole('status')).toHaveText('');
  await expect(canvas(window).getByText('Claude Code', { exact: true })).toHaveCount(0);
  socket.destroy();
});

test('points to an agent working off screen and pans to it', async ({
  launch,
  exampleCopy,
  activitySocket,
}) => {
  const { window } = await launch(exampleCopy);
  await expect(cart(window).getByText('Your order', { exact: true })).toBeVisible();
  await zoomLevel(window).click();
  await expect(zoomLevel(window)).toHaveText('100%');
  for (const level of ['125%', '150%', '200%', '300%']) {
    await window.getByRole('button', { name: 'Zoom in' }).click();
    await expect(zoomLevel(window)).toHaveText(level);
  }
  const socket = await connect(activitySocket);

  send(socket, exampleCopy, {
    kind: 'look',
    artboard: 'payment',
    summary: 'is taking a screenshot of Payment',
  });

  const pill = window.getByRole('button', { name: 'Go to Payment, where Claude Code is working' });
  await expect(pill).toBeVisible();
  await expect(pill).toHaveText('Claude Code on Payment');
  const transform = await layer(window).getAttribute('style');

  await pill.click();

  await expect(layer(window)).not.toHaveAttribute('style', transform ?? '');
  await expect(zoomLevel(window)).toHaveText('300%');
  await expect(pill).toBeHidden();
  socket.destroy();
});
