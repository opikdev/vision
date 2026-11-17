import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const badgeVariants = cva(
  'group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm px-2 whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        destructive: 'bg-destructive-tint text-destructive',
      },
    },
    defaultVariants: {
      variant: 'destructive',
    },
  },
);

function Badge({
  className,
  variant = 'destructive',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
