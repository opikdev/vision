import type { Diagnostic } from '@vision/format';
import type { ReactNode } from 'react';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import type { DocumentState } from '../../../shared/contract';
import { ProblemList } from './ProblemList';

function Centered({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <Empty className="min-h-full text-left">
        <EmptyHeader className="w-full max-w-[560px] items-stretch gap-1">
          <EmptyTitle>{title}</EmptyTitle>
          {children}
        </EmptyHeader>
      </Empty>
    </div>
  );
}

export function BlockedState({
  state,
  diagnostics,
}: {
  state: DocumentState;
  diagnostics: Diagnostic[];
}) {
  if (state.status === 'missing') {
    return (
      <Centered title={`Can't find ${state.name}`}>
        <EmptyDescription className="select-text">
          It was moved, renamed or deleted. Vision draws it again as soon as it's back at{' '}
          <code className="text-xs text-foreground">{state.displayPath}</code>.
        </EmptyDescription>
      </Centered>
    );
  }
  if (state.status === 'read-error') {
    return (
      <Centered title={`Can't read ${state.name}`}>
        <EmptyDescription className="select-text">
          {state.readError}. Vision tries again the next time the file is saved.
        </EmptyDescription>
      </Centered>
    );
  }
  return (
    <Centered title="This file can't be drawn yet">
      <EmptyDescription>
        Fix {diagnostics.length === 1 ? 'this error' : 'these errors'} and save. Vision draws the
        design as soon as the file is valid.
      </EmptyDescription>
      <div className="mt-3 rounded-lg border border-border bg-background px-4 pt-1 pb-3">
        <ProblemList diagnostics={diagnostics} document={null} />
      </div>
    </Centered>
  );
}
