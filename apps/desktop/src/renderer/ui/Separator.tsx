import { cx } from './cx';

export function Separator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={cx('h-4 w-px shrink-0 bg-border-strong', className)}
    />
  );
}
