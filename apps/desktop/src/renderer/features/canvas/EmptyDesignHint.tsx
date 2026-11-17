import { Copy01Icon, PlugSocketIcon } from '@hugeicons/core-free-icons';
import type { Artboard } from '@vision/format';
import { Button } from '@/components/ui/button';
import { Icon } from '../../ui/Icon';
import { useViewStore } from '../../stores/view-store';
import { useCopy } from '../../ui/use-copy';
import type { Viewport } from '../../stores/view-store';

export function EmptyDesignHint({
  artboard,
  viewport,
  path,
  displayPath,
}: {
  artboard: Artboard | undefined;
  viewport: Viewport;
  path: string;
  displayPath: string;
}) {
  const { copied, copy } = useCopy();
  const openDialog = useViewStore((store) => store.openDialog);
  const position =
    artboard === undefined
      ? { left: viewport.x, top: viewport.y, width: 480 }
      : {
          left: Math.round(viewport.x + artboard.x * viewport.zoom),
          top: Math.round(viewport.y + (artboard.y + artboard.height) * viewport.zoom) + 20,
          width: Math.max(Math.round(artboard.width * viewport.zoom), 480),
        };
  return (
    <section
      aria-labelledby="empty-design-title"
      className="absolute flex items-center gap-4 rounded-lg border border-border bg-background py-3 pr-3 pl-4"
      style={position}
    >
      <div className="min-w-0 flex-1">
        <h2 id="empty-design-title">This design is empty</h2>
        <p className="text-muted-foreground">
          Edit <code className="text-xs text-foreground select-text">{displayPath}</code> with an AI
          agent or a text editor. It redraws here on save.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            copy(path);
          }}
        >
          <Icon icon={Copy01Icon} />
          {copied ? 'Copied' : 'Copy path'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            openDialog('connect-ai');
          }}
        >
          <Icon icon={PlugSocketIcon} />
          Connect an AI
        </Button>
      </div>
    </section>
  );
}
