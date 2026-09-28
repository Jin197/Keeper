import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  variant?: 'keeper' | 'eco' | 'warning' | 'danger';
}

export function Progress({
  value,
  variant = 'keeper',
  className,
  ...props
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const colors = {
    keeper: 'bg-keeper',
    eco: 'bg-eco',
    warning: 'bg-amber-500',
    danger: 'bg-destructive',
  };
  return (
    <div
      className={cn(
        'relative h-1.5 w-full overflow-hidden rounded-pill bg-muted',
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-pill transition-all duration-500',
          colors[variant],
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
