import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { layerLabel } from '../label';
import { outline } from '../query';
import type { Node } from '../schema';
import { serializeDocument } from '../serialize';
import { createTailwindEngine } from '../tailwind';
import { readDesign } from './read';
import { loadTailwindStylesheets } from '../test-tailwind';

const examplePath = fileURLToPath(
  new URL('../../../../examples/larkspur-checkout.vis', import.meta.url),
);

describe('examples/larkspur-checkout.vis', () => {
  it('is valid, uses only known classes and round-trips byte for byte', async () => {
    const { text, result } = await readDesign(examplePath);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    expect(result.diagnostics).toEqual([]);
    const engine = createTailwindEngine(await loadTailwindStylesheets());
    expect(await engine.classDiagnostics(result.document)).toEqual([]);
    expect(serializeDocument(result.document)).toBe(text);
  });

  it('has the expected pages and artboards', async () => {
    const { result } = await readDesign(examplePath);
    if (!result.ok) throw new Error('example is invalid');
    expect(
      outline(result.document)
        .split('\n')
        .filter((line) => /^\s{0,2}(page|artboard) /.test(line)),
    ).toEqual([
      'page checkout name="Checkout"',
      '  artboard cart name="Cart" 1440x900 at 0,0 class="bg-surface font-sans text-fg antialiased"',
      '  artboard cart-mobile name="Cart, mobile" 390x844 at 1520,0 class="bg-surface font-sans text-fg antialiased"',
      '  artboard payment name="Payment" 1440x900 at 1990,0 class="bg-surface font-sans text-fg antialiased"',
    ]);
  });

  it('gives every layer of the cart summary a readable label', async () => {
    const { result } = await readDesign(examplePath);
    if (!result.ok) throw new Error('example is invalid');
    const lines: string[] = [];
    const walk = (node: Node, depth: number): void => {
      lines.push(`${'  '.repeat(depth)}${layerLabel(node)}`);
      if (node.type === 'frame') for (const child of node.children ?? []) walk(child, depth + 1);
    };
    const [layout] = result.document.pages[0]?.artboards[0]?.children ?? [];
    if (layout === undefined) throw new Error('the cart has no layout');
    walk(layout, 0);
    expect(lines.slice(0, 4)).toEqual([
      'Cart layout',
      '  Cart header',
      '    Larkspur',
      '      Icon',
    ]);
    const summary = lines.indexOf('    Cart summary');
    expect(lines.slice(summary)).toEqual([
      '    Cart summary',
      '      Order summary',
      '      Column · Subtotal',
      '        Row · Subtotal',
      '          Subtotal',
      '          $20.00',
      '        Row · Sales tax',
      '          Sales tax',
      '          $1.73',
      '        Row · Total',
      '          Total',
      '          $21.73',
      '      Column · Promo code',
      '        Promo code',
      '        Row · FIRSTCUP',
      '          FIRSTCUP',
      '            FIRSTCUP',
      '          Apply',
      '            Apply',
      '      Continue to payment',
      '        Continue to payment',
      '        Icon',
      '      You can cancel for free until the barist…',
      '        Icon',
      '        You can cancel for free until the barist…',
    ]);
    expect(lines.filter((line) => /\b(div|span|ul|li|svg|h\d|p)-\d/.test(line))).toEqual([]);
  });
});
