import { Copy01Icon, PlugSocketIcon } from '@hugeicons/core-free-icons';
import type { Artboard } from '@vision/format';
import { useViewStore } from '../../stores/view-store';
import { Button } from '../../ui/Button';
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
      className="absolute flex items-center gap-4 rounded-lg border border-line bg-bg py-3 pr-3 pl-4"
      style={position}
    >
      <div className="min-w-0 flex-1">
        <h2 id="empty-design-title">This design is empty</h2>
        <p className="text-ink-subtle">
          Edit <code className="text-[12px] text-ink select-text">{displayPath}</code> with an AI
          agent or a text editor. It redraws here on save.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          icon={Copy01Icon}
          onClick={() => {
            copy(path);
          }}
        >
          {copied ? 'Copied' : 'Copy path'}
        </Button>
        <Button
          size="sm"
          variant="quiet"
          icon={PlugSocketIcon}
          onClick={() => {
            openDialog('connect-ai');
          }}
        >
          Connect an AI
        </Button>
      </div>
    </section>
  );
}
