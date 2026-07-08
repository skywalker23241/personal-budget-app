/**
 * 安全同步确认对话框：高风险操作（覆盖本机/云端数据）前，
 * 要求用户输入一次性确认码，防止误触导致数据被覆盖。
 * 用法：const { securityConfirm, securityConfirmDialog } = useSecurityConfirm();
 *       if (await securityConfirm({ title, message })) { ... }
 *       并在组件树中渲染 {securityConfirmDialog}。
 */
import { useRef, useState, type ReactNode } from 'react';
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from 'input-otp';
import { LockKeyhole } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui';

const CODE_LENGTH = 6;

export interface SecurityConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
}

function generateCode(): string {
  const digits = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(digits);
  return Array.from(digits, (d) => String(d % 10)).join('');
}

function CodeSlot(props: SlotProps) {
  return (
    <div
      className={cn(
        'relative flex h-11 w-9 items-center justify-center border-y border-r text-lg font-semibold transition-colors first:rounded-l-md first:border-l last:rounded-r-md',
        props.isActive
          ? 'border-foreground bg-background shadow-[0_0_0_3px_hsl(var(--foreground)/0.08)]'
          : 'border-border bg-muted/40',
      )}
    >
      <span className="text-foreground">{props.char ?? ''}</span>
      {props.hasFakeCaret && (
        <span className="absolute h-5 w-px animate-pulse rounded-full bg-foreground" />
      )}
    </div>
  );
}

export function useSecurityConfirm() {
  const [opts, setOpts] = useState<SecurityConfirmOptions | null>(null);
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const resolver = useRef<(v: boolean) => void>();

  const securityConfirm = (options: SecurityConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setCode(generateCode());
      setInput('');
      setOpts(options);
    });

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = undefined;
    setOpts(null);
  };

  const matched = input.length === CODE_LENGTH && input === code;

  const securityConfirmDialog: ReactNode = (
    <AlertDialog
      open={!!opts}
      onOpenChange={(o) => {
        if (!o) close(false);
      }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-muted-foreground" />
            {opts?.title ?? ''}
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {opts?.message}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">请输入以下确认码继续</p>
            <p className="mt-1 select-all font-mono text-2xl font-semibold tracking-[0.4em] text-foreground">
              {code}
            </p>
          </div>
          <OTPInput
            maxLength={CODE_LENGTH}
            value={input}
            onChange={setInput}
            pattern={REGEXP_ONLY_DIGITS}
            autoFocus
            containerClassName="flex justify-center"
            render={({ slots }) => (
              <div className="flex">
                {slots.map((slot, index) => (
                  <CodeSlot key={index} {...slot} />
                ))}
              </div>
            )}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matched}
            onClick={() => close(true)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {opts?.confirmText ?? '确认执行'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { securityConfirm, securityConfirmDialog };
}
