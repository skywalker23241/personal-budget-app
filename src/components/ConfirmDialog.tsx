/**
 * 全局二次确认对话框。基于 shadcn AlertDialog（Radix）。
 * 用法：const confirm = useConfirm(); if (await confirm({ title, message })) { ... }
 */
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
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

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm 必须在 ConfirmProvider 内使用');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>();

  const confirm: ConfirmFn = (options) =>
    new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpts(options);
    });

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = undefined;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={!!opts}
        onOpenChange={(o) => {
          if (!o) close(false);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{opts?.title ?? ''}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {opts?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>
              {opts?.cancelText ?? '取消'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => close(true)}
              className={
                opts?.danger
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
            >
              {opts?.confirmText ?? '确认'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
