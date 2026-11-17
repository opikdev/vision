import { describe, expect, it } from 'vitest';
import {
  centerOn,
  clampZoom,
  fitBounds,
  labelRoom,
  nextZoomStep,
  unionBounds,
  wheelZoomFactor,
  zoomAt,
} from './viewport';

describe('clampZoom', () => {
  it('keeps zoom between 2% and 800%', () => {
    expect(clampZoom(0.001)).toBe(0.02);
    expect(clampZoom(20)).toBe(8);
    expect(clampZoom(0.5)).toBe(0.5);
  });
});

describe('zoomAt', () => {
  it('keeps the point under the cursor fixed', () => {
    expect(zoomAt({ x: 100, y: 50, zoom: 1 }, 2, { x: 300, y: 250 })).toEqual({
      x: -100,
      y: -150,
      zoom: 2,
    });
  });

  it('clamps the zoom and adjusts the offset for the clamped value', () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 4 }, 100, { x: 100, y: 100 })).toEqual({
      x: -100,
      y: -100,
      zoom: 8,
    });
  });
});

describe('centerOn', () => {
  it('pans so the point is in the middle without zooming', () => {
    expect(
      centerOn({ x: 10, y: 20, zoom: 0.5 }, { x: 2000, y: 100 }, { width: 800, height: 600 }),
    ).toEqual({
      x: -600,
      y: 250,
      zoom: 0.5,
    });
  });
});

describe('nextZoomStep', () => {
  it('moves to the next round zoom level', () => {
    expect(nextZoomStep(1, 1)).toBe(1.25);
    expect(nextZoomStep(1, -1)).toBe(0.75);
    expect(nextZoomStep(0.4, 1)).toBe(0.5);
    expect(nextZoomStep(0.4, -1)).toBe(0.33);
  });

  it('skips a level that is barely different from the current zoom', () => {
    expect(nextZoomStep(0.66, 1)).toBe(0.75);
    expect(nextZoomStep(0.76, -1)).toBe(0.67);
  });

  it('stops at the limits', () => {
    expect(nextZoomStep(8, 1)).toBe(8);
    expect(nextZoomStep(0.02, -1)).toBe(0.02);
  });
});

describe('wheelZoomFactor', () => {
  it('zooms in for upward scrolls and caps large mouse wheel steps', () => {
    expect(wheelZoomFactor(0)).toBe(1);
    expect(wheelZoomFactor(-10)).toBeCloseTo(1.105, 3);
    expect(wheelZoomFactor(400)).toBeCloseTo(0.607, 3);
  });
});

describe('fitBounds', () => {
  it('centres the bounds and scales them down to fit with padding', () => {
    expect(
      fitBounds({ x: 0, y: 0, width: 2000, height: 1000 }, { width: 1100, height: 700 }, 50),
    ).toEqual({ x: 50, y: 100, zoom: 0.5 });
  });

  it('never zooms in past 100%', () => {
    expect(
      fitBounds({ x: 100, y: 100, width: 200, height: 100 }, { width: 800, height: 600 }, 40),
    ).toEqual({ x: 200, y: 150, zoom: 1 });
  });

  it('leaves room below the bounds when asked', () => {
    expect(
      fitBounds({ x: 0, y: 0, width: 1000, height: 1000 }, { width: 1100, height: 1100 }, 50, 500),
    ).toEqual({ x: 300, y: 50, zoom: 0.5 });
  });

  it('respects the minimum zoom for huge pages', () => {
    expect(
      fitBounds({ x: 0, y: 0, width: 1_000_000, height: 10 }, { width: 1000, height: 1000 }, 0)
        .zoom,
    ).toBe(0.02);
  });
});

describe('unionBounds', () => {
  it('returns the box around every artboard', () => {
    expect(
      unionBounds([
        { x: 0, y: 0, width: 1440, height: 900 },
        { x: 1520, y: -40, width: 390, height: 844 },
      ]),
    ).toEqual({ x: 0, y: -40, width: 1910, height: 940 });
  });

  it('returns null for an empty page', () => {
    expect(unionBounds([])).toBeNull();
  });
});

describe('labelRoom', () => {
  const cart = { x: 0, y: 0, width: 390, height: 844 };

  it('extends up to the next artboard in the same row', () => {
    const next = { x: 430, y: 0, width: 1440, height: 900 };
    expect(labelRoom(cart, [cart, next])).toBe(414);
  });

  it('ignores artboards in other rows', () => {
    const below = { x: 430, y: 1000, width: 100, height: 100 };
    expect(labelRoom(cart, [cart, below])).toBe(Number.POSITIVE_INFINITY);
  });
});
