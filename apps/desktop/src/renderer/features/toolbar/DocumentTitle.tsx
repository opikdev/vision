import { Note01Icon } from '@hugeicons/core-free-icons';
import type { ReactNode } from 'react';
import { Icon } from '../../ui/Icon';

export function DocumentTitle({
  name,
  pageName,
  children,
}: {
  name: string;
  pageName: string | undefined;
  children?: ReactNode;
}) {
  return (
    <>
      <h1 className="flex min-w-0 items-center gap-2">
        <Icon icon={Note01Icon} className="shrink-0 text-ink-subtle" />
        <span className="truncate text-ink-subtle">{name}</span>
        {pageName !== undefined && (
          <>
            <span aria-hidden="true" className="text-ink-subtle">
              /
            </span>
            <span className="truncate">{pageName}</span>
          </>
        )}
      </h1>
      {children}
    </>
  );
}
