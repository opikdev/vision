import { describe, expect, it } from 'vitest';
import { labelTarget, nodeTarget, screenPoint } from './cursor-geometry';

const payment = { id: 'payment', x: 1990, y: 0 };

describe('nodeTarget', () => {
  it('points at the top-left area of the element, in page coordinates', () => {
    expect(nodeTarget(payment, { left: 40, top: 100, width: 300, height: 48 })).toEqual({
      artboardId: 'payment',
      x: 2042,
      y: 112,
      onLabel: false,
    });
    expect(nodeTarget(payment, { left: 0, top: 0, width: 8, height: 4 })).toEqual({
      artboardId: 'payment',
      x: 1994,
      y: 2,
      onLabel: false,
    });
  });
});

describe('screenPoint', () => {
  it('follows the viewport', () => {
    const target = nodeTarget(payment, { left: 40, top: 100, width: 300, height: 48 });
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
