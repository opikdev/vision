import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { IconButton } from './IconButton';

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="no-drag m-auto max-h-[calc(100vh-64px)] w-[560px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-lg border border-line-strong bg-popover p-0 text-ink shadow-popover backdrop:bg-bg/70"
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <IconButton icon={Cancel01Icon} label="Close" keyShortcuts="Escape" onClick={onClose} />
      </div>
      <div className="px-5 pb-5">{children}</div>
    </dialog>
  );
}
