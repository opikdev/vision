import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { Point } from '../canvas/viewport';
import { atRest, glideFrom, glideToward, maxGlideSpeed, type Glide } from './glide';

export function useGlide(target: Point, zoom: number): RefObject<HTMLDivElement | null> {
  const element = useRef<HTMLDivElement>(null);
  const glide = useRef<Glide | null>(null);
  const { x, y } = target;

  useLayoutEffect(() => {
    const node = element.current;
    if (node === null) return;
    const place = (point: Point) => {
      node.style.transform = `translate(${point.x}px, ${point.y}px)`;
    };
    const to = { x, y };
    if (glide.current === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      glide.current = glideFrom(to);
      place(to);
      return;
    }
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const next = glideToward(
        glide.current ?? glideFrom(to),
        to,
        now - last,
        maxGlideSpeed / zoom,
      );
      last = now;
      glide.current = atRest(next, to) ? glideFrom(to) : next;
      place(glide.current);
      if (glide.current !== next) return;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [x, y, zoom]);

  return element;
}
