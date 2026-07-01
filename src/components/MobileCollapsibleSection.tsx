import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile;
}

export function MobileCollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  className,
  contentClassName,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();
  const inactive = isMobile && !open;
  const inertProps = inactive ? ({ inert: '' } as { inert: string }) : {};

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="app-press flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left shadow-sm active:bg-accent md:hidden"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        {...inertProps}
        aria-hidden={inactive}
        className={cn(
          'grid transition-[grid-template-rows,opacity] [transition-duration:350ms] ease-out md:grid-rows-[1fr] md:opacity-100',
          inactive && 'pointer-events-none md:pointer-events-auto',
          open ? 'mt-3 grid-rows-[1fr] opacity-100 md:mt-0' : 'grid-rows-[0fr] opacity-0 md:mt-0',
        )}
      >
        <div className={cn('min-h-0 overflow-hidden', open && 'app-enter', contentClassName)}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function InlineDisclosure({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const inertProps = !open ? ({ inert: '' } as { inert: string }) : {};

  return (
    <div className="rounded-lg border bg-background app-card-motion">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="app-press flex w-full items-center gap-3 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        {...inertProps}
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows,opacity] [transition-duration:350ms] ease-out',
          !open && 'pointer-events-none',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className={cn('min-h-0 overflow-hidden px-3 pb-3', open && 'app-enter')}>
          {children}
        </div>
      </div>
    </div>
  );
}
