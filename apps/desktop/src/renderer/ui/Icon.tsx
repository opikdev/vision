import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

export type { IconSvgElement };

export function Icon({
  icon,
  size = 16,
  className,
}: {
  icon: IconSvgElement;
  size?: number;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={1.5}
      className={className}
      aria-hidden="true"
      focusable="false"
    />
  );
}
