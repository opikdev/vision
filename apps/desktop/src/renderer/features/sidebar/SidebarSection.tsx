import { useId, type ReactNode } from 'react';
import { cx } from '../../ui/cx';

export function SidebarSection({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="flex h-8 items-center px-2 text-sm text-ink-subtle">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SidebarRow({
  icon,
  label,
  trailing,
  current,
  className,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  current?: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={current === true ? 'true' : undefined}
      className={cx(
        'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left hover:bg-hover active:bg-active',
        current === true && 'bg-active hover:bg-active',
        className,
      )}
      onClick={onClick}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}
