import { Alert02Icon, Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { formatDiagnostic, type Diagnostic, type VisionDocument } from '@vision/format';
import { useRef } from 'react';
import { IconButton } from '@/components/IconButton';
import { Alert, AlertAction, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Icon } from '../../ui/Icon';
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
  const strip = useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopy();
  const first = diagnostics.find((diagnostic) => diagnostic.severity === 'error');
  if (first === undefined) return null;
  return (
    <Alert
      ref={strip}
      variant="destructive"
      role={undefined}
      aria-live="polite"
      className="absolute top-3 left-4 z-20 h-10 w-auto max-w-[calc(100%-32px)] pr-1 pl-3"
    >
      <Icon icon={Alert02Icon} />
      <AlertTitle>
        <ProblemText diagnostic={first} document={document} />
      </AlertTitle>
      <AlertAction>
        <Separator orientation="vertical" className="data-vertical:h-4 data-vertical:self-center" />
        <ProblemsPopover
          diagnostics={diagnostics}
          document={document}
          label="Details"
          anchor={strip}
        />
        <IconButton
          icon={copied ? Tick02Icon : Copy01Icon}
          label={copied ? 'Copied' : 'Copy error'}
          onClick={() => {
            copy(formatDiagnostic(first));
          }}
        />
      </AlertAction>
    </Alert>
  );
}
