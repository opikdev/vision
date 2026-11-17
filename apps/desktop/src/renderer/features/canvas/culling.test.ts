import { describe, expect, it } from 'vitest';
import { artboardsToDraw } from './culling';

const artboards = [
  { id: 'on', x: 0, y: 0, width: 1000, height: 800 },
  { id: 'margin', x: 1500, y: 0, width: 1000, height: 800 },
  { id: 'right', x: 2000, y: 0, width: 1000, height: 800 },
  { id: 'below', x: 0, y: 2000, width: 1000, height: 800 },
];
const size = { width: 1000, height: 800 };

describe('artboardsToDraw', () => {
  it('draws artboards on screen or within the margin around it', () => {
    expect(artboardsToDraw(artboards, { x: 0, y: 0, zoom: 1 }, size, new Set())).toEqual([
      'on',
      'margin',
    ]);
  });

  it('follows the viewport position and zoom', () => {
    expect(artboardsToDraw(artboards, { x: -2000, y: 0, zoom: 1 }, size, new Set())).toEqual([
      'right',
      'margin',
    ]);
  });

  it('lists the artboards nearest the middle of the screen first', () => {
    expect(artboardsToDraw(artboards, { x: 0, y: 0, zoom: 0.25 }, size, new Set())).toEqual([
      'margin',
      'right',
      'below',
      'on',
    ]);
  });

  it('keeps the artboards it is asked to keep wherever they are, first', () => {
    expect(artboardsToDraw(artboards, { x: 0, y: 0, zoom: 1 }, size, new Set(['below']))).toEqual([
      'below',
      'on',
      'margin',
    ]);
  });
});
