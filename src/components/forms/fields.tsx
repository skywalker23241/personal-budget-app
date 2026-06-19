/**
 * 表单字段辅助组件：统一的标签、必填标记、错误提示样式。
 */
import { useId, type ReactNode } from 'react';
import {
  Label,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
import { cn } from '@/lib/utils';

export function Field({
  label,
  required,
  error,
  children,
  hint,
  className = '',
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** 一组按钮式的单选（用于交易类型等） */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** 复选开关 */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal text-foreground">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** 下拉选择（shadcn Select 封装）。options 支持字符串或 {value,label}。 */
type OptionLike = string | { value: string; label: string };

export function SelectField({
  value,
  onChange,
  options,
  disabled,
  placeholder,
  id,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly OptionLike[];
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
