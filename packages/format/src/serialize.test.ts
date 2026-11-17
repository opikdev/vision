import { describe, expect, it } from 'vitest';
import { createDocument } from './create';
import { parseDocument } from './parse';
import type { VisionDocument } from './schema';
import { serializeDocument } from './serialize';

describe('serializeDocument', () => {
  it('writes keys in a fixed order, sorts tokens and omits empty optional fields', () => {
    const doc = {
      pages: [
        {
          artboards: [
            {
              children: [
                {
                  children: [{ text: 'Hi', class: '', id: 't', type: 'text' }],
                  class: 'flex',
                  name: '',
                  id: 'f',
                  type: 'frame',
                },
                { children: [], id: 'empty', type: 'frame' },
                { alt: '', src: 'a.png', id: 'img', type: 'image', name: 'Photo' },
                { svg: '<svg></svg>', id: 'icon', type: 'svg' },
              ],
              class: 'bg-white',
              height: 2,
              width: 1,
              y: 0,
              x: 0,
              name: 'A',
              id: 'a',
            },
          ],
          name: 'P',
          id: 'p',
        },
      ],
      tokens: { radius: {}, color: { z: '#000', a: '#fff' }, font: { sans: 'Inter' } },
      version: 1,
      format: 'vision',
    } as VisionDocument;
    expect(serializeDocument(doc)).toBe(`{
  "format": "vision",
  "version": 1,
  "tokens": {
    "color": {
      "a": "#fff",
      "z": "#000"
    },
    "font": {
      "sans": "Inter"
    }
  },
  "pages": [
    {
      "id": "p",
      "name": "P",
      "artboards": [
        {
          "id": "a",
          "name": "A",
          "x": 0,
          "y": 0,
          "width": 1,
          "height": 2,
          "class": "bg-white",
          "children": [
            {
              "type": "frame",
              "id": "f",
              "class": "flex",
              "children": [
                {
                  "type": "text",
                  "id": "t",
                  "text": "Hi"
                }
              ]
            },
            {
              "type": "frame",
              "id": "empty"
            },
            {
              "type": "image",
              "id": "img",
              "name": "Photo",
              "src": "a.png"
            },
            {
              "type": "svg",
              "id": "icon",
              "svg": "<svg></svg>"
            }
          ]
        }
      ]
    }
  ]
}
`);
  });

  it('omits empty tokens and keeps empty artboard children', () => {
    expect(serializeDocument({ ...createDocument(), tokens: { color: {} } })).toBe(`{
  "format": "vision",
  "version": 1,
  "pages": [
    {
      "id": "page-1",
      "name": "Page 1",
      "artboards": [
        {
          "id": "desktop",
          "name": "Desktop",
          "x": 0,
          "y": 0,
          "width": 1440,
          "height": 900,
          "class": "bg-white",
          "children": []
        }
      ]
    }
  ]
}
`);
  });

  it('round-trips byte for byte', () => {
    const text = serializeDocument({
      ...createDocument(),
      tokens: { color: { brand: '#1F3D2B' }, shadow: { card: '0 1px 2px rgb(0 0 0 / 0.1)' } },
    });
    const result = parseDocument(text);
    expect(result.ok && serializeDocument(result.document)).toBe(text);
  });
});
