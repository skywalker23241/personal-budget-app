/**
 * 应用根组件：全局 Provider + 路由。
 */
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { BudgetPage } from './pages/Budget';
import { Loans } from './pages/Loans';
import { Income } from './pages/Income';
import { Reports } from './pages/Reports';
import { Goals } from './pages/Goals';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route index element={<Landing />} />
            <Route path="app" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="loans" element={<Loans />} />
              <Route path="income" element={<Income />} />
              <Route path="reports" element={<Reports />} />
              <Route path="goals" element={<Goals />} />
              <Route path="settings" element={<Settings />} />
              {/* 兜底：未知路径回到仪表盘 */}
              <Route path="*" element={<Dashboard />} />
            </Route>
            <Route path="transactions" element={<Navigate to="/app/transactions" replace />} />
            <Route path="budget" element={<Navigate to="/app/budget" replace />} />
            <Route path="loans" element={<Navigate to="/app/loans" replace />} />
            <Route path="income" element={<Navigate to="/app/income" replace />} />
            <Route path="reports" element={<Navigate to="/app/reports" replace />} />
            <Route path="goals" element={<Navigate to="/app/goals" replace />} />
            <Route path="settings" element={<Navigate to="/app/settings" replace />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
