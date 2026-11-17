import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Icon, type IconSvgElement } from '@/components/Icon';

export function IconButton({
  icon,
  label,
  shortcut,
  keyShortcuts,
  ...props
}: Omit<ComponentProps<typeof Button>, 'children' | 'variant' | 'size'> & {
  icon: IconSvgElement;
  label: string;
  shortcut?: string;
  keyShortcuts?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-keyshortcuts={keyShortcuts}
            {...props}
          />
        }
      >
        <Icon icon={icon} />
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
}
