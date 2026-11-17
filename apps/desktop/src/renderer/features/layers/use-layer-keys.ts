import { useEffect } from 'react';
import { useViewStore } from '../../stores/view-store';
import { useLayerStore } from './layer-store';

export function useLayerKeys(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (useViewStore.getState().dialog !== null) return;
      useLayerStore.getState().select(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
