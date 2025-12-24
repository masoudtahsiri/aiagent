import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  iconColor?: string;
  loading?: boolean;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconColor = 'bg-primary/10 text-primary',
  loading = false,
  className,
}: StatsCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const isNeutral = change === 0;

  if (loading) {
    return (
      <div className={cn('rounded-xl border bg-card p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border bg-card p-6 transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <div className={cn('p-2.5 rounded-lg', iconColor)}>
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-bold font-display">{value}</p>
        
        {change !== undefined && (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-sm font-medium',
                isPositive && 'text-success-600 dark:text-success-400',
                isNegative && 'text-error-600 dark:text-error-400',
                isNeutral && 'text-muted-foreground'
              )}
            >
              {isPositive && <TrendingUp className="h-4 w-4" />}
              {isNegative && <TrendingDown className="h-4 w-4" />}
              {isNeutral && <Minus className="h-4 w-4" />}
              {isPositive && '+'}
              {change}%
            </span>
            {changeLabel && (
              <span className="text-sm text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
