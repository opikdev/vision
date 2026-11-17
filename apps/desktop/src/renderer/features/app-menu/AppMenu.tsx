import {
  ArrowDown01Icon,
  CenterFocusIcon,
  Clock01Icon,
  Copy01Icon,
  FileAddIcon,
  Folder01Icon,
  FolderOpenIcon,
  Logout03Icon,
  Note01Icon,
  PlugSocketIcon,
} from '@hugeicons/core-free-icons';
import type { AppCommand } from '../../../shared/contract';
import { reportError, vision } from '../../bridge';
import { useDocumentStore } from '../../stores/document-store';
import { useRecentStore } from '../../stores/recent-store';
import { useViewStore } from '../../stores/view-store';
import { Icon } from '../../ui/Icon';
import { MenuButton, type MenuEntry } from '../../ui/Menu';

const run = (command: AppCommand) => () => {
  vision.runCommand(command).catch(reportError);
};

export function AppMenu() {
  const hasDesign = useDocumentStore((store) => store.state !== null);
  const files = useRecentStore((store) => store.files);
  const recent = files.filter((file) => file.exists);
  const openDialog = useViewStore((store) => store.openDialog);

  const recentEntries: MenuEntry[] =
    recent.length === 0
      ? [{ type: 'item', label: 'No recent designs', disabled: true, onSelect: () => undefined }]
      : recent.map((file) => ({
          type: 'item',
          label: file.name,
          icon: Note01Icon,
          onSelect: () => {
            vision.openPath(file.path).catch(reportError);
          },
        }));

  const entries: MenuEntry[] = [
    {
      type: 'item',
      label: 'New design…',
      icon: FileAddIcon,
      shortcut: '⌘N',
      onSelect: run('new-design'),
    },
    { type: 'item', label: 'Open…', icon: FolderOpenIcon, shortcut: '⌘O', onSelect: run('open') },
    { type: 'submenu', label: 'Open recent', icon: Clock01Icon, entries: recentEntries },
    { type: 'separator' },
    {
      type: 'item',
      label: 'Show in Finder',
      icon: Folder01Icon,
      shortcut: '⌥⌘R',
      disabled: !hasDesign,
      onSelect: run('show-in-finder'),
    },
    {
      type: 'item',
      label: 'Copy file path',
      icon: Copy01Icon,
      disabled: !hasDesign,
      onSelect: run('copy-path'),
    },
    {
      type: 'item',
      label: 'Connect an AI…',
      icon: PlugSocketIcon,
      onSelect: () => {
        openDialog('connect-ai');
      },
    },
    { type: 'separator' },
    {
      type: 'item',
      label: 'Quit Vision',
      icon: Logout03Icon,
      shortcut: '⌘Q',
      onSelect: run('quit'),
    },
  ];

  return (
    <MenuButton
      label="Vision menu"
      entries={entries}
      className="no-drag flex h-8 items-center gap-1 rounded-sm pr-1.5 pl-1 text-ink-subtle hover:bg-hover active:bg-active"
    >
      <span className="flex size-6 items-center justify-center rounded-sm bg-ink text-bg">
        <Icon icon={CenterFocusIcon} />
      </span>
      <Icon icon={ArrowDown01Icon} size={12} />
    </MenuButton>
  );
}
