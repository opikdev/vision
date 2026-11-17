import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import type * as React from 'react';

const itemVariants = cva('group/item flex w-full items-center rounded-lg border', {
  variants: {
    variant: {
      default: 'border-transparent',
      outline: 'border-border bg-background',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function Item({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'div'> & VariantProps<typeof itemVariants>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(itemVariants({ variant, className })),
      },
      props,
    ),
    render,
    state: {
      slot: 'item',
      variant,
    },
  });
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-content"
      className={cn('flex min-w-0 flex-1 flex-col', className)}
      {...props}
    />
  );
}

function ItemTitle({ className, render, ...props }: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>({ className: cn('flex w-fit items-center gap-2', className) }, props),
    render,
    state: {
      slot: 'item-title',
    },
  });
}

function ItemDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="item-description"
      className={cn('text-left text-muted-foreground', className)}
      {...props}
    />
  );
}

function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-actions"
      className={cn('flex shrink-0 items-center gap-1.5', className)}
      {...props}
    />
  );
}

export { Item, ItemContent, ItemActions, ItemTitle, ItemDescription };
