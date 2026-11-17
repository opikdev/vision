import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  FrameIcon,
  Image01Icon,
  SquareIcon,
  TextIcon,
  VectorSquareIcon,
} from '@hugeicons/core-free-icons';
import type { Artboard, Page } from '@vision/format';
import {
  memo,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from 'cn';
import { Icon, type IconSvgElement } from '@/components/Icon';
import { isArtboard, labelFor, visibleRows, type Layer, type LayerRow } from './layer-rows';
import { LayerMenu } from './LayerMenu';
import { useLayerStore } from './layer-store';

const typeIcons: Record<string, IconSvgElement> = {
  artboard: FrameIcon,
  frame: SquareIcon,
  text: TextIcon,
  image: Image01Icon,
  svg: VectorSquareIcon,
};

export function layerType(layer: Layer): string {
  return isArtboard(layer) ? 'artboard' : layer.type;
}

export function LayerTree({
  page,
  artboardMeta,
}: {
  page: Page;
  artboardMeta: (artboard: Artboard) => ReactNode;
}) {
  const expanded = useLayerStore((store) => store.expanded);
  const selectedId = useLayerStore((store) =>
    store.selection?.pageId === page.id ? store.selection.id : null,
  );
  const revealed = useLayerStore((store) => store.revealed);
  const rows = useMemo(() => visibleRows(page, expanded), [page, expanded]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const tree = useRef<HTMLDivElement>(null);
  const tabStop = [focusedId, selectedId].find(
    (id) => id !== null && rows.some((row) => row.id === id),
  );
  const tabStopId = tabStop ?? rows[0]?.id ?? null;

  const rowElement = (id: string) =>
    tree.current?.querySelector<HTMLElement>(`[data-layer-id="${CSS.escape(id)}"]`) ?? null;

  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (id === null) return;
    pendingFocus.current = null;
    rowElement(id)?.focus();
  });

  useEffect(() => {
    if (revealed === 0) return;
    const id = useLayerStore.getState().selection?.id;
    if (id !== undefined) rowElement(id)?.scrollIntoView({ block: 'nearest' });
  }, [revealed]);

  const focus = (id: string | undefined) => {
    if (id === undefined) return;
    pendingFocus.current = id;
    setFocusedId(id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = rows.findIndex((row) => row.id === tabStopId);
    const row = rows[index];
    if (row === undefined) return;
    const { setExpanded, select } = useLayerStore.getState();
    switch (event.key) {
      case 'ArrowDown':
        focus(rows[index + 1]?.id);
        break;
      case 'ArrowUp':
        focus(rows[index - 1]?.id);
        break;
      case 'Home':
        focus(rows[0]?.id);
        break;
      case 'End':
        focus(rows.at(-1)?.id);
        break;
      case 'ArrowRight':
        if (row.expandable && !row.expanded) setExpanded(row.id, true);
        else if (row.expanded) focus(rows[index + 1]?.id);
        break;
      case 'ArrowLeft':
        if (row.expanded) setExpanded(row.id, false);
        else focus(row.parentId ?? undefined);
        break;
      case 'Enter':
      case ' ':
        select({ pageId: page.id, id: row.id });
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <LayerMenu page={page}>
      <div
        ref={tree}
        role="tree"
        aria-label="Layers"
        className="flex flex-col"
        onKeyDown={onKeyDown}
        onPointerLeave={() => {
          useLayerStore.getState().hover(null);
        }}
        onContextMenu={(event) => {
          const id =
            event.target instanceof Element
              ? event.target.closest('[data-layer-id]')?.getAttribute('data-layer-id')
              : undefined;
          if (id == null) event.stopPropagation();
          else useLayerStore.getState().select({ pageId: page.id, id });
        }}
      >
        {rows.map((row) => (
          <LayerTreeRow
            key={row.id}
            row={row}
            pageId={page.id}
            selected={row.id === selectedId}
            tabbable={row.id === tabStopId}
            meta={isArtboard(row.layer) ? artboardMeta(row.layer) : null}
            onFocus={setFocusedId}
          />
        ))}
      </div>
    </LayerMenu>
  );
}

const LayerTreeRow = memo(function LayerTreeRow({
  row,
  pageId,
  selected,
  tabbable,
  meta,
  onFocus,
}: {
  row: LayerRow;
  pageId: string;
  selected: boolean;
  tabbable: boolean;
  meta: ReactNode;
  onFocus: (id: string) => void;
}) {
  const hovered = useLayerStore((store) => store.hovered === row.id);
  const labelId = useId();
  const metaId = useId();
  const { id, layer, depth, expandable, expanded } = row;
  return (
    <div
      role="treeitem"
      data-layer-id={id}
      data-hovered={hovered ? '' : undefined}
      aria-labelledby={labelId}
      aria-describedby={meta === null ? undefined : metaId}
      aria-level={depth + 1}
      aria-expanded={expandable ? expanded : undefined}
      aria-selected={selected}
      tabIndex={tabbable ? 0 : -1}
      className={cn(
        'group flex h-7 shrink-0 items-center gap-1.5 rounded-md pr-2 whitespace-nowrap',
        selected ? 'bg-active' : hovered && 'bg-accent',
      )}
      style={{ paddingLeft: 4 + depth * 12 }}
      onClick={() => {
        useLayerStore.getState().select({ pageId, id });
      }}
      onFocus={(event) => {
        if (event.target === event.currentTarget) onFocus(id);
      }}
      onPointerEnter={() => {
        useLayerStore.getState().hover(id);
      }}
    >
      <span
        className="grid size-4 shrink-0 place-items-center text-muted-foreground"
        onClick={(event) => {
          if (!expandable) return;
          event.stopPropagation();
          useLayerStore.getState().setExpanded(id, !expanded);
        }}
      >
        {expandable && <Icon icon={expanded ? ArrowDown01Icon : ArrowRight01Icon} size={12} />}
      </span>
      <Icon
        icon={typeIcons[layerType(layer)] ?? SquareIcon}
        className="shrink-0 text-muted-foreground group-aria-selected:text-foreground"
      />
      <span id={labelId} className="min-w-0 flex-1 truncate">
        {labelFor(layer)}
      </span>
      {meta !== null && (
        <span id={metaId} className="ml-auto flex min-w-0 pl-2 text-xs">
          {meta}
        </span>
      )}
    </div>
  );
});
