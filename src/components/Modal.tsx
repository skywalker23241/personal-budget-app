/**
 * 通用弹窗组件。基于 shadcn Dialog（Radix），保留原有 API：
 * <Modal open onClose title footer maxWidth>。Esc / 点击遮罩关闭、滚动锁定由 Radix 处理。
 */
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui';
import { cn } from '@/lib/utils';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className={cn(
          'max-h-[92vh] gap-0 overflow-hidden p-0',
          maxWidth,
        )}
      >
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(92vh-8rem)] overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <DialogFooter className="border-t bg-muted/40 px-5 py-3">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
