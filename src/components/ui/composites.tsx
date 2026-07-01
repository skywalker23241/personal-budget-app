/**
 * App 级组合件（沿用旧 `@/components/ui` 的对外 API：Card/StatCard/SectionTitle/
 * EmptyState/Badge/ProgressBar），内部重建在 shadcn 原语 + 设计令牌之上。
 * 页面无需改动导入即可获得 shadcn 观感。
 */
import type { ReactNode } from 'react';
import { Card as CardPrimitive } from './card';
import { Progress } from './progress';
import { cn } from '@/lib/utils';

// ---------------- Card（带默认内边距，兼容旧用法） ----------------
export function Card({
  children,
  className = '',
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <CardPrimitive className={cn(padding && 'p-5', className)}>
      {children}
    </CardPrimitive>
  );
}

// ---------------- SectionTitle ----------------
export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ---------------- StatCard ----------------
type Tone = 'default' | 'income' | 'expense' | 'warning' | 'brand';

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}) {
  const valueTone: Record<Tone, string> = {
    default: 'text-foreground',
    income: 'text-success',
    expense: 'text-destructive',
    warning: 'text-warning',
    brand: 'text-foreground',
  };
  const iconTone: Record<Tone, string> = {
    default: 'bg-muted text-muted-foreground',
    income: 'bg-success/10 text-success',
    expense: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
    brand: 'bg-secondary text-secondary-foreground',
  };
  return (
    <CardPrimitive className="app-enter p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && (
          <span className={cn('rounded-lg p-1.5', iconTone[tone])}>{icon}</span>
        )}
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold tracking-tight',
          valueTone[tone],
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </CardPrimitive>
  );
}

// ---------------- ProgressBar ----------------
type BarTone = 'brand' | 'emerald' | 'amber' | 'rose' | 'slate';

export function ProgressBar({
  value,
  tone = 'brand',
  className = '',
}: {
  /** 0~1（可超过 1，会被截断到 100% 宽度但用颜色提示超出） */
  value: number;
  tone?: BarTone;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const toneColor: Record<BarTone, string> = {
    brand: 'bg-primary',
    emerald: 'bg-success',
    amber: 'bg-warning',
    rose: 'bg-destructive',
    slate: 'bg-muted-foreground',
  };
  return (
    <Progress
      value={pct}
      className={cn('h-2', className)}
      indicatorClassName={toneColor[tone]}
    />
  );
}

// ---------------- Badge ----------------
type BadgeTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'brand' | 'blue';

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    slate: 'bg-muted text-muted-foreground',
    emerald: 'bg-success/10 text-success',
    amber: 'bg-warning/10 text-warning',
    rose: 'bg-destructive/10 text-destructive',
    brand: 'bg-secondary text-secondary-foreground',
    blue: 'bg-info/10 text-info',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// ---------------- EmptyState ----------------
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
