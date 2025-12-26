import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  [
    'flex w-full rounded-lg border bg-background px-4 text-sm',
    'ring-offset-background transition-all duration-200',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
  ],
  {
    variants: {
      inputSize: {
        sm: 'h-9 text-xs',
        default: 'h-11 text-sm',
        lg: 'h-13 text-base',
      },
      state: {
        default: 'border-input',
        error: 'border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive',
      },
    },
    defaultVariants: {
      inputSize: 'default',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text',
    inputSize,
    state,
    label,
    helperText,
    error,
    leftIcon,
    rightIcon,
    id,
    ...props 
  }, ref) => {
    const inputId = id || React.useId();
    const hasError = !!error;
    
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <input
            id={inputId}
            type={type}
            className={cn(
              inputVariants({ inputSize, state: hasError ? 'error' : state }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <p className={cn(
            'text-xs',
            hasError ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
