/**
 * 月份选择器：左右切换 + 显示当前月份。
 */
import { IconChevronLeft, IconChevronRight, IconCalendar } from './Icons';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatMonthLabel, nextMonth, prevMonth, currentMonth } from '@/lib/format';

export function MonthPicker({
  month,
  onChange,
  className = '',
}: {
  month: string;
  onChange: (m: string) => void;
  className?: string;
}) {
  const isCurrent = month === currentMonth();
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border bg-card p-1',
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(prevMonth(month))}
        aria-label="上个月"
      >
        <IconChevronLeft className="h-4 w-4" />
      </Button>
      <span className="flex min-w-[6.5rem] items-center justify-center gap-1.5 text-sm font-medium text-foreground">
        <IconCalendar className="h-4 w-4 text-muted-foreground" />
        {formatMonthLabel(month)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(nextMonth(month))}
        aria-label="下个月"
        disabled={isCurrent}
        title={isCurrent ? '已是当前月份' : ''}
      >
        <IconChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
