import type { Diagnostic, VisionDocument } from '@vision/format';
import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../ui/cx';
import { useDismiss } from '../../ui/use-dismiss';
import { countProblems, plural } from './problems';
import { ProblemList } from './ProblemList';

export function ProblemsPopover({
  diagnostics,
  document,
  label,
  className,
  panelClassName,
}: {
  diagnostics: Diagnostic[];
  document: VisionDocument | null;
  label: ReactNode;
  className: string;
  panelClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);
  const inside = useMemo(() => [triggerRef, panelRef], []);
  useDismiss(open, close, inside);
  const { errors, warnings } = countProblems(diagnostics);
  const title = [errors > 0 && plural(errors, 'error'), warnings > 0 && plural(warnings, 'warning')]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={className}
        onClick={() => {
          setOpen(!open);
        }}
      >
        {label}
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={title}
          className={cx(
            'no-drag absolute z-30 flex max-h-[min(480px,calc(100vh-120px))] w-[min(560px,calc(100vw-48px))] flex-col rounded-lg border border-line-strong bg-popover px-4 pt-3 pb-3 shadow-popover',
            panelClassName,
          )}
        >
          <h2 className="pb-1 text-sm text-ink-subtle">{title}</h2>
          <ProblemList diagnostics={diagnostics} document={document} />
        </div>
      )}
    </>
  );
}
