/**
 * 主题（浅色 / 深色 / 跟随系统）。在 <html> 上切换 .dark 类，状态存 localStorage。
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'dark' | 'light' | 'system';

type ThemeProviderState = {
  /** 用户选择：light / dark / system */
  theme: Theme;
  /** 实际生效：light / dark（system 已解析） */
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = 'budget-theme';

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system',
  );
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem(STORAGE_KEY) as Theme | null) === 'dark'
      ? 'dark'
      : (localStorage.getItem(STORAGE_KEY) as Theme | null) === 'light'
        ? 'light'
        : systemTheme(),
  );

  // 应用主题到 <html>
  useEffect(() => {
    const root = window.document.documentElement;
    const applied = theme === 'system' ? systemTheme() : theme;
    root.classList.toggle('dark', applied === 'dark');
    setResolvedTheme(applied);
  }, [theme]);

  // 跟随系统时，监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const applied = systemTheme();
      window.document.documentElement.classList.toggle('dark', applied === 'dark');
      setResolvedTheme(applied);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = (next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeProviderContext);
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用');
  return ctx;
}
