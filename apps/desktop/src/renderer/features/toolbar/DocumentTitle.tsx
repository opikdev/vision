import { Note01Icon } from '@hugeicons/core-free-icons';
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';

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
        <Icon icon={Note01Icon} className="shrink-0 text-muted-foreground" />
        <span className="truncate text-muted-foreground">{name}</span>
        {pageName !== undefined && (
          <>
            <span aria-hidden="true" className="text-muted-foreground">
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
