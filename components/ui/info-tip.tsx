'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * A small "?" that explains where a number comes from. Works on tap (mobile)
 * and hover (desktop); no library, no portal — it sits inline in the card.
 */
export function InfoTip({ text, label = 'Info' }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-40 top-5 left-1/2 -translate-x-1/2 w-64 rounded-card border border-border bg-card p-3 text-xs text-muted-foreground leading-relaxed shadow-elevated"
        >
          {text}
        </span>
      )}
    </span>
  );
}
