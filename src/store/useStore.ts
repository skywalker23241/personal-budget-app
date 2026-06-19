/**
 * 全局状态管理（Zustand + persist 持久化到 localStorage）。
 * 包含所有实体的增删改查动作，以及贷款还款、复制预算等业务动作。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppData,
  AppSettings,
  Budget,
  FinancialGoal,
  IncomeSource,
  Loan,
  LoanPayment,
  Transaction,
} from '@/types';
import { STORAGE_KEY } from '@/lib/constants';
import { createSampleData } from '@/lib/sampleData';
import { uid, todayStr, prevMonth } from '@/lib/format';
import { splitPayment } from '@/lib/calculations';

interface StoreState extends AppData {
  // ---- 交易 ----
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // ---- 预算 ----
  addBudget: (b: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  /** 把上个月的预算复制到目标月份（跳过已存在的分类） */
  copyBudgetFromPrevMonth: (month: string) => number;

  // ---- 贷款 ----
  addLoan: (l: Omit<Loan, 'id'>) => void;
  updateLoan: (id: string, patch: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  /** 记录一次还款：减少剩余本金、增加已还期数、生成还款记录并同步到记账 */
  recordLoanPayment: (loanId: string, opts?: { date?: string; amount?: number }) => void;

  // ---- 收入来源 ----
  addIncomeSource: (s: Omit<IncomeSource, 'id'>) => void;
  updateIncomeSource: (id: string, patch: Partial<IncomeSource>) => void;
  deleteIncomeSource: (id: string) => void;
  /** 记录一次收入到账：根据收入来源生成一条收入记账 */
  recordIncomeArrival: (sourceId: string, opts?: { date?: string }) => void;

  // ---- 目标 ----
  addGoal: (g: Omit<FinancialGoal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, patch: Partial<FinancialGoal>) => void;
  deleteGoal: (id: string) => void;
  /** 更新目标进度（增量，可正可负） */
  contributeToGoal: (id: string, delta: number) => void;

  // ---- 设置 & 数据管理 ----
  updateSettings: (patch: Partial<AppSettings>) => void;
  clearAll: () => void;
  loadSampleData: () => void;
  replaceAll: (data: AppData) => void;
  exportData: () => AppData;
}

const sample = createSampleData();

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...sample,

      // ---------------- 交易 ----------------
      addTransaction: (t) =>
        set((s) => ({
          transactions: [
            { ...t, id: uid('tx_'), createdAt: new Date().toISOString() },
            ...s.transactions,
          ],
        })),
      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
        })),
      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      // ---------------- 预算 ----------------
      addBudget: (b) =>
        set((s) => ({ budgets: [...s.budgets, { ...b, id: uid('bg_') }] })),
      updateBudget: (id, patch) =>
        set((s) => ({
          budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      deleteBudget: (id) =>
        set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),
      copyBudgetFromPrevMonth: (month) => {
        const prev = prevMonth(month);
        const state = get();
        const prevBudgets = state.budgets.filter((b) => b.month === prev);
        const existingCats = new Set(
          state.budgets.filter((b) => b.month === month).map((b) => b.category)
        );
        const toAdd = prevBudgets
          .filter((b) => !existingCats.has(b.category))
          .map((b) => ({ ...b, id: uid('bg_'), month }));
        if (toAdd.length > 0) {
          set((s) => ({ budgets: [...s.budgets, ...toAdd] }));
        }
        return toAdd.length;
      },

      // ---------------- 贷款 ----------------
      addLoan: (l) => set((s) => ({ loans: [...s.loans, { ...l, id: uid('loan_') }] })),
      updateLoan: (id, patch) =>
        set((s) => ({
          loans: s.loans.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      deleteLoan: (id) => set((s) => ({ loans: s.loans.filter((l) => l.id !== id) })),
      recordLoanPayment: (loanId, opts) => {
        const loan = get().loans.find((l) => l.id === loanId);
        if (!loan) return;
        const amount = opts?.amount ?? loan.monthlyPayment;
        const date = opts?.date ?? todayStr();
        const { principalPart, interestPart } = splitPayment(loan);
        const actualPrincipal = Math.min(principalPart, loan.remainingPrincipal);

        const payment: LoanPayment = {
          id: uid('lp_'),
          loanId,
          date,
          amount,
          principalPart: actualPrincipal,
          interestPart,
          note: `${loan.name} 第 ${loan.paidPeriods + 1} 期还款`,
        };

        const category = loan.type === '房贷' ? '房租/房贷' : '车贷/贷款还款';
        const syncedTx: Transaction = {
          id: uid('tx_'),
          date,
          type: 'loan_repayment',
          amount,
          category,
          paymentMethod: '银行卡',
          note: `${loan.name} 还款`,
          countInBudget: true,
          isFixed: true,
          loanId,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          loans: s.loans.map((l) =>
            l.id === loanId
              ? {
                  ...l,
                  remainingPrincipal: Math.max(0, l.remainingPrincipal - actualPrincipal),
                  paidPeriods: Math.min(l.termMonths, l.paidPeriods + 1),
                }
              : l
          ),
          loanPayments: [payment, ...s.loanPayments],
          transactions: [syncedTx, ...s.transactions],
        }));
      },

      // ---------------- 收入来源 ----------------
      addIncomeSource: (src) =>
        set((s) => ({
          incomeSources: [...s.incomeSources, { ...src, id: uid('inc_') }],
        })),
      updateIncomeSource: (id, patch) =>
        set((s) => ({
          incomeSources: s.incomeSources.map((i) =>
            i.id === id ? { ...i, ...patch } : i
          ),
        })),
      deleteIncomeSource: (id) =>
        set((s) => ({
          incomeSources: s.incomeSources.filter((i) => i.id !== id),
        })),
      recordIncomeArrival: (sourceId, opts) => {
        const src = get().incomeSources.find((i) => i.id === sourceId);
        if (!src) return;
        const date = opts?.date ?? todayStr();
        const incomeCategory =
          src.type === '工资'
            ? '工资'
            : src.type === '奖金'
              ? '奖金'
              : src.type === '副业'
                ? '副业收入'
                : src.type === '投资'
                  ? '投资收益'
                  : '其他收入';
        const newTx: Transaction = {
          id: uid('tx_'),
          date,
          type: 'income',
          amount: src.amount,
          category: incomeCategory,
          paymentMethod: '银行卡',
          note: `${src.name} 到账`,
          countInBudget: false,
          isFixed: src.isFixed,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ transactions: [newTx, ...s.transactions] }));
      },

      // ---------------- 目标 ----------------
      addGoal: (g) =>
        set((s) => ({
          goals: [
            ...s.goals,
            { ...g, id: uid('goal_'), createdAt: new Date().toISOString() },
          ],
        })),
      updateGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      contributeToGoal: (id, delta) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id
              ? { ...g, currentAmount: Math.max(0, g.currentAmount + delta) }
              : g
          ),
        })),

      // ---------------- 设置 & 数据管理 ----------------
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      clearAll: () =>
        set(() => ({
          transactions: [],
          budgets: [],
          loans: [],
          loanPayments: [],
          incomeSources: [],
          goals: [],
        })),
      loadSampleData: () => set(() => ({ ...createSampleData() })),
      replaceAll: (data) =>
        set(() => ({
          transactions: data.transactions ?? [],
          budgets: data.budgets ?? [],
          loans: data.loans ?? [],
          loanPayments: data.loanPayments ?? [],
          incomeSources: data.incomeSources ?? [],
          goals: data.goals ?? [],
          settings: data.settings ?? get().settings,
        })),
      exportData: () => {
        const s = get();
        return {
          transactions: s.transactions,
          budgets: s.budgets,
          loans: s.loans,
          loanPayments: s.loanPayments,
          incomeSources: s.incomeSources,
          goals: s.goals,
          settings: s.settings,
        };
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // 只持久化数据字段，动作函数不需要持久化（zustand 会自动忽略函数，这里显式声明更清晰）
      partialize: (s) => ({
        transactions: s.transactions,
        budgets: s.budgets,
        loans: s.loans,
        loanPayments: s.loanPayments,
        incomeSources: s.incomeSources,
        goals: s.goals,
        settings: s.settings,
      }),
    }
  )
);
