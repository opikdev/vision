import type { Page } from '@vision/format';
import { useViewStore, type Size, type Viewport } from '../../stores/view-store';
import { currentPage } from './current-page';
import { fitBounds, nextZoomStep, unionBounds, zoomAt, type Bounds } from './viewport';

const fitPadding = 64;
const emptyHintSpace = 120;

export type CanvasCommand = 'zoom-in' | 'zoom-out' | 'zoom-reset' | 'zoom-fit';

export function fitPage(page: Page, size: Size): Viewport {
  const bounds = unionBounds(page.artboards);
  if (bounds === null) return { x: fitPadding, y: fitPadding, zoom: 1 };
  const empty = page.artboards.every((artboard) => artboard.children.length === 0);
  return fitBounds(bounds, size, fitPadding, empty ? emptyHintSpace : 0);
}

export function viewportFor(page: Page, size: Size): Viewport {
  return useViewStore.getState().viewports[page.id] ?? fitPage(page, size);
}

export function resizeCanvas(size: Size): void {
  const { setCanvasSize, fitted, fitViewport } = useViewStore.getState();
  setCanvasSize(size);
  const page = currentPage();
  if (page !== undefined && fitted[page.id] === true) fitViewport(page.id, fitPage(page, size));
}

export function runCanvasCommand(command: CanvasCommand): void {
  const page = currentPage();
  const { canvasSize, setViewport, fitViewport } = useViewStore.getState();
  if (page === undefined || canvasSize === null) return;
  const viewport = viewportFor(page, canvasSize);
  const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
  switch (command) {
    case 'zoom-in':
      setViewport(page.id, zoomAt(viewport, nextZoomStep(viewport.zoom, 1), center));
      return;
    case 'zoom-out':
      setViewport(page.id, zoomAt(viewport, nextZoomStep(viewport.zoom, -1), center));
      return;
    case 'zoom-reset':
      setViewport(page.id, zoomAt(viewport, 1, center));
      return;
    case 'zoom-fit':
      fitViewport(page.id, fitPage(page, canvasSize));
      return;
  }
}

export function zoomToBounds(bounds: Bounds): void {
  const page = currentPage();
  const { canvasSize, setViewport } = useViewStore.getState();
  if (page !== undefined && canvasSize !== null) {
    setViewport(page.id, fitBounds(bounds, canvasSize, fitPadding));
  }
}
