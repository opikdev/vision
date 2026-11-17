import { describe, expect, it } from 'vitest';
import { HtmlError, htmlToNodes } from './html';

const none = new Set<string>();

describe('htmlToNodes', () => {
  it('converts frames and text, keeping classes and ids and generating the rest', () => {
    const html = `
      <section id="hero" class="flex   flex-col gap-4">
        <h1 class="text-4xl">Pick up at  Larkspur</h1>
        <div class="grid">
          <p>One</p>
        </div>
      </section>`;
    expect(htmlToNodes(html, new Set(['div-1']))).toEqual([
      {
        type: 'frame',
        id: 'hero',
        class: 'flex flex-col gap-4',
        children: [
          { type: 'text', id: 'h1-1', class: 'text-4xl', text: 'Pick up at Larkspur' },
          {
            type: 'frame',
            id: 'div-2',
            class: 'grid',
            children: [{ type: 'text', id: 'p-1', text: 'One' }],
          },
        ],
      },
    ]);
  });

  it('does not generate ids that the HTML uses later', () => {
    expect(htmlToNodes('<p>a</p><p id="p-1">b</p>', none).map((node) => node.id)).toEqual([
      'p-2',
      'p-1',
    ]);
  });

  it('flattens inline elements, turns <br> into a line break and collapses whitespace', () => {
    expect(
      htmlToNodes(
        '<p class="x">\n  Hello <strong>bold</strong>\n  world<br>\n  next line&nbsp; </p>',
        none,
      ),
    ).toEqual([{ type: 'text', id: 'p-1', class: 'x', text: 'Hello bold world\nnext line ' }]);
  });

  it('turns a frame’s bare text into text nodes', () => {
    expect(htmlToNodes('<button class="px-4">  Pay <b>now</b> today </button>', none)).toEqual([
      {
        type: 'frame',
        id: 'button-1',
        class: 'px-4',
        children: [
          { type: 'text', id: 'text-1', text: 'Pay' },
          { type: 'text', id: 'b-1', text: 'now' },
          { type: 'text', id: 'text-2', text: 'today' },
        ],
      },
    ]);
  });

  it('keeps empty text elements, which often draw shapes', () => {
    expect(htmlToNodes('<span class="size-2 rounded-full bg-brand"></span>', none)).toEqual([
      { type: 'text', id: 'span-1', class: 'size-2 rounded-full bg-brand', text: '' },
    ]);
  });

  it('turns a text element holding an icon into a frame', () => {
    const nodes = htmlToNodes(
      '<a class="flex gap-2"><svg viewBox="0 0 24 24"><path d="M1 1"/></svg>Back</a>',
      none,
    );
    expect(nodes).toEqual([
      {
        type: 'frame',
        id: 'a-1',
        class: 'flex gap-2',
        children: [
          {
            type: 'svg',
            id: 'svg-1',
            svg: '<svg viewBox="0 0 24 24"><path d="M1 1"></path></svg>',
          },
          { type: 'text', id: 'text-1', text: 'Back' },
        ],
      },
    ]);
  });

  it('converts images', () => {
    expect(
      htmlToNodes(
        '<img src="photos/a.jpg" alt="Latte" class="w-full"><img src="b.png" alt="">',
        none,
      ),
    ).toEqual([
      { type: 'image', id: 'img-1', class: 'w-full', src: 'photos/a.jpg', alt: 'Latte' },
      { type: 'image', id: 'img-2', src: 'b.png' },
    ]);
  });

  it('moves the class and id of an svg onto its node and sanitizes it', () => {
    expect(
      htmlToNodes(
        '<svg id="cart-icon" class="size-5" viewBox="0 0 24 24" onload="alert(1)"><path d="M0 0"/></svg>',
        none,
      ),
    ).toEqual([
      {
        type: 'svg',
        id: 'cart-icon',
        class: 'size-5',
        svg: '<svg viewBox="0 0 24 24"><path d="M0 0"></path></svg>',
      },
    ]);
  });

  it('shows form fields as frames with their value or placeholder', () => {
    const html = `
      <input class="border" placeholder="Email address">
      <input value="Ada" placeholder="Name">
      <textarea placeholder="Notes"></textarea>
      <select><option>Small</option><option selected>Large</option></select>
      <input type="checkbox">`;
    expect(htmlToNodes(html, none)).toEqual([
      {
        type: 'frame',
        id: 'input-1',
        class: 'border',
        children: [{ type: 'text', id: 'text-1', text: 'Email address' }],
      },
      { type: 'frame', id: 'input-2', children: [{ type: 'text', id: 'text-2', text: 'Ada' }] },
      {
        type: 'frame',
        id: 'textarea-1',
        children: [{ type: 'text', id: 'text-3', text: 'Notes' }],
      },
      { type: 'frame', id: 'select-1', children: [{ type: 'text', id: 'text-4', text: 'Large' }] },
      { type: 'frame', id: 'input-3' },
    ]);
  });

  it('turns top-level text into a text node and ignores comments', () => {
    expect(htmlToNodes('<!-- note --> Hello ', none)).toEqual([
      { type: 'text', id: 'text-1', text: 'Hello' },
    ]);
    expect(htmlToNodes('  ', none)).toEqual([]);
  });

  it.each([
    [
      '<div style="color: red">x</div>',
      "The style attribute on <div> isn't allowed. Use Tailwind classes instead, with arbitrary values such as w-[320px] or bg-[#F4F1EA] when needed.",
    ],
    ['<p>a <span style="x">b</span></p>', "The style attribute on <span> isn't allowed."],
    [
      '<script>alert(1)</script>',
      "<script> isn't allowed. Designs can't run scripts; style elements with Tailwind classes instead.",
    ],
    ['<style>p{}</style>', "<style> isn't allowed."],
    ['<table></table>', "<table> isn't supported. Use div, section"],
    ['<img alt="x">', '<img> needs a src'],
    [
      '<div id="taken"></div>',
      'The id "taken" is already used in the document. Choose another id or leave it out.',
    ],
    ['<div id="a"></div><p id="a"></p>', 'The id "a" is already used earlier in this HTML.'],
    ['<div id="a b"></div>', 'Invalid id "a b" on <div>.'],
  ])('rejects %j', (html, message) => {
    expect(() => htmlToNodes(html, new Set(['taken']))).toThrow(HtmlError);
    expect(() => htmlToNodes(html, new Set(['taken']))).toThrow(message);
  });
});
