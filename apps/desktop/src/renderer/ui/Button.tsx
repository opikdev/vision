import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconSvgElement } from './Icon';
import { Kbd } from './Kbd';

type Variant = 'primary' | 'secondary' | 'quiet';

const variants: Record<Variant, string> = {
  primary: 'bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80',
  secondary: 'bg-accent text-foreground hover:bg-active active:bg-border-strong',
  quiet: 'text-muted-foreground hover:bg-accent hover:text-foreground active:bg-active',
};

const shortcutColors: Record<Variant, string> = {
  primary: 'text-background/60',
  secondary: 'text-muted-foreground',
  quiet: 'text-muted-foreground',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  icon?: IconSvgElement;
  shortcut?: string;
  children: ReactNode;
}

export function Button({
  variant = 'quiet',
  size = 'md',
  icon,
  shortcut,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'no-drag inline-flex shrink-0 items-center gap-2 rounded-sm whitespace-nowrap disabled:pointer-events-none disabled:opacity-40',
        size === 'md' ? 'h-8 px-3' : 'h-7 px-2.5',
        variants[variant],
        className,
      )}
      {...props}
    >
      {icon && <Icon icon={icon} />}
      {children}
      {shortcut && <Kbd keys={shortcut} className={shortcutColors[variant]} />}
    </button>
  );
}
