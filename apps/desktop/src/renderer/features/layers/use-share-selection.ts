import { useEffect } from 'react';
import { reportError, vision } from '../../bridge';
import { useLayerStore } from './layer-store';

export function useShareSelection(pageId: string | null): void {
  const selected = useLayerStore((store) =>
    store.selection?.pageId === pageId ? store.selection.id : null,
  );
  useEffect(() => {
    vision
      .setSelection({ pageId, nodeIds: selected === null ? [] : [selected] })
      .catch(reportError);
  }, [pageId, selected]);
}
