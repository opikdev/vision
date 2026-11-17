import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from './cx';
import { Icon, type IconSvgElement } from './Icon';
import { Kbd } from './Kbd';
import { useDismiss } from './use-dismiss';

export type MenuEntry =
  | {
      type: 'item';
      label: string;
      icon?: IconSvgElement;
      shortcut?: string;
      disabled?: boolean;
      onSelect: () => void;
    }
  | { type: 'submenu'; label: string; icon: IconSvgElement; entries: MenuEntry[] }
  | { type: 'separator' };

type Focus = 'first' | 'last' | 'menu' | 'none';

export function MenuButton({
  label,
  entries,
  className,
  children,
}: {
  label: string;
  entries: MenuEntry[];
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<Focus | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = useCallback((returnFocus: boolean) => {
    setOpen(null);
    if (returnFocus) triggerRef.current?.focus();
  }, []);
  const inside = useMemo(() => [triggerRef, menuRef], []);
  useDismiss(open !== null, close, inside);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open !== null}
        aria-controls={open === null ? undefined : menuId}
        className={cx(className, open !== null && 'bg-active')}
        onClick={(event) => {
          setOpen(open === null ? (event.detail === 0 ? 'first' : 'menu') : null);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          setOpen(event.key === 'ArrowDown' ? 'first' : 'last');
        }}
      >
        {children}
      </button>
      {open !== null && (
        <div ref={menuRef} className="absolute top-full -left-1.5 z-40 mt-1">
          <MenuList
            id={menuId}
            label={label}
            entries={entries}
            initialFocus={open}
            onClose={close}
          />
        </div>
      )}
    </div>
  );
}

function MenuList({
  id,
  label,
  entries,
  initialFocus,
  onClose,
  onBack,
}: {
  id?: string;
  label: string;
  entries: MenuEntry[];
  initialFocus: Focus;
  onClose: (returnFocus: boolean) => void;
  onBack?: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [submenu, setSubmenu] = useState<{ index: number; focus: Focus } | null>(null);

  const enabled = () => buttons.current.filter((button) => button !== null && !button.disabled);

  useEffect(() => {
    const all = buttons.current.filter((button) => button !== null && !button.disabled);
    if (initialFocus === 'menu') listRef.current?.focus();
    if (initialFocus === 'first') all[0]?.focus();
    if (initialFocus === 'last') all.at(-1)?.focus();
  }, [initialFocus]);

  const move = (delta: number) => {
    const all = enabled();
    const current = all.findIndex((button) => button === document.activeElement);
    const next =
      current === -1
        ? delta > 0
          ? 0
          : all.length - 1
        : (current + delta + all.length) % all.length;
    all[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        move(1);
        break;
      case 'ArrowUp':
        move(-1);
        break;
      case 'Home':
        enabled()[0]?.focus();
        break;
      case 'End':
        enabled().at(-1)?.focus();
        break;
      case 'ArrowLeft':
        if (onBack === undefined) return;
        onBack();
        break;
      case 'Escape':
        if (onBack === undefined) onClose(true);
        else onBack();
        break;
      case 'Tab':
        onClose(false);
        return;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={listRef}
      id={id}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="no-drag w-61 rounded-lg border border-border-strong bg-popover p-1 shadow-popover outline-none focus-visible:outline-none"
    >
      {entries.map((entry, index) => {
        if (entry.type === 'separator') {
          return <div key={index} role="separator" className="mx-2 my-1 h-px bg-border-strong" />;
        }
        const isSubmenu = entry.type === 'submenu';
        const isOpen = submenu?.index === index;
        return (
          <div
            key={index}
            className="relative"
            onPointerEnter={() => {
              setSubmenu(isSubmenu ? { index, focus: 'none' } : null);
            }}
          >
            <button
              ref={(button) => {
                buttons.current[index] = button;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={entry.type === 'item' && entry.disabled === true}
              aria-haspopup={isSubmenu ? 'menu' : undefined}
              aria-expanded={isSubmenu ? isOpen : undefined}
              aria-keyshortcuts={entry.type === 'item' ? entry.shortcut : undefined}
              className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-foreground outline-none hover:bg-active focus:bg-active focus-visible:outline-none disabled:opacity-50"
              onPointerMove={(event) => {
                event.currentTarget.focus();
              }}
              onKeyDown={(event) => {
                if (!isSubmenu || !['ArrowRight', 'Enter', ' '].includes(event.key)) return;
                event.preventDefault();
                event.stopPropagation();
                setSubmenu({ index, focus: 'first' });
              }}
              onClick={() => {
                if (entry.type === 'submenu') {
                  setSubmenu({ index, focus: 'first' });
                  return;
                }
                onClose(true);
                entry.onSelect();
              }}
            >
              {entry.icon && <Icon icon={entry.icon} className="shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {entry.type === 'item' && entry.shortcut && (
                <Kbd keys={entry.shortcut} className="text-muted-foreground" />
              )}
              {isSubmenu && <Icon icon={ArrowRight01Icon} className="text-muted-foreground" />}
            </button>
            {entry.type === 'submenu' && isOpen && (
              <div className="absolute -top-[5px] left-full ml-1.5">
                <MenuList
                  label={entry.label}
                  entries={entry.entries}
                  initialFocus={submenu.focus}
                  onClose={onClose}
                  onBack={() => {
                    setSubmenu(null);
                    buttons.current[index]?.focus();
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
