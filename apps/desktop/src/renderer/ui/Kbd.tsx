import { cx } from './cx';

export function Kbd({ keys, className }: { keys: string; className?: string }) {
  return (
    <kbd aria-hidden="true" className={cx('font-sans text-xs', className)}>
      {keys}
    </kbd>
  );
}
