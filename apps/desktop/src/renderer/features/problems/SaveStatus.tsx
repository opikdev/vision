import { Alert02Icon } from '@hugeicons/core-free-icons';
import type { Diagnostic } from '@vision/format';
import type { DocumentState } from '../../../shared/contract';
import { Icon } from '../../ui/Icon';
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
        <Badge>{errors === 1 ? 'Save has an error' : `Save has ${plural(errors, 'error')}`}</Badge>
        {state.document !== null && <Note>Showing the version before it</Note>}
      </>
    );
  }
  if (state.status === 'missing') {
    return (
      <>
        <Badge>File not found</Badge>
        {state.document !== null && <Note>Showing the last version</Note>}
      </>
    );
  }
  if (state.status === 'read-error') {
    return (
      <>
        <Badge>Can't read the file</Badge>
        <Note>{state.readError ?? ''}</Note>
      </>
    );
  }
  const { warnings } = countProblems(diagnostics);
  return (
    <>
      {showUpdated && state.mtimeMs !== null && <UpdatedAgo mtimeMs={state.mtimeMs} />}
      {warnings > 0 && (
        <span className="relative">
          <ProblemsPopover
            diagnostics={diagnostics}
            document={state.document}
            label={plural(warnings, 'warning')}
            className="no-drag h-7 rounded-sm px-2 text-ink-subtle tabular-nums hover:bg-hover hover:text-ink active:bg-active"
            panelClassName="top-full left-0 mt-1.5"
          />
        </span>
      )}
    </>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="flex h-[22px] shrink-0 items-center gap-1.5 rounded-sm bg-red-tint px-2 text-red">
      <Icon icon={Alert02Icon} size={14} />
      {children}
    </span>
  );
}

function Note({ children }: { children: string }) {
  return <span className="truncate text-ink-subtle">{children}</span>;
}
