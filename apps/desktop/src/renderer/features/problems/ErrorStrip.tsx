import { Alert02Icon, Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { formatDiagnostic, type Diagnostic, type VisionDocument } from '@vision/format';
import { Icon } from '../../ui/Icon';
import { IconButton } from '../../ui/IconButton';
import { Separator } from '../../ui/Separator';
import { useCopy } from '../../ui/use-copy';
import { ProblemsPopover } from './ProblemsPopover';
import { ProblemText } from './ProblemText';

export function ErrorStrip({
  diagnostics,
  document,
}: {
  diagnostics: Diagnostic[];
  document: VisionDocument | null;
}) {
  const { copied, copy } = useCopy();
  const first = diagnostics.find((diagnostic) => diagnostic.severity === 'error');
  if (first === undefined) return null;
  return (
    <div
      aria-live="polite"
      className="absolute top-3 left-4 z-20 flex h-10 max-w-[calc(100%-32px)] items-center gap-3 rounded-md border border-border-strong bg-popover pr-1 pl-3 shadow-popover"
    >
      <Icon icon={Alert02Icon} className="shrink-0 text-destructive" />
      <p className="min-w-0 truncate">
        <ProblemText diagnostic={first} document={document} />
      </p>
      <Separator />
      <ProblemsPopover
        diagnostics={diagnostics}
        document={document}
        label="Details"
        className="h-7 shrink-0 rounded-sm px-2 text-muted-foreground hover:bg-accent hover:text-foreground active:bg-active"
        panelClassName="top-full left-0 mt-1.5"
      />
      <IconButton
        icon={copied ? Tick02Icon : Copy01Icon}
        label={copied ? 'Copied' : 'Copy error'}
        onClick={() => {
          copy(formatDiagnostic(first));
        }}
      />
    </div>
  );
}
