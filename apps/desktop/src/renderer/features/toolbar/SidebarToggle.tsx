import { Layout2ColumnIcon, LayoutAlignLeftIcon } from '@hugeicons/core-free-icons';
import { IconButton } from '@/components/IconButton';
import { useViewStore } from '../../stores/view-store';

export function SidebarToggle() {
  const visible = useViewStore((store) => store.sidebarVisible);
  const toggle = useViewStore((store) => store.toggleSidebar);
  return (
    <IconButton
      icon={visible ? Layout2ColumnIcon : LayoutAlignLeftIcon}
      label={visible ? 'Hide sidebar' : 'Show sidebar'}
      shortcut="⌘\"
      keyShortcuts="Meta+\"
      aria-pressed={visible}
      onClick={toggle}
    />
  );
}
