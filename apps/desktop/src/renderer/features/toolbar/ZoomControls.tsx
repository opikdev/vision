import { FitToScreenIcon, ZoomInIcon, ZoomOutIcon } from '@hugeicons/core-free-icons';
import { useViewStore } from '../../stores/view-store';
import { IconButton } from '../../ui/IconButton';
import { Tooltip, useTooltip } from '../../ui/Tooltip';
import { runCanvasCommand } from '../canvas/canvas-commands';
import { useCurrentPage } from '../canvas/current-page';

export function ZoomControls({ disabled }: { disabled: boolean }) {
  const page = useCurrentPage();
  const zoom = useViewStore((store) =>
    page === undefined ? undefined : store.viewports[page.id]?.zoom,
  );
  const tooltip = useTooltip();
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
      <span className="relative inline-flex">
        <button
          type="button"
          aria-label={`Zoom ${percent}, reset to 100%`}
          aria-keyshortcuts="Meta+0"
          disabled={disabled}
          className="no-drag h-7 w-12 rounded-sm text-center text-ink-subtle tabular-nums hover:bg-hover hover:text-ink active:bg-active disabled:opacity-40"
          onClick={() => {
            runCanvasCommand('zoom-reset');
          }}
          {...tooltip.triggerProps}
        >
          {percent}
        </button>
        <Tooltip open={tooltip.open} label="Reset to 100%" shortcut="⌘0" />
      </span>
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
        tooltipAlign="end"
        disabled={disabled}
        onClick={() => {
          runCanvasCommand('zoom-fit');
        }}
      />
    </>
  );
}
