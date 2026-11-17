// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render } from '../test/render';
import { DesignNodes } from './DesignNodes';

describe('DesignNodes', () => {
  it('maps every node type to its element', async () => {
    const container = await render(
      <DesignNodes
        assetToken="tok"
        nodes={[
          {
            type: 'frame',
            id: 'card',
            class: 'flex gap-2',
            children: [
              { type: 'text', id: 'title', class: 'text-xl', text: 'Two\nlines' },
              { type: 'image', id: 'hero', src: 'photos/hero 1.png' },
              { type: 'image', id: 'remote', src: 'https://example.com/a.png', alt: 'A cup' },
            ],
          },
          { type: 'frame', id: 'empty' },
        ]}
      />,
    );
    expect(container.innerHTML).toBe(
      '<div class="flex gap-2">' +
        '<p class="text-xl">Two\nlines</p>' +
        '<img alt="" src="vision-asset://tok/photos/hero%201.png">' +
        '<img alt="A cup" src="https://example.com/a.png">' +
        '</div>' +
        '<div></div>',
    );
  });

  it('draws svg markup on a single svg element that keeps the node class', async () => {
    const container = await render(
      <DesignNodes
        assetToken="tok"
        nodes={[
          {
            type: 'svg',
            id: 'icon',
            class: 'size-4 text-brand',
            svg: '<svg class="ignored" viewBox="0 0 24 24" stroke-width="1.5"><path d="M0 0h24"></path></svg>',
          },
        ]}
      />,
    );
    const svg = container.querySelector('svg');
    expect(container.children).toHaveLength(1);
    expect(svg?.getAttribute('class')).toBe('size-4 text-brand');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.getAttribute('stroke-width')).toBe('1.5');
    expect(svg?.innerHTML).toBe('<path d="M0 0h24"></path>');
  });
});
