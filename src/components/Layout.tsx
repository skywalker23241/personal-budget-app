/**
 * 应用布局：桌面端固定侧边栏，移动端抽屉式导航。
 */
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  IconDashboard,
  IconReceipt,
  IconWallet,
  IconBank,
  IconCoins,
  IconChart,
  IconTarget,
  IconSettings,
  IconMenu,
  IconClose,
  IconPlus,
} from './Icons';
import { ThemeToggle } from './ThemeToggle';
import { QuickTransactionModal } from './QuickTransactionModal';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { to: string; label: string; icon: (p: any) => ReactNode }[] = [
  { to: '/app', label: '仪表盘', icon: IconDashboard },
  { to: '/app/transactions', label: '记账', icon: IconReceipt },
  { to: '/app/budget', label: '预算', icon: IconWallet },
  { to: '/app/loans', label: '贷款', icon: IconBank },
  { to: '/app/income', label: '收入', icon: IconCoins },
  { to: '/app/reports', label: '报表', icon: IconChart },
  { to: '/app/goals', label: '目标', icon: IconTarget },
  { to: '/app/settings', label: '设置', icon: IconSettings },
];

const MOBILE_NAV_ITEMS: { to: string; label: string; icon: (p: any) => ReactNode }[] = [
  { to: '/app', label: '首页', icon: IconDashboard },
  { to: '/app/transactions', label: '账单', icon: IconReceipt },
  { to: '/app/budget', label: '预算', icon: IconWallet },
  { to: '/app/settings', label: '设置', icon: IconSettings },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/app'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'app-press flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <img
        src="/logo.svg"
        alt=""
        className="h-9 w-9 shrink-0 rounded-xl shadow-sm"
        aria-hidden="true"
      />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-foreground">个人预算</p>
        <p className="text-xs text-muted-foreground">记账助手</p>
      </div>
    </div>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* 桌面侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card lg:flex">
        <Brand />
        <NavItems />
        <div className="mt-auto flex items-center justify-between px-5 py-4">
          <span className="text-xs text-muted-foreground">数据保存在本地浏览器</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* 移动端顶栏 */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <img
            src="/logo.svg"
            alt=""
            className="h-8 w-8 shrink-0 rounded-lg shadow-sm"
            aria-hidden="true"
          />
          <span className="text-sm font-semibold text-foreground">个人预算记账助手</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(true)}
            className="app-press rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="打开菜单"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm app-enter"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-xl app-enter">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setMobileOpen(false)}
                className="app-press mr-3 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="关闭菜单"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <NavItems onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {MOBILE_NAV_ITEMS.slice(0, 2).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              className={({ isActive }) =>
                cn(
                  'app-press flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium',
                  isActive
                    ? 'text-foreground [&_svg]:-translate-y-0.5 [&_svg]:scale-110'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5 transition-transform duration-200" />
              <span>{label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="app-press -mt-6 flex flex-col items-center gap-1 text-[11px] font-medium text-foreground"
            aria-label="快速记账"
          >
            <span className="app-soft-pulse flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg ring-4 ring-background">
              <IconPlus className="h-6 w-6" />
            </span>
            <span>记账</span>
          </button>

          {MOBILE_NAV_ITEMS.slice(2).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'app-press flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium',
                  isActive
                    ? 'text-foreground [&_svg]:-translate-y-0.5 [&_svg]:scale-110'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5 transition-transform duration-200" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="pb-24 lg:pb-0 lg:pl-60">
        <div
          key={location.pathname}
          className="app-page-enter mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
        >
          <Outlet />
        </div>
      </main>

      <QuickTransactionModal open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );
}
