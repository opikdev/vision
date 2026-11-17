import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import { Icon, type IconSvgElement } from './Icon';
import { Tooltip, useTooltip } from './Tooltip';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconSvgElement;
  label: string;
  shortcut?: string;
  keyShortcuts?: string;
  tooltipAlign?: 'start' | 'center' | 'end';
}

export function IconButton({
  icon,
  label,
  shortcut,
  keyShortcuts,
  tooltipAlign,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  const tooltip = useTooltip();
  return (
    <span className="relative inline-flex">
      <button
        type={type}
        aria-label={label}
        aria-keyshortcuts={keyShortcuts}
        className={cx(
          'no-drag inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground active:bg-active disabled:pointer-events-none disabled:opacity-40',
          className,
        )}
        {...tooltip.triggerProps}
        {...props}
      >
        <Icon icon={icon} />
      </button>
      <Tooltip open={tooltip.open} label={label} shortcut={shortcut} align={tooltipAlign} />
    </span>
  );
}
