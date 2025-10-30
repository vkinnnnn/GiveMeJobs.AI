/**
 * Responsive Grid Component
 * Provides responsive grid layouts
 */

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 4,
  className = '',
}: ResponsiveGridProps) {
  const colClasses = [
    cols.xs && `grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`grid ${colClasses} gap-${gap} ${className}`}>
      {children}
    </div>
  );
}
