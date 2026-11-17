import { useEffect, type RefObject } from 'react';

export function useDismiss(
  open: boolean,
  close: (returnFocus: boolean) => void,
  inside: readonly RefObject<HTMLElement | null>[],
): void {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!inside.some((ref) => ref.current?.contains(target))) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close(true);
    };
    const onBlur = () => {
      close(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [open, close, inside]);
}
