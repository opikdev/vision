import { CenterFocusIcon, FileAddIcon, FolderOpenIcon } from '@hugeicons/core-free-icons';
import { reportError, vision } from '../../bridge';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

export function StartPanel() {
  return (
    <div className="dot-grid absolute inset-0 flex items-center justify-center p-8">
      <div className="flex max-w-[380px] flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-foreground text-background">
          <Icon icon={CenterFocusIcon} size={24} />
        </span>
        <h2 className="mt-7 text-lg font-semibold">Start a design</h2>
        <p className="mt-1.5 text-muted-foreground">
          A design is a .vis file on your Mac. Edit it with an AI agent or any text editor, and
          Vision redraws it every time it's saved.
        </p>
        <div className="mt-6 flex gap-2">
          <Button
            variant="primary"
            icon={FileAddIcon}
            shortcut="⌘N"
            aria-keyshortcuts="Meta+N"
            onClick={() => {
              vision.runCommand('new-design').catch(reportError);
            }}
          >
            New design
          </Button>
          <Button
            variant="secondary"
            icon={FolderOpenIcon}
            shortcut="⌘O"
            aria-keyshortcuts="Meta+O"
            onClick={() => {
              vision.runCommand('open').catch(reportError);
            }}
          >
            Open…
          </Button>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          You can also drop a .vis file anywhere in this window.
        </p>
      </div>
    </div>
  );
}
