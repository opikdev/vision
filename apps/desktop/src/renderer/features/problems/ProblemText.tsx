import type { Diagnostic, VisionDocument } from '@vision/format';
import { describeProblem, splitCode } from './problems';

function Rich({ text }: { text: string }) {
  return splitCode(text).map((part, index) =>
    part.code ? (
      <code key={index} className="text-xs">
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
      {line !== null && <span className="font-medium text-foreground">Line {line}</span>}
      {line !== null && place !== null && <span className="text-muted-foreground">, </span>}
      {place !== null && <span className="text-muted-foreground">{place}</span>}
      {(line !== null || place !== null) && <span className="text-muted-foreground">: </span>}
      <span className="text-foreground">
        <Rich text={message} />.
      </span>
      {hint !== null && (
        <span className="text-muted-foreground">
          {' '}
          <Rich text={hint} />
        </span>
      )}
    </>
  );
}
