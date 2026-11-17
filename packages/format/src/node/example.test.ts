import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { outline } from '../query';
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
});
