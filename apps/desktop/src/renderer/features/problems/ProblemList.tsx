import { Alert02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import type { Diagnostic, VisionDocument } from '@vision/format';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { useCopy } from '../../ui/use-copy';
import { errorsFirst, problemsText } from './problems';
import { ProblemText } from './ProblemText';

export function ProblemList({
  diagnostics,
  document,
}: {
  diagnostics: Diagnostic[];
  document: VisionDocument | null;
}) {
  const { copied, copy } = useCopy();
  return (
    <div className="flex min-h-0 flex-col">
      <ul className="min-h-0 overflow-y-auto select-text">
        {errorsFirst(diagnostics).map((diagnostic, index) => (
          <li key={index} className="flex gap-2.5 border-b border-line py-2.5 last:border-b-0">
            <span className="pt-0.5">
              {diagnostic.severity === 'error' ? (
                <Icon icon={Alert02Icon} className="text-red" />
              ) : (
                <Icon icon={InformationCircleIcon} className="text-ink-subtle" />
              )}
            </span>
            <p className="min-w-0 flex-1 break-words">
              <span className="sr-only">
                {diagnostic.severity === 'error' ? 'Error: ' : 'Warning: '}
              </span>
              <ProblemText diagnostic={diagnostic} document={document} />
            </p>
          </li>
        ))}
      </ul>
      <div className="flex justify-end pt-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            copy(problemsText(diagnostics));
          }}
        >
          {copied ? 'Copied' : 'Copy all'}
        </Button>
      </div>
    </div>
  );
}
