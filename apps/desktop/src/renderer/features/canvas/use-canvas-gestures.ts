import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { useViewStore } from '../../stores/view-store';
import { viewportFor } from './canvas-commands';
import { currentPage } from './current-page';
import { wheelZoomFactor, zoomAt, type Viewport } from './viewport';

export function useCanvasGestures(container: RefObject<HTMLElement | null>) {
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const update = (change: (viewport: Viewport) => Viewport) => {
    const page = currentPage();
    const { canvasSize, setViewport } = useViewStore.getState();
    if (page !== undefined && canvasSize !== null)
      setViewport(page.id, change(viewportFor(page, canvasSize)));
  };

  useEffect(() => {
    const element = container.current;
    if (element === null) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
      if (event.ctrlKey || event.metaKey) {
        const rect = element.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        update((viewport) =>
          zoomAt(viewport, viewport.zoom * wheelZoomFactor(event.deltaY * unit), point),
        );
      } else {
        update((viewport) => ({
          ...viewport,
          x: viewport.x - event.deltaX * unit,
          y: viewport.y - event.deltaY * unit,
        }));
      }
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', onWheel);
    };
  }, [container]);

  useEffect(() => {
    const isCanvasTarget = (target: EventTarget | null) =>
      target === document.body ||
      (target instanceof Node && container.current?.contains(target) === true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || !isCanvasTarget(event.target)) return;
      event.preventDefault();
      setSpaceHeld(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpaceHeld(false);
    };
    const onBlur = () => {
      setSpaceHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [container]);

  const handlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 1 && !(event.button === 0 && spaceHeld)) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      last.current = { x: event.clientX, y: event.clientY };
      setPanning(true);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const from = last.current;
      if (from === null) return;
      last.current = { x: event.clientX, y: event.clientY };
      update((viewport) => ({
        ...viewport,
        x: viewport.x + event.clientX - from.x,
        y: viewport.y + event.clientY - from.y,
      }));
    },
    onPointerUp: () => {
      last.current = null;
      setPanning(false);
    },
  };

  const cursor = panning ? 'cursor-grabbing' : spaceHeld ? 'cursor-grab' : undefined;
  return { handlers: { ...handlers, onPointerCancel: handlers.onPointerUp }, cursor };
}
