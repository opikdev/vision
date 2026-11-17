import { Alert02Icon } from '@hugeicons/core-free-icons';
import type { Diagnostic } from '@vision/format';
import { Badge } from '@/components/ui/badge';
import type { DocumentState } from '../../../shared/contract';
import { Icon } from '@/components/Icon';
import { UpdatedAgo } from '../toolbar/UpdatedAgo';
import { countProblems, plural } from './problems';
import { ProblemsPopover } from './ProblemsPopover';

export function SaveStatus({
  state,
  diagnostics,
  showUpdated = true,
}: {
  state: DocumentState;
  diagnostics: Diagnostic[];
  showUpdated?: boolean;
}) {
  if (state.status === 'invalid') {
    const { errors } = countProblems(diagnostics);
    return (
      <>
        <ErrorBadge>
          {errors === 1 ? 'Save has an error' : `Save has ${plural(errors, 'error')}`}
        </ErrorBadge>
        {state.document !== null && <Note>Showing the version before it</Note>}
      </>
    );
  }
  if (state.status === 'missing') {
    return (
      <>
        <ErrorBadge>File not found</ErrorBadge>
        {state.document !== null && <Note>Showing the last version</Note>}
      </>
    );
  }
  if (state.status === 'read-error') {
    return (
      <>
        <ErrorBadge>Can't read the file</ErrorBadge>
        <Note>{state.readError ?? ''}</Note>
      </>
    );
  }
  const { warnings } = countProblems(diagnostics);
  return (
    <>
      {showUpdated && state.mtimeMs !== null && <UpdatedAgo mtimeMs={state.mtimeMs} />}
      {warnings > 0 && (
        <ProblemsPopover
          diagnostics={diagnostics}
          document={state.document}
          label={plural(warnings, 'warning')}
          className="tabular-nums"
        />
      )}
    </>
  );
}

function ErrorBadge({ children }: { children: string }) {
  return (
    <Badge variant="destructive">
      <Icon icon={Alert02Icon} size={14} />
      {children}
    </Badge>
  );
}

function Note({ children }: { children: string }) {
  return <span className="truncate text-muted-foreground">{children}</span>;
}
