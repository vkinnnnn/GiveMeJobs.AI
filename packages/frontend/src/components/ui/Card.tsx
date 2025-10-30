/**
 * Card Component
 * Responsive card with touch-friendly interactions
 */

import { forwardRef, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      interactive = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-white border border-gray-200',
      outlined: 'bg-transparent border-2 border-gray-300',
      elevated: 'bg-white shadow-lg',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-3 sm:p-4',
      md: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
    };

    const interactiveStyles = interactive
      ? 'cursor-pointer hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2'
      : '';

    return (
      <div
        ref={ref}
        className={`rounded-lg ${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg sm:text-xl font-semibold text-gray-900 ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-gray-600 mt-1 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mt-4 pt-4 border-t border-gray-200 ${className}`}>{children}</div>;
}
