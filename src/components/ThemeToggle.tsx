/**
 * 主题切换控件。ThemeToggle：紧凑循环按钮（浅 → 深 → 系统）；
 * ThemeSegmented：设置页用的分段选择。
 */
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from './theme-provider';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'dark', label: '深色', Icon: Moon },
  { value: 'system', label: '跟随系统', Icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const idx = OPTIONS.findIndex((o) => o.value === theme);
  const current = OPTIONS[idx === -1 ? 2 : idx];
  const next = () => setTheme(OPTIONS[(idx + 1) % OPTIONS.length].value);
  const { Icon, label } = current;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={next}
      className={className}
      title={`主题：${label}（点击切换）`}
      aria-label={`主题：${label}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="inline-flex rounded-lg border p-1">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
