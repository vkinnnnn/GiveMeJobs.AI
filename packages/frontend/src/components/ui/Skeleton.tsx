/**
 * Skeleton Loading Component
 * Provides skeleton screens for better perceived performance
 */

import { useReducedMotion } from '@/hooks/useAccessibility';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
}: SkeletonProps) {
  const reducedMotion = useReducedMotion();

  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const animationClass = reducedMotion ? '' : 'animate-pulse';

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`bg-gray-200 ${variantStyles[variant]} ${animationClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '80%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`} aria-hidden="true">
      <div className="flex items-center space-x-4 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" className="mb-2" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}
