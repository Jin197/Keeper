import { cn } from '@/lib/utils';

export function Logo({
  className,
  showWordmark = true,
  wordmarkResponsive = false,
}: {
  className?: string;
  showWordmark?: boolean;
  /** Hide the wordmark below sm breakpoint while keeping the glyph visible */
  wordmarkResponsive?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative h-8 w-8 shrink-0">
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="keeper-grad" x1="0" y1="0" x2="32" y2="32">
              <stop offset="0%" stopColor="#007AFF" />
              <stop offset="100%" stopColor="#2ECC71" />
            </linearGradient>
          </defs>
          {/* Hood silhouette */}
          <path
            d="M3 22 C 7 14, 13 10, 16 10 C 19 10, 25 14, 29 22"
            stroke="url(#keeper-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Growth curve */}
          <path
            d="M5 26 L 12 19 L 17 23 L 27 11"
            stroke="url(#keeper-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="27" cy="11" r="2" fill="#2ECC71" />
        </svg>
      </div>
      {showWordmark && (
        <span
          className={cn(
            'font-display text-lg font-bold tracking-tight',
            wordmarkResponsive && 'hidden sm:inline',
          )}
        >
          keeper
        </span>
      )}
    </div>
  );
}
