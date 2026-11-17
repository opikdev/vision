import { Copy01Icon, ZoomInAreaIcon } from '@hugeicons/core-free-icons';
import type { Page } from '@vision/format';
import type { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Icon } from '@/components/Icon';
import { copyLayerId, zoomToSelection } from './layer-commands';
import { findLayer, labelFor } from './layer-rows';
import { useLayerStore } from './layer-store';

export function LayerMenu({ page, children }: { page: Page | undefined; children: ReactNode }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents">{children}</ContextMenuTrigger>
      <LayerMenuContent page={page} />
    </ContextMenu>
  );
}

function LayerMenuContent({ page }: { page: Page | undefined }): ReactNode {
  const id = useLayerStore((store) => store.selection?.id ?? null);
  const found = page === undefined || id === null ? undefined : findLayer(page, id);
  if (id === null || found === undefined) return null;
  return (
    <ContextMenuContent aria-label={labelFor(found.layer)}>
      <ContextMenuItem onClick={zoomToSelection}>
        <Icon icon={ZoomInAreaIcon} />
        Zoom to layer
        <ContextMenuShortcut>⇧2</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          copyLayerId(id);
        }}
      >
        <Icon icon={Copy01Icon} />
        Copy layer id
        <ContextMenuShortcut className="font-mono tracking-normal">{id}</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
