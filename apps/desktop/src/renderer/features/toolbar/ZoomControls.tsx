import { FitToScreenIcon, ZoomInIcon, ZoomOutIcon } from '@hugeicons/core-free-icons';
import { IconButton } from '@/components/IconButton';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useViewStore } from '../../stores/view-store';
import { runCanvasCommand } from '../canvas/canvas-commands';
import { useCurrentPage } from '../canvas/current-page';

export function ZoomControls({ disabled }: { disabled: boolean }) {
  const page = useCurrentPage();
  const zoom = useViewStore((store) =>
    page === undefined ? undefined : store.viewports[page.id]?.zoom,
  );
  const percent = zoom === undefined ? '–' : `${Math.round(zoom * 100)}%`;
  return (
    <>
      <IconButton
        icon={ZoomOutIcon}
        label="Zoom out"
        shortcut="⌘−"
        keyShortcuts="Meta+-"
        disabled={disabled}
        onClick={() => {
          runCanvasCommand('zoom-out');
        }}
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Zoom ${percent}, reset to 100%`}
              aria-keyshortcuts="Meta+0"
              disabled={disabled}
              className="w-12 px-0 tabular-nums"
              onClick={() => {
                runCanvasCommand('zoom-reset');
              }}
            />
          }
        >
          {percent}
        </TooltipTrigger>
        <TooltipContent>
          Reset to 100%
          <Kbd>⌘0</Kbd>
        </TooltipContent>
      </Tooltip>
      <IconButton
        icon={ZoomInIcon}
        label="Zoom in"
        shortcut="⌘="
        keyShortcuts="Meta+="
        disabled={disabled}
        onClick={() => {
          runCanvasCommand('zoom-in');
        }}
      />
      <IconButton
        icon={FitToScreenIcon}
        label="Zoom to fit"
        shortcut="⇧1"
        keyShortcuts="Shift+1"
        disabled={disabled}
        onClick={() => {
          runCanvasCommand('zoom-fit');
        }}
      />
    </>
  );
}
