'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onChange: (v: string) => void;
}

const TabsCtx = createContext<TabsContextValue | null>(null);

interface TabsProps {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsCtx.Provider value={{ value, onChange: setValue }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-8 mb-4 px-4 sm:px-6 lg:px-8 border-b border-border bg-background/90 backdrop-blur-xl overflow-x-auto',
        className,
      )}
    >
      <div className="flex gap-1 min-w-min">{children}</div>
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
  accent?: 'keeper' | 'eco' | 'amber' | 'destructive' | 'gold';
  badge?: ReactNode;
}

export function TabsTrigger({
  value,
  children,
  icon,
  accent = 'keeper',
  badge,
}: TabsTriggerProps) {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error('TabsTrigger must be used inside <Tabs>');
  const active = ctx.value === value;
  const accentClasses = {
    keeper: active
      ? 'text-keeper border-keeper'
      : 'text-muted-foreground hover:text-foreground border-transparent',
    eco: active
      ? 'text-eco border-eco'
      : 'text-muted-foreground hover:text-foreground border-transparent',
    amber: active
      ? 'text-amber-500 border-amber-500'
      : 'text-muted-foreground hover:text-foreground border-transparent',
    destructive: active
      ? 'text-destructive border-destructive'
      : 'text-muted-foreground hover:text-foreground border-transparent',
    gold: active
      ? 'text-[#C5A059] border-[#C5A059]'
      : 'text-muted-foreground hover:text-foreground border-transparent',
  } as const;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.onChange(value)}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
        accentClasses[accent],
      )}
    >
      {icon}
      <span>{children}</span>
      {badge}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error('TabsContent must be used inside <Tabs>');
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className={cn('space-y-6', className)}>
      {children}
    </div>
  );
}
