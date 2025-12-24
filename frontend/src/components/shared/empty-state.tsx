import { ReactNode, ElementType } from 'react';
import { FolderOpen, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon | ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="mb-4 p-4 rounded-full bg-muted">
        {Icon ? <Icon className="h-8 w-8 text-muted-foreground" /> : <FolderOpen className="h-8 w-8 text-muted-foreground" />}
      </div>
      
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      
      {action && action}
    </div>
  );
}
