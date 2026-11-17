import { cn } from 'cn';

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      aria-hidden="true"
      className={cn(
        'pointer-events-none inline-flex items-center font-sans text-xs text-muted-foreground select-none group-data-[variant=default]/button:text-primary-foreground/60',
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
