import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const CardComponent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border bg-card text-card-foreground shadow-sm',
          paddingClasses[padding],
          className
        )}
        {...props}
      />
    );
  }
);
CardComponent.displayName = 'Card';

interface CardSubComponentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeaderComponent = React.forwardRef<HTMLDivElement, CardSubComponentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('border-b border-gray-200 pb-4 mb-4', className)}
      {...props}
    />
  )
);
CardHeaderComponent.displayName = 'CardHeader';

const CardBodyComponent = React.forwardRef<HTMLDivElement, CardSubComponentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={className} {...props} />
  )
);
CardBodyComponent.displayName = 'CardBody';

const CardFooterComponent = React.forwardRef<HTMLDivElement, CardSubComponentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('border-t border-gray-200 pt-4 mt-4', className)}
      {...props}
    />
  )
);
CardFooterComponent.displayName = 'CardFooter';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight font-display',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = CardBodyComponent;

// Create Card with sub-components
const CardWithSubComponents = CardComponent as typeof CardComponent & {
  Header: typeof CardHeaderComponent;
  Body: typeof CardBodyComponent;
  Footer: typeof CardFooterComponent;
};

CardWithSubComponents.Header = CardHeaderComponent;
CardWithSubComponents.Body = CardBodyComponent;
CardWithSubComponents.Footer = CardFooterComponent;

export { 
  CardWithSubComponents as Card, 
  CardHeaderComponent as CardHeader, 
  CardFooterComponent as CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
};
