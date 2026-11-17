import { describe, expect, it } from 'vitest';
import { box, findingsOf, frame, text } from './test-layout';

describe('content', () => {
  it('flags lorem ipsum as an error and placeholder copy as a warning', () => {
    expect(
      findingsOf(
        'content',
        [
          text('p', 'Lorem ipsum dolor sit amet, consectetur.'),
          text('h2', 'Title'),
          text('cta', 'Button'),
          text('brand', '[Company name]'),
        ],
        {},
      ).map(({ severity, nodeId, message }) => [severity, nodeId, message]),
    ).toEqual([
      ['error', 'p', 'Text "Lorem ipsum dolor sit amet, consectetur." is lorem ipsum.'],
      ['warning', 'h2', 'Text "Title" is placeholder copy.'],
      ['warning', 'cta', 'Text "Button" is placeholder copy.'],
      ['warning', 'brand', 'Text "[Company name]" is placeholder copy.'],
    ]);
  });

  it('accepts real copy, including short form labels', () => {
    expect(
      findingsOf(
        'content',
        [text('a', 'Order summary'), text('b', 'Name'), text('c', 'Workspace title')],
        {},
      ),
    ).toEqual([]);
  });

  it('warns about images without alt text', () => {
    expect(
      findingsOf(
        'content',
        [
          { type: 'image', id: 'hero', src: 'photos/kitchen.jpg' },
          { type: 'image', id: 'logo', src: 'logo.svg', alt: 'Brightwell' },
        ],
        {},
      ),
    ).toEqual([
      {
        rule: 'content',
        severity: 'warning',
        artboardId: 'board',
        nodeId: 'hero',
        message: 'Image "photos/kitchen.jpg" has no alt text.',
        fix: 'Describe what the image shows in alt, such as alt="Barista pouring latte art".',
      },
    ]);
  });

  it('warns about empty frames that draw nothing, but not spacers or shapes', () => {
    expect(
      findingsOf('content', [frame('div-3'), frame('spacer'), frame('divider')], {
        'div-3': box({ width: 358, height: 0 }),
        spacer: box({ width: 358, height: 24 }),
        divider: box({ width: 358, height: 0, borderWidth: 1 }),
      }).map(({ nodeId, message }) => [nodeId, message]),
    ).toEqual([['div-3', 'Frame div-3 is empty and has no size, so it draws nothing.']]);
  });
});
