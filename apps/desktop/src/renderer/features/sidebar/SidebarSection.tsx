import { useId, type ReactNode } from 'react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <SidebarGroup role="group" aria-labelledby={id}>
      <SidebarGroupLabel render={<h2 id={id} />}>{title}</SidebarGroupLabel>
      {children}
    </SidebarGroup>
  );
}

export function SidebarRow({
  icon,
  label,
  trailing,
  current = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  current?: boolean;
  onClick: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={current}
        aria-current={current ? 'true' : undefined}
        onClick={onClick}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {trailing}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
