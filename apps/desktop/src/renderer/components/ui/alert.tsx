import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import type * as React from 'react';

const alertVariants = cva(
  'group/alert relative flex w-full items-center gap-3 rounded-md border border-border-strong bg-popover text-left text-popover-foreground shadow-popover [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: '',
        destructive: '[&>svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('min-w-0 truncate', className)} {...props} />;
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn('flex shrink-0 items-center gap-3', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertAction };
