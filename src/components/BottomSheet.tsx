import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { cn } from '@/lib/utils';

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className={cn(
          'bottom-0 left-0 top-auto max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-t-lg border-x-0 border-b-0 p-0 shadow-2xl data-[state=open]:duration-300 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-h-[92vh] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border',
          className,
        )}
      >
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-muted-foreground/25" />
        </div>
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(88dvh-8.5rem)] overflow-y-auto px-5 py-4 sm:max-h-[calc(92vh-8rem)]">
          {children}
        </div>
        {footer && (
          <DialogFooter className="border-t bg-background px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-3">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
