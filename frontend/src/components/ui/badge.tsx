import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        primary: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary/10 text-secondary',
        success: 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400',
        warning: 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400',
        error: 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400',
        info: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400',
        outline: 'border border-current bg-transparent',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span 
          className={cn(
            'w-1.5 h-1.5 rounded-full mr-1.5',
            variant === 'success' && 'bg-success-500',
            variant === 'warning' && 'bg-warning-500',
            variant === 'error' && 'bg-error-500',
            variant === 'primary' && 'bg-primary',
            variant === 'secondary' && 'bg-secondary',
            (!variant || variant === 'default') && 'bg-muted-foreground'
          )}
        />
      )}
      {children}
    </div>
  );
}

// Appointment status badge
export function AppointmentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    scheduled: 'default',
    confirmed: 'primary',
    completed: 'success',
    cancelled: 'error',
    no_show: 'warning',
  };

  const labels: Record<string, string> = {
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  };

  return (
    <Badge variant={variants[status] || 'default'} dot>
      {labels[status] || status}
    </Badge>
  );
}

export { Badge, badgeVariants };
