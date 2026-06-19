/**
 * 全局 Toast 提示系统。视觉采用 shadcn 令牌（中性面板 + 语义色图标）。
 * 用法：const toast = useToast(); toast.success('已保存');
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconCheckCircle, IconAlert, IconInfo, IconClose } from './Icons';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = ++idRef.current;
      setToasts((list) => [...list, { id, type, message }]);
      window.setTimeout(() => remove(id), 3000);
    },
    [remove],
  );

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  const icons: Record<ToastType, ReactNode> = {
    success: <IconCheckCircle className="h-5 w-5 text-success" />,
    error: <IconAlert className="h-5 w-5 text-destructive" />,
    info: <IconInfo className="h-5 w-5 text-info" />,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg animate-in fade-in-0 slide-in-from-top-2"
          >
            <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
              aria-label="关闭"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
