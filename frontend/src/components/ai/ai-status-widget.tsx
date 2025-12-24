import { motion } from 'framer-motion';
import { Phone, PhoneOff, PhoneCall, Clock, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

type AIStatus = 'active' | 'on_call' | 'idle' | 'offline' | 'error';

interface AIStatusWidgetProps {
  status: AIStatus;
  callsToday?: number;
  currentCallDuration?: number;
  aiName?: string;
  className?: string;
}

const statusConfig: Record<AIStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Phone;
  animate: boolean;
}> = {
  active: {
    label: 'Active & Ready',
    color: 'text-success-600 dark:text-success-400',
    bgColor: 'bg-success-100 dark:bg-success-500/20',
    icon: Phone,
    animate: true,
  },
  on_call: {
    label: 'On Call',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: PhoneCall,
    animate: true,
  },
  idle: {
    label: 'Idle',
    color: 'text-warning-600 dark:text-warning-400',
    bgColor: 'bg-warning-100 dark:bg-warning-500/20',
    icon: Clock,
    animate: false,
  },
  offline: {
    label: 'Offline',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: PhoneOff,
    animate: false,
  },
  error: {
    label: 'Error',
    color: 'text-error-600 dark:text-error-400',
    bgColor: 'bg-error-100 dark:bg-error-500/20',
    icon: PhoneOff,
    animate: false,
  },
};

export function AIStatusWidget({
  status,
  callsToday = 0,
  currentCallDuration,
  aiName = 'AI Assistant',
  className,
}: AIStatusWidgetProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-6',
        className
      )}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-lg', config.bgColor)}>
            <Bot className={cn('h-5 w-5', config.color)} />
          </div>
          <div>
            <h3 className="font-semibold">{aiName}</h3>
            <p className="text-sm text-muted-foreground">Virtual Receptionist</p>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div
              className={cn(
                'h-3 w-3 rounded-full',
                status === 'active' && 'bg-success-500',
                status === 'on_call' && 'bg-primary',
                status === 'idle' && 'bg-warning-500',
                status === 'offline' && 'bg-muted-foreground',
                status === 'error' && 'bg-error-500'
              )}
            />
            {config.animate && (
              <motion.div
                className={cn(
                  'absolute inset-0 rounded-full',
                  status === 'active' && 'bg-success-500',
                  status === 'on_call' && 'bg-primary'
                )}
                animate={{
                  scale: [1, 1.8, 1.8],
                  opacity: [0.8, 0, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />
            )}
          </div>
          <span className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Calls Today</p>
          <p className="text-2xl font-bold">{callsToday}</p>
        </div>
        
        {status === 'on_call' && currentCallDuration !== undefined ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current Call</p>
            <p className="text-2xl font-bold text-primary">
              {formatDuration(currentCallDuration)}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="flex items-center gap-2">
              <Icon className={cn('h-5 w-5', config.color)} />
              <span className="font-medium">{config.label}</span>
            </div>
          </div>
        )}
      </div>

      {/* Voice waveform animation for on_call status */}
      {status === 'on_call' && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-center gap-1 h-8">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-primary rounded-full"
                animate={{
                  height: [8, 20 + Math.random() * 12, 8],
                }}
                transition={{
                  duration: 0.5 + Math.random() * 0.5,
                  repeat: Infinity,
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
