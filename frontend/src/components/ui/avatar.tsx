import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
        '2xl': 'h-24 w-24 text-2xl',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  name?: string;
  status?: 'online' | 'offline' | 'busy' | 'away';
  color?: string;
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, src, alt, name, status, color, ...props }, ref) => {
  // Generate initials from name
  const initials = React.useMemo(() => {
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || '?';
  }, [name]);

  // Generate color from name
  const bgColor = React.useMemo(() => {
    if (color) return color;
    if (!name) return '#64748B';
    
    const colors = [
      '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', 
      '#F97316', '#EAB308', '#22C55E', '#06B6D4',
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [name, color]);

  const statusColors = {
    online: 'bg-success-500',
    offline: 'bg-muted',
    busy: 'bg-error-500',
    away: 'bg-warning-500',
  };

  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        <AvatarPrimitive.Image
          src={src}
          alt={alt || name}
          className="aspect-square h-full w-full object-cover"
        />
        <AvatarPrimitive.Fallback
          className="flex h-full w-full items-center justify-center font-medium text-white"
          style={{ backgroundColor: bgColor }}
          delayMs={600}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            statusColors[status],
            size === 'xs' && 'h-1.5 w-1.5',
            size === 'sm' && 'h-2 w-2',
            size === 'default' && 'h-2.5 w-2.5',
            size === 'lg' && 'h-3 w-3',
            size === 'xl' && 'h-4 w-4',
            size === '2xl' && 'h-5 w-5',
          )}
        />
      )}
    </div>
  );
});
Avatar.displayName = 'Avatar';

// Avatar Group
interface AvatarGroupProps {
  avatars: AvatarProps[];
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
}

function AvatarGroup({ avatars, max = 4, size = 'default' }: AvatarGroupProps) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className="flex -space-x-2">
      {displayed.map((avatar, i) => (
        <Avatar
          key={i}
          {...avatar}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            avatarVariants({ size }),
            'flex items-center justify-center bg-muted text-muted-foreground font-medium ring-2 ring-background'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

export { Avatar, AvatarGroup, avatarVariants };
