import {
  ArrowDown01Icon,
  Clock01Icon,
  Copy01Icon,
  FileAddIcon,
  Folder01Icon,
  FolderOpenIcon,
  Logout03Icon,
  Note01Icon,
  PlugSocketIcon,
} from '@hugeicons/core-free-icons';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import type { AppCommand } from '../../../shared/contract';
import { reportError, vision } from '../../bridge';
import { useDocumentStore } from '../../stores/document-store';
import { useRecentStore } from '../../stores/recent-store';
import { useViewStore } from '../../stores/view-store';
import { Icon, type IconSvgElement } from '@/components/Icon';
import { VisionMark } from '@/components/VisionMark';

const run = (command: AppCommand) => () => {
  vision.runCommand(command).catch(reportError);
};

export function AppMenu() {
  const hasDesign = useDocumentStore((store) => store.state !== null);
  const files = useRecentStore((store) => store.files);
  const recent = files.filter((file) => file.exists);
  const openDialog = useViewStore((store) => store.openDialog);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            aria-label="Vision menu"
            className="gap-1 px-1.5 hover:text-muted-foreground data-popup-open:bg-active"
          />
        }
      >
        <VisionMark className="text-foreground" />
        <Icon icon={ArrowDown01Icon} size={12} />
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Vision menu" alignOffset={-6} className="w-61">
        <Entry icon={FileAddIcon} label="New design…" shortcut="⌘N" onClick={run('new-design')} />
        <Entry icon={FolderOpenIcon} label="Open…" shortcut="⌘O" onClick={run('open')} />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Icon icon={Clock01Icon} />
            <span className="min-w-0 flex-1 truncate">Open recent</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent aria-label="Open recent" className="w-61">
            {recent.length === 0 ? (
              <DropdownMenuItem disabled>No recent designs</DropdownMenuItem>
            ) : (
              recent.map((file) => (
                <Entry
                  key={file.path}
                  icon={Note01Icon}
                  label={file.name}
                  onClick={() => {
                    vision.openPath(file.path).catch(reportError);
                  }}
                />
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <Entry
          icon={Folder01Icon}
          label="Show in Finder"
          shortcut="⌥⌘R"
          disabled={!hasDesign}
          onClick={run('show-in-finder')}
        />
        <Entry
          icon={Copy01Icon}
          label="Copy file path"
          disabled={!hasDesign}
          onClick={run('copy-path')}
        />
        <Entry
          icon={PlugSocketIcon}
          label="Connect an AI…"
          onClick={() => {
            openDialog('connect-ai');
          }}
        />
        <DropdownMenuSeparator />
        <Entry icon={Logout03Icon} label="Quit Vision" shortcut="⌘Q" onClick={run('quit')} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Entry({
  icon,
  label,
  shortcut,
  ...props
}: Omit<ComponentProps<typeof DropdownMenuItem>, 'children'> & {
  icon: IconSvgElement;
  label: string;
  shortcut?: string;
}) {
  return (
    <DropdownMenuItem aria-keyshortcuts={shortcut} {...props}>
      <Icon icon={icon} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </DropdownMenuItem>
  );
}
