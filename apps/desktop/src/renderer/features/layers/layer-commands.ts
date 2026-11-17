import { reportError, vision } from '../../bridge';
import { zoomToBounds } from '../canvas/canvas-commands';
import { currentPage } from '../canvas/current-page';
import { maxZoom } from '../canvas/viewport';
import { layerBounds } from './canvas-layers';
import { useLayerStore } from './layer-store';

export function zoomToSelection(): void {
  const page = currentPage();
  const id = useLayerStore.getState().selection?.id;
  if (page === undefined || id === undefined) return;
  const bounds = layerBounds(page, id);
  if (bounds !== null && bounds.width > 0 && bounds.height > 0) zoomToBounds(bounds, maxZoom);
}

export function copyLayerId(id: string): void {
  vision.writeClipboard(id).catch(reportError);
}
