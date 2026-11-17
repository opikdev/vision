import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Cursor02Icon,
} from '@hugeicons/core-free-icons';
import type { Page } from '@vision/format';
import type { CSSProperties } from 'react';
import { cn } from 'cn';
import { useViewStore, type Viewport } from '../../stores/view-store';
import { Icon } from '@/components/Icon';
import { panTo } from '../canvas/canvas-commands';
import { useAgentStore, type AgentPresence } from './agent-store';
import {
  edgePlacement,
  labelShift,
  screenPoint,
  type CursorTarget,
  type Edge,
  type EdgePlacement,
} from './cursor-geometry';

const arrows = {
  left: ArrowLeft01Icon,
  right: ArrowRight01Icon,
  top: ArrowUp01Icon,
  bottom: ArrowDown01Icon,
} as const;

const tip = 2;

export function AgentCursors({ page, viewport }: { page: Page | undefined; viewport: Viewport }) {
  const agents = useAgentStore((store) => store.agents);
  const size = useViewStore((store) => store.canvasSize);
  if (page === undefined || size === null) return null;
  return Object.values(agents).map((presence) => {
    const { target } = presence;
    const artboard = page.artboards.find((candidate) => candidate.id === target?.artboardId);
    if (target === null || artboard === undefined) return null;
    const placement = edgePlacement(screenPoint(target, viewport), size);
    return (
      <div key={presence.session}>
        <AgentCursor
          presence={presence}
          target={target}
          viewport={viewport}
          hidden={placement !== null}
        />
        {placement !== null && (
          <EdgePill
            presence={presence}
            target={target}
            placement={placement}
            artboardName={artboard.name}
          />
        )}
      </div>
    );
  });
}

function AgentCursor({
  presence,
  target,
  viewport,
  hidden,
}: {
  presence: AgentPresence;
  target: CursorTarget;
  viewport: Viewport;
  hidden: boolean;
}) {
  const shift = labelShift(target);
  // Panning and zooming move the outer layer at once; only a new target glides.
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute top-0 left-0 origin-top-left transition-opacity duration-200 starting:opacity-0',
        (hidden || presence.leaving) && 'opacity-0',
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
          <Icon
            icon={Cursor02Icon}
            size={18}
            className="shrink-0 fill-background text-foreground"
          />
          <span className="mt-3.5 flex h-5 items-center rounded-sm border border-border-strong bg-background px-1.5 text-xs font-medium whitespace-nowrap">
            {presence.agent}
          </span>
        </div>
      </div>
    </div>
  );
}

const edgePosition: Record<Edge, (offset: number) => CSSProperties> = {
  left: (offset) => ({ left: 16, top: offset, transform: 'translateY(-50%)' }),
  right: (offset) => ({ right: 16, top: offset, transform: 'translateY(-50%)' }),
  top: (offset) => ({ top: 16, left: offset, transform: 'translateX(-50%)' }),
  bottom: (offset) => ({ bottom: 16, left: offset, transform: 'translateX(-50%)' }),
};

function EdgePill({
  presence,
  target,
  placement,
  artboardName,
}: {
  presence: AgentPresence;
  target: CursorTarget;
  placement: EdgePlacement;
  artboardName: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Go to ${artboardName}, where ${presence.agent} is working`}
      className={cn(
        'absolute flex h-8 items-center gap-2 rounded-md border border-border-strong bg-popover pr-1.5 pl-2.5 text-xs whitespace-nowrap text-muted-foreground shadow-popover transition-opacity duration-200 starting:opacity-0 hover:bg-active hover:text-foreground active:bg-active',
        presence.leaving && 'opacity-0',
      )}
      style={edgePosition[placement.edge](placement.offset)}
      onClick={() => {
        panTo(target);
      }}
    >
      <Icon icon={Cursor02Icon} size={14} className="shrink-0" />
      <span>
        <span className="font-medium text-foreground">{presence.agent}</span> on {artboardName}
      </span>
      <Icon icon={arrows[placement.edge]} className="shrink-0" />
    </button>
  );
}
