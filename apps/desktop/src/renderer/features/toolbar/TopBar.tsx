import type { ReactNode } from 'react';
import { useViewStore } from '../../stores/view-store';
import { cx } from '../../ui/cx';
import { Separator } from '../../ui/Separator';
import { AppMenu } from '../app-menu/AppMenu';
import { SidebarToggle } from './SidebarToggle';

export function TopBar({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  const sidebarVisible = useViewStore((store) => store.sidebarVisible);
  return (
    <header className="drag-region flex h-12 shrink-0 items-center">
      <div
        className={cx(
          'flex h-full shrink-0 items-center pl-[76px]',
          sidebarVisible ? 'w-62 justify-between pr-2' : 'gap-2.5',
        )}
      >
        <AppMenu />
        <SidebarToggle />
      </div>
      <Separator className="mr-4 ml-3" />
      <div className="flex min-w-0 flex-1 items-center gap-3">{title}</div>
      {actions && <div className="flex shrink-0 items-center gap-1.5 pr-2.5 pl-4">{actions}</div>}
    </header>
  );
}
