import { describe, expect, it } from 'vitest';
import { layerLabel } from './label';
import type { Artboard, FrameNode, Node, Page } from './schema';

const text = (id: string, value: string): Node => ({ type: 'text', id, text: value });
const icon: Node = { type: 'svg', id: 'svg-1', svg: '<svg viewBox="0 0 24 24"></svg>' };
const frame = (id: string, children: Node[] = [], className?: string): FrameNode =>
  className === undefined
    ? { type: 'frame', id, children }
    : { type: 'frame', id, class: className, children };

describe('layerLabel', () => {
  it('uses a trimmed name before anything else', () => {
    expect(layerLabel({ ...frame('div-1', [text('t', 'Pay')]), name: '  Order summary ' })).toBe(
      'Order summary',
    );
    expect(layerLabel({ type: 'text', id: 'p-1', name: 'Title', text: 'Your order' })).toBe(
      'Title',
    );
    expect(layerLabel({ type: 'text', id: 'p-1', name: '   ', text: 'Your order' })).toBe(
      'Your order',
    );
  });

  it('names artboards and pages by their name', () => {
    const artboard: Artboard = {
      id: 'cart',
      name: 'Cart, mobile',
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      children: [],
    };
    const page: Page = { id: 'page-1', name: 'Checkout', artboards: [artboard] };
    expect(layerLabel(artboard)).toBe('Cart, mobile');
    expect(layerLabel(page)).toBe('Checkout');
  });

  it('shows the first line of a text, whitespace collapsed, cut after 40 characters', () => {
    expect(layerLabel(text('p-1', '  Your \t order \nsecond line'))).toBe('Your order');
    expect(layerLabel(text('p-1', '\n\n  Later line'))).toBe('Later line');
    expect(layerLabel(text('p-1', 'a'.repeat(40)))).toBe('a'.repeat(40));
    expect(
      layerLabel(text('p-1', 'You can cancel for free until the barista starts your order.')),
    ).toBe('You can cancel for free until the barist…');
    expect(layerLabel(text('p-1', '   '))).toBe('Text');
  });

  it('names images by alt text, then file name, then Image', () => {
    expect(layerLabel({ type: 'image', id: 'img-1', src: 'a.jpg', alt: ' Latte art ' })).toBe(
      'Latte art',
    );
    expect(layerLabel({ type: 'image', id: 'img-1', src: 'photos/hero.jpg' })).toBe('hero.jpg');
    expect(
      layerLabel({
        type: 'image',
        id: 'img-1',
        src: 'https://cdn.example.com/shop/Cardamom%20bun.png?w=400#top',
      }),
    ).toBe('Cardamom bun.png');
    expect(
      layerLabel({ type: 'image', id: 'img-1', src: 'https://cdn.example.com/%E0%A4%A' }),
    ).toBe('%E0%A4%A');
    expect(layerLabel({ type: 'image', id: 'img-1', src: 'https://' })).toBe('Image');
    expect(layerLabel({ type: 'image', id: 'img-1', src: ' ', alt: '' })).toBe('Image');
  });

  it('names svgs by their title or aria-label, then Icon', () => {
    expect(
      layerLabel({
        type: 'svg',
        id: 'svg-2',
        svg: '<svg viewBox="0 0 24 24"><title>Larkspur &amp; co</title><path d="M0 0"/></svg>',
      }),
    ).toBe('Larkspur & co');
    expect(
      layerLabel({ type: 'svg', id: 'svg-2', svg: "<svg aria-label='Close menu'><path/></svg>" }),
    ).toBe('Close menu');
    expect(
      layerLabel({ type: 'svg', id: 'svg-2', svg: '<svg><g aria-label="Inner"></g></svg>' }),
    ).toBe('Icon');
    expect(layerLabel(icon)).toBe('Icon');
  });

  it('humanizes meaningful frame ids', () => {
    expect(layerLabel(frame('cart-summary'))).toBe('Cart summary');
    expect(layerLabel(frame('checkoutButton'))).toBe('Checkout button');
    expect(layerLabel(frame('checkout_button'))).toBe('Checkout button');
    expect(layerLabel(frame('step-2'))).toBe('Step 2');
    expect(layerLabel(frame('CTA-row'))).toBe('CTA row');
    expect(layerLabel(frame('m-header'))).toBe('Header');
    expect(layerLabel(frame('x'))).toBe('X');
  });

  it('treats tag names and generic words, alone or numbered, as generated ids', () => {
    for (const id of ['div-23', 'p-2', 'span-1', 'div_7', 'frame-4', 'box', 'Group_3', 'item-1']) {
      expect(layerLabel(frame(id, [], 'flex')), id).toBe('Row');
    }
    expect(layerLabel(frame('divider', [], 'flex'))).toBe('Divider');
    expect(layerLabel(frame('step-2', [], 'flex'))).toBe('Step 2');
  });

  it('names a frame by its only text, even over a meaningful id', () => {
    const button = frame('div-3', [text('span-26', 'Continue to payment'), icon]);
    expect(layerLabel(button)).toBe('Continue to payment');
    expect(layerLabel(frame('cart-continue', [frame('div-1', [text('t', 'Pay')])]))).toBe('Pay');
  });

  it('ignores texts without letters when naming a frame by its text', () => {
    expect(layerLabel(frame('price-tag', [text('t', '$4.75')]))).toBe('Price tag');
    expect(layerLabel(frame('div-11', [text('span-9', '1')], 'flex items-center'))).toBe('Row');
  });

  it('names generated frames by their role and first text', () => {
    const nav = frame('nav-1', [
      frame('div-2', [text('span-2', '1'), text('span-3', 'Cart')]),
      frame('div-4', [text('span-4', '2'), text('span-5', 'Payment')]),
    ]);
    expect(layerLabel(nav)).toBe('Navigation · Cart');
    const roles: [string, string][] = [
      ['header-1', 'Header'],
      ['footer-1', 'Footer'],
      ['main-1', 'Main'],
      ['section-1', 'Section'],
      ['article-1', 'Article'],
      ['aside-1', 'Aside'],
      ['ul-1', 'List'],
      ['ol-1', 'List'],
      ['li-1', 'List item'],
      ['form-1', 'Form'],
      ['button-1', 'Button'],
      ['a-1', 'Link'],
      ['table-1', 'Table'],
      ['label-1', 'Label'],
      ['input-1', 'Field'],
      ['h3-1', 'Heading'],
    ];
    for (const [id, role] of roles) expect(layerLabel(frame(id, [icon]))).toBe(role);
    expect(layerLabel(frame('ul-1', [text('a', 'Cortado'), text('b', 'Latte')]))).toBe(
      'List · Cortado',
    );
  });

  it('falls back to a layout word from the classes', () => {
    const two = [text('a', 'Subtotal'), text('b', '$20.00')];
    expect(layerLabel(frame('div-23', two, 'flex flex-col gap-3'))).toBe('Column · Subtotal');
    expect(layerLabel(frame('div-20', two, 'flex justify-between'))).toBe('Row · Subtotal');
    expect(layerLabel(frame('div-1', two, 'inline-flex'))).toBe('Row · Subtotal');
    expect(layerLabel(frame('div-18', two, 'grid grid-cols-4'))).toBe('Grid · Subtotal');
    expect(layerLabel(frame('div-1', two, 'inline-grid'))).toBe('Grid · Subtotal');
    expect(layerLabel(frame('div-3', [], 'h-px w-10 bg-line'))).toBe('Frame');
    expect(layerLabel({ type: 'frame', id: 'div-1' })).toBe('Frame');
  });

  it('cuts long labels at 48 characters', () => {
    const long = [text('a', 'Honey lavender latte with oat milk and'), text('b', 'Second')];
    expect(layerLabel(frame('li-1', long))).toBe('List item · Honey lavender latte with oat milk…');
    expect(layerLabel(frame('li-1', long))).toHaveLength(47);
    expect(layerLabel({ ...frame('div-1'), name: 'n'.repeat(60) })).toBe(`${'n'.repeat(47)}…`);
  });
});
