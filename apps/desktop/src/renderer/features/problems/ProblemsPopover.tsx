import type { Diagnostic, VisionDocument } from '@vision/format';
import { cn } from 'cn';
import type { ReactNode, RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { countProblems, plural } from './problems';
import { ProblemList } from './ProblemList';

export function ProblemsPopover({
  diagnostics,
  document,
  label,
  anchor,
  className,
}: {
  diagnostics: Diagnostic[];
  document: VisionDocument | null;
  label: ReactNode;
  anchor?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const { errors, warnings } = countProblems(diagnostics);
  const title = [errors > 0 && plural(errors, 'error'), warnings > 0 && plural(warnings, 'warning')]
    .filter(Boolean)
    .join(', ');

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="sm" className={cn('px-2', className)} />}
      >
        {label}
      </PopoverTrigger>
      <PopoverContent
        anchor={anchor}
        align="start"
        sideOffset={6}
        className="max-h-[min(480px,calc(100vh-120px))] w-[min(560px,calc(100vw-48px))] pt-3 pb-3"
      >
        <PopoverTitle className="pb-1">{title}</PopoverTitle>
        <ProblemList diagnostics={diagnostics} document={document} />
      </PopoverContent>
    </Popover>
  );
}
