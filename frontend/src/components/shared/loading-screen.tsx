import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

// Loading Screen
export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <Logo size="xl" />
        
        {/* Loading dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-primary"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
        
        <p className="text-sm text-muted-foreground">Loading...</p>
      </motion.div>
    </div>
  );
}

// Logo
interface LogoProps {
  size?: 'sm' | 'default' | 'lg' | 'xl';
  variant?: 'default' | 'white';
  collapsed?: boolean;
}

export function Logo({ size = 'default', variant = 'default', collapsed = false }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    default: 'h-8',
    lg: 'h-10',
    xl: 'h-12',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  };

  const textSizes = {
    sm: 'text-base',
    default: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <div className={cn('flex items-center gap-2', sizeClasses[size])}>
      <div className={cn(
        'flex items-center justify-center rounded-lg',
        'bg-gradient-to-br from-primary to-secondary',
        size === 'sm' && 'p-1.5',
        size === 'default' && 'p-2',
        size === 'lg' && 'p-2.5',
        size === 'xl' && 'p-3',
      )}>
        <Phone className={cn(
          'text-white',
          iconSizes[size]
        )} />
      </div>
      
      {!collapsed && (
        <span className={cn(
          'font-display font-bold',
          textSizes[size],
          variant === 'white' ? 'text-white' : 'text-foreground'
        )}>
          Recept<span className="text-primary">.</span>AI
        </span>
      )}
    </div>
  );
}
