import { FileAddIcon, FolderOpenIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Kbd } from '@/components/ui/kbd';
import { reportError, vision } from '../../bridge';
import { Icon } from '@/components/Icon';
import appIcon from '../../../../build/icon.svg';

export function StartPanel() {
  return (
    <Empty className="dot-grid absolute inset-0">
      <EmptyHeader className="max-w-[380px]">
        <EmptyMedia>
          <img src={appIcon} alt="" width={60} height={60} draggable={false} className="-m-1.5" />
        </EmptyMedia>
        <EmptyTitle>Start a design</EmptyTitle>
        <EmptyDescription>
          A design is a .vis file on your Mac. Edit it with an AI agent or any text editor, and
          Vision redraws it every time it's saved.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="gap-8">
        <div className="flex gap-2">
          <Button
            aria-keyshortcuts="Meta+N"
            onClick={() => {
              vision.runCommand('new-design').catch(reportError);
            }}
          >
            <Icon icon={FileAddIcon} />
            New design
            <Kbd>⌘N</Kbd>
          </Button>
          <Button
            variant="secondary"
            aria-keyshortcuts="Meta+O"
            onClick={() => {
              vision.runCommand('open').catch(reportError);
            }}
          >
            <Icon icon={FolderOpenIcon} />
            Open…
            <Kbd>⌘O</Kbd>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          You can also drop a .vis file anywhere in this window.
        </p>
      </EmptyContent>
    </Empty>
  );
}
