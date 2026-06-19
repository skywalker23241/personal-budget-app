/**
 * 提醒卡片列表：用于仪表盘和报表页展示智能提醒。
 */
import type { Reminder, ReminderLevel } from '@/types';
import { IconAlert, IconInfo, IconBell, IconCheckCircle } from './Icons';

const LEVEL_STYLE: Record<
  ReminderLevel,
  { wrap: string; icon: JSX.Element }
> = {
  danger: {
    wrap: 'border-destructive/30 bg-destructive/10',
    icon: <IconAlert className="h-4 w-4 text-destructive" />,
  },
  warning: {
    wrap: 'border-warning/30 bg-warning/10',
    icon: <IconAlert className="h-4 w-4 text-warning" />,
  },
  info: {
    wrap: 'border-info/30 bg-info/10',
    icon: <IconInfo className="h-4 w-4 text-info" />,
  },
};

export function ReminderList({
  reminders,
  emptyText = '暂无提醒，一切正常 👍',
  max,
}: {
  reminders: Reminder[];
  emptyText?: string;
  max?: number;
}) {
  const list = max ? reminders.slice(0, max) : reminders;

  if (list.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-6 text-sm text-success">
        <IconCheckCircle className="h-5 w-5 text-success" />
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {list.map((r) => {
        const style = LEVEL_STYLE[r.level];
        return (
          <div
            key={r.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${style.wrap}`}
          >
            <span className="mt-0.5 shrink-0">{style.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{r.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {r.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 提醒数量徽标（用于侧边栏/标题旁） */
export function ReminderCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
      <IconBell className="h-3 w-3" />
      {count}
    </span>
  );
}
