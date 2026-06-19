/**
 * 应用布局：桌面端固定侧边栏，移动端抽屉式导航。
 */
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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
} from './Icons';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { to: string; label: string; icon: (p: any) => ReactNode }[] = [
  { to: '/', label: '仪表盘', icon: IconDashboard },
  { to: '/transactions', label: '记账', icon: IconReceipt },
  { to: '/budget', label: '预算', icon: IconWallet },
  { to: '/loans', label: '贷款', icon: IconBank },
  { to: '/income', label: '收入', icon: IconCoins },
  { to: '/reports', label: '报表', icon: IconChart },
  { to: '/goals', label: '目标', icon: IconTarget },
  { to: '/settings', label: '设置', icon: IconSettings },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
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
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <IconWallet className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-foreground">个人预算</p>
        <p className="text-xs text-muted-foreground">记账助手</p>
      </div>
    </div>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <IconWallet className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-foreground">个人预算记账助手</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setMobileOpen(false)}
                className="mr-3 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="关闭菜单"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <NavItems onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
