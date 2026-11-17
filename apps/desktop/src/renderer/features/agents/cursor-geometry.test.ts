import { describe, expect, it } from 'vitest';
import { edgePlacement, labelTarget, nodeTarget, screenPoint } from './cursor-geometry';

const payment = { id: 'payment', x: 1990, y: 0 };

describe('nodeTarget', () => {
  it('points at the top-left area of the element, in page coordinates', () => {
    expect(nodeTarget('payment', { x: 2030, y: 100, width: 300, height: 48 })).toEqual({
      artboardId: 'payment',
      x: 2042,
      y: 112,
      onLabel: false,
    });
    expect(nodeTarget('payment', { x: 1990, y: 0, width: 8, height: 4 })).toEqual({
      artboardId: 'payment',
      x: 1994,
      y: 2,
      onLabel: false,
    });
  });
});

describe('screenPoint', () => {
  it('follows the viewport', () => {
    const target = nodeTarget('payment', { x: 2030, y: 100, width: 300, height: 48 });
    expect(screenPoint(target, { x: 10, y: 20, zoom: 0.5 })).toEqual({ x: 1031, y: 76 });
    expect(screenPoint(target, { x: -990, y: 20, zoom: 0.5 })).toEqual({ x: 31, y: 76 });
  });

  it('sits on the artboard name above the artboard', () => {
    expect(screenPoint(labelTarget(payment), { x: 0, y: 100, zoom: 0.25 })).toEqual({
      x: 521.5,
      y: 84,
    });
  });
});

describe('edgePlacement', () => {
  const size = { width: 1000, height: 600 };

  it('is null while the point is on the canvas', () => {
    expect(edgePlacement({ x: 0, y: 0 }, size)).toBeNull();
    expect(edgePlacement({ x: 1000, y: 600 }, size)).toBeNull();
  });

  it('picks the edge nearest the point and lines up with it', () => {
    expect(edgePlacement({ x: 1800, y: 300 }, size)).toEqual({ edge: 'right', offset: 300 });
    expect(edgePlacement({ x: -500, y: 120 }, size)).toEqual({ edge: 'left', offset: 120 });
    expect(edgePlacement({ x: 700, y: 900 }, size)).toEqual({ edge: 'bottom', offset: 700 });
    expect(edgePlacement({ x: 400, y: -2000 }, size)).toEqual({ edge: 'top', offset: 400 });
  });

  it('keeps the pill clear of the corners', () => {
    expect(edgePlacement({ x: 3000, y: -100 }, size)).toEqual({ edge: 'right', offset: 32 });
    expect(edgePlacement({ x: 1100, y: 5000 }, size)).toEqual({ edge: 'bottom', offset: 860 });
    expect(edgePlacement({ x: -50, y: 30 }, { width: 200, height: 40 })).toEqual({
      edge: 'left',
      offset: 20,
    });
  });
});
