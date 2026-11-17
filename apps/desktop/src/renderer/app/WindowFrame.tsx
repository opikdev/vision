import type { ReactNode } from 'react';
import { useViewStore } from '../stores/view-store';
import { cx } from '../ui/cx';
import { ConnectAiDialog } from '../features/connect-ai/ConnectAiDialog';
import { TopBar } from '../features/toolbar/TopBar';
import { useFileDrop } from './use-file-drop';

export function WindowFrame({
  title,
  actions,
  sidebar,
  children,
}: {
  title: ReactNode;
  actions?: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const sidebarVisible = useViewStore((store) => store.sidebarVisible);
  const dialog = useViewStore((store) => store.dialog);
  const { dropActive, dropHandlers } = useFileDrop();
  return (
    <div className="flex h-full flex-col" {...dropHandlers}>
      <TopBar title={title} actions={actions} />
      <div className="flex min-h-0 flex-1">
        {sidebarVisible && (
          <nav aria-label="Sidebar" className="w-62 shrink-0 overflow-y-auto px-2 pt-3 pb-2">
            {sidebar}
          </nav>
        )}
        <main className={cx('min-w-0 flex-1 pr-2 pb-2', !sidebarVisible && 'pl-2')}>
          <div
            className={cx(
              'relative h-full overflow-hidden rounded-lg bg-canvas',
              dropActive && 'outline-2 -outline-offset-2 outline-ring',
            )}
          >
            {children}
          </div>
        </main>
      </div>
      {dialog === 'connect-ai' && <ConnectAiDialog />}
    </div>
  );
}
