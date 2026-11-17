import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';
import { Kbd } from './Kbd';

const delayMs = 500;

export function useTooltip() {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );
  const show = (delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setOpen(true);
    }, delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };
  return {
    open,
    triggerProps: {
      onPointerEnter: () => {
        show(delayMs);
      },
      onPointerLeave: hide,
      onPointerDown: hide,
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        if (event.currentTarget.matches(':focus-visible')) show(0);
      },
      onBlur: hide,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') hide();
      },
    },
  };
}

export function Tooltip({
  open,
  label,
  shortcut,
  align = 'center',
}: {
  open: boolean;
  label: ReactNode;
  shortcut?: string | undefined;
  align?: 'start' | 'center' | 'end' | undefined;
}) {
  if (!open) return null;
  return (
    <span
      aria-hidden="true"
      className={cx(
        'pointer-events-none absolute top-full z-50 mt-1.5 flex items-center gap-2 rounded-sm border border-border-strong bg-popover px-2 py-1 text-xs whitespace-nowrap text-foreground shadow-popover',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'start' && 'left-0',
        align === 'end' && 'right-0',
      )}
    >
      {label}
      {shortcut && <Kbd keys={shortcut} className="text-muted-foreground" />}
    </span>
  );
}
