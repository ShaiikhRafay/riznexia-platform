import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[var(--min-touch-target)] min-w-[var(--min-touch-target)]',
  {
    variants: {
      variant: {
        solid: 'bg-primary text-background hover:opacity-90',
        outline: 'border border-primary text-primary hover:bg-primary hover:text-background',
        floating: 'bg-accent text-background shadow-token hover:opacity-90',
        banner: 'w-full rounded-none bg-primary text-background hover:opacity-90',
      },
    },
    defaultVariants: {
      variant: 'solid',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
