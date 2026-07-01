import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SummaryMeta = {
  label: string;
  value: ReactNode;
};

type AccentTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const accentTone: Record<AccentTone, string> = {
  default: 'bg-white/70',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
};

export function AppSummaryCard({
  eyebrow,
  title,
  value,
  subtitle,
  meta = [],
  accent = 'default',
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  meta?: SummaryMeta[];
  accent?: AccentTone;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'app-pop app-card-motion relative overflow-hidden rounded-lg border border-zinc-900 bg-zinc-950 p-5 text-zinc-50 shadow-sm dark:border-zinc-800 dark:bg-zinc-900',
        className,
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 transition-[width,opacity] duration-300',
          accentTone[accent],
        )}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-medium text-zinc-400">{eyebrow}</p>
          )}
          <p className="mt-1 text-sm text-zinc-300">{title}</p>
          <div className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
            {value}
          </div>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {meta.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {meta.map((item) => (
            <div
              key={item.label}
              className="app-press min-w-0 rounded-md border border-white/10 bg-white/10 px-3 py-2"
            >
              <p className="truncate text-xs text-zinc-400">{item.label}</p>
              <p className="mt-1 truncate text-sm font-semibold text-zinc-50">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
