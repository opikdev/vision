import type { ViewCommand } from '../../shared/contract';
import { runCanvasCommand } from '../features/canvas/canvas-commands';
import { zoomToSelection } from '../features/layers/layer-commands';
import { useDocumentStore } from '../stores/document-store';
import { useViewStore } from '../stores/view-store';

export function runViewCommand(command: ViewCommand): void {
  switch (command) {
    case 'toggle-sidebar':
      useViewStore.getState().toggleSidebar();
      return;
    case 'connect-ai':
      useViewStore.getState().openDialog('connect-ai');
      return;
    case 'zoom-in':
    case 'zoom-out':
    case 'zoom-reset':
    case 'zoom-fit':
      if (useDocumentStore.getState().state?.document) runCanvasCommand(command);
      return;
    case 'zoom-layer':
      zoomToSelection();
      return;
  }
}
