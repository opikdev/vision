import { Cursor02Icon } from '@hugeicons/core-free-icons';
import type { Page } from '@vision/format';
import type { Viewport } from '../../stores/view-store';
import { cx } from '../../ui/cx';
import { Icon } from '../../ui/Icon';
import { useAgentStore, type AgentPresence } from './agent-store';
import { labelShift, type CursorTarget } from './cursor-geometry';

const tip = 2;

export function AgentCursors({ page, viewport }: { page: Page | undefined; viewport: Viewport }) {
  const agents = useAgentStore((store) => store.agents);
  if (page === undefined) return null;
  return Object.values(agents).map((presence) => {
    const { target } = presence;
    const onPage = page.artboards.some((artboard) => artboard.id === target?.artboardId);
    if (target === null || !onPage) return null;
    return (
      <AgentCursor key={presence.session} presence={presence} target={target} viewport={viewport} />
    );
  });
}

function AgentCursor({
  presence,
  target,
  viewport,
}: {
  presence: AgentPresence;
  target: CursorTarget;
  viewport: Viewport;
}) {
  const shift = labelShift(target);
  // Panning and zooming move the outer layer at once; only a new target glides.
  return (
    <div
      aria-hidden="true"
      className={cx(
        'pointer-events-none absolute top-0 left-0 origin-top-left transition-opacity duration-200 starting:opacity-0',
        presence.leaving && 'opacity-0',
      )}
      style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
    >
      <div
        className="transition-transform duration-300 ease-in-out motion-reduce:transition-none"
        style={{ transform: `translate(${target.x}px, ${target.y}px)` }}
      >
        <div
          className="flex origin-top-left items-start gap-0.5"
          style={{
            transform: `scale(${1 / viewport.zoom}) translate(${shift.x - tip}px, ${shift.y - tip}px)`,
          }}
        >
          <Icon icon={Cursor02Icon} size={18} className="shrink-0 fill-bg text-ink" />
          <span className="mt-3.5 flex h-5 items-center rounded-sm border border-line-strong bg-bg px-1.5 text-sm font-medium whitespace-nowrap">
            {presence.agent}
          </span>
        </div>
      </div>
    </div>
  );
}
