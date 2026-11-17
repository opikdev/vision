import type { Diagnostic, VisionDocument } from '@vision/format';
import { describeProblem, splitCode } from './problems';

function Rich({ text }: { text: string }) {
  return splitCode(text).map((part, index) =>
    part.code ? (
      <code key={index} className="text-sm">
        {part.text}
      </code>
    ) : (
      part.text
    ),
  );
}

export function ProblemText({
  diagnostic,
  document,
}: {
  diagnostic: Diagnostic;
  document: VisionDocument | null;
}) {
  const { line, place, message, hint } = describeProblem(diagnostic, document);
  return (
    <>
      {line !== null && <span className="font-medium text-ink">Line {line}</span>}
      {line !== null && place !== null && <span className="text-ink-subtle">, </span>}
      {place !== null && <span className="text-ink-subtle">{place}</span>}
      {(line !== null || place !== null) && <span className="text-ink-subtle">: </span>}
      <span className="text-ink">
        <Rich text={message} />.
      </span>
      {hint !== null && (
        <span className="text-ink-subtle">
          {' '}
          <Rich text={hint} />
        </span>
      )}
    </>
  );
}
