import type { Diagnostic } from '@vision/format';
import type { ReactNode } from 'react';
import type { DocumentState } from '../../../shared/contract';
import { ProblemList } from './ProblemList';

function Centered({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-8">
        <div className="w-full max-w-[560px]">
          <h2 className="text-title font-semibold">{title}</h2>
          {children}
        </div>
      </div>
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
        <p className="mt-1 text-ink-subtle select-text">
          It was moved, renamed or deleted. Vision draws it again as soon as it's back at{' '}
          <code className="text-[12px] text-ink">{state.displayPath}</code>.
        </p>
      </Centered>
    );
  }
  if (state.status === 'read-error') {
    return (
      <Centered title={`Can't read ${state.name}`}>
        <p className="mt-1 text-ink-subtle select-text">
          {state.readError}. Vision tries again the next time the file is saved.
        </p>
      </Centered>
    );
  }
  return (
    <Centered title="This file can't be drawn yet">
      <p className="mt-1 text-ink-subtle">
        Fix {diagnostics.length === 1 ? 'this error' : 'these errors'} and save. Vision draws the
        design as soon as the file is valid.
      </p>
      <div className="mt-4 rounded-lg border border-line bg-bg px-4 pt-1 pb-3">
        <ProblemList diagnostics={diagnostics} document={null} />
      </div>
    </Centered>
  );
}
