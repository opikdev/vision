import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useViewStore } from '../stores/view-store';
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
  const { dropActive, dropHandlers } = useFileDrop();
  return (
    <div className="flex h-full flex-col" {...dropHandlers}>
      <TopBar title={title} actions={actions} />
      <SidebarProvider open={sidebarVisible} className="min-h-0 flex-1">
        <Sidebar variant="inset">
          <SidebarContent role="navigation" aria-label="Sidebar" className="gap-3 px-2 pt-3 pb-2">
            {sidebar}
          </SidebarContent>
        </Sidebar>
        <SidebarInset className={cn(dropActive && 'outline-2 -outline-offset-2 outline-ring')}>
          {children}
        </SidebarInset>
      </SidebarProvider>
      <ConnectAiDialog />
    </div>
  );
}
