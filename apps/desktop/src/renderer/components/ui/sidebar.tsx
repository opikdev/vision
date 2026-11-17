import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from 'cn';
import * as React from 'react';

const SIDEBAR_WIDTH = '248px';

interface SidebarContextProps {
  state: 'expanded' | 'collapsed';
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

function SidebarProvider({
  open,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  open: boolean;
}) {
  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({ state: open ? 'expanded' : 'collapsed' }),
    [open],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={{ '--sidebar-width': SIDEBAR_WIDTH, ...style } as React.CSSProperties}
        className={cn(
          'group/sidebar-wrapper relative flex w-full has-data-[variant=inset]:bg-sidebar',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  variant = 'sidebar',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'sidebar' | 'inset';
}) {
  const { state } = useSidebar();

  return (
    <div
      className="group peer text-sidebar-foreground"
      data-state={state}
      data-collapsible={state === 'collapsed' ? 'offcanvas' : ''}
      data-variant={variant}
      data-side="left"
      data-slot="sidebar"
    >
      <div
        data-slot="sidebar-gap"
        className="relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0"
      />
      <div
        data-slot="sidebar-container"
        data-side="left"
        className={cn(
          'absolute inset-y-0 left-0 z-10 flex w-(--sidebar-width) transition-[left,visibility] duration-200 ease-linear group-data-[collapsible=offcanvas]:invisible group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]',
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="flex size-full flex-col bg-sidebar"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        'relative flex w-full min-w-0 flex-1 flex-col overflow-hidden bg-canvas transition-[margin] duration-200 ease-linear peer-data-[variant=inset]:mr-2 peer-data-[variant=inset]:mb-2 peer-data-[variant=inset]:rounded-lg peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
        className,
      )}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn('flex min-h-0 flex-1 flex-col gap-0 overflow-auto', className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn('relative flex w-full min-w-0 flex-col', className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'> & React.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          'flex h-8 shrink-0 items-center px-2 text-xs text-muted-foreground [&>svg]:shrink-0',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-group-label',
      sidebar: 'group-label',
    },
  });
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('flex w-full min-w-0 flex-col gap-0', className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  );
}

function SidebarMenuButton({
  render,
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<'button'> &
  React.ComponentProps<'button'> & {
    isActive?: boolean;
  }) {
  return useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        type: 'button',
        className: cn(
          'peer/menu-button group/menu-button flex h-8 w-full items-center gap-2.5 overflow-hidden rounded-md px-2 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-active disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-active [&_svg]:shrink-0 [&>span:last-child]:truncate',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-menu-button',
      sidebar: 'menu-button',
      active: isActive,
    },
  });
}

function SidebarMenuAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<'button'> & React.ComponentProps<'button'>) {
  return useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        type: 'button',
        className: cn(
          'no-drag absolute top-0.5 right-0.5 flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground active:bg-active [&>svg]:shrink-0',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-menu-action',
      sidebar: 'menu-action',
    },
  });
}

export {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
};
