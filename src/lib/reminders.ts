/**
 * 智能提醒生成逻辑。
 * 根据预算、贷款、消费、储蓄四类情况生成提醒卡片数据。
 */
import type {
  AppSettings,
  Budget,
  FinancialGoal,
  Loan,
  Reminder,
  Transaction,
} from '@/types';
import {
  budgetsWithUsage,
  budgetSummary,
  expenseByCategory,
  findLargeExpenses,
  loanToIncomeRatio,
  savingsRate,
  totalIncome,
  monthlyBalance,
  goalStatus,
  goalProgress,
} from './calculations';
import { daysUntilRepaymentDay, formatCurrency, monthOf, todayStr } from './format';

export function generateReminders(params: {
  transactions: Transaction[];
  budgets: Budget[];
  loans: Loan[];
  goals: FinancialGoal[];
  settings: AppSettings;
  month: string;
}): Reminder[] {
  const { transactions, budgets, loans, goals, settings, month } = params;
  const reminders: Reminder[] = [];
  const warnRate = settings.budgetWarnThreshold / 100;
  const cur = settings.currency;

  // ---------- 1. 预算提醒 ----------
  const budgetList = budgetsWithUsage(budgets, transactions, month, warnRate);
  for (const b of budgetList) {
    if (b.status === 'exceeded') {
      reminders.push({
        id: `budget-ex-${b.id}`,
        category: 'budget',
        level: 'danger',
        title: `「${b.category}」已超预算`,
        description: `已使用 ${formatCurrency(b.used, cur)} / ${formatCurrency(
          b.amount,
          cur
        )}，超出 ${formatCurrency(b.used - b.amount, cur)}。`,
      });
    } else if (b.status === 'warning') {
      reminders.push({
        id: `budget-warn-${b.id}`,
        category: 'budget',
        level: 'warning',
        title: `「${b.category}」预算接近上限`,
        description: `已使用 ${(b.usageRate * 100).toFixed(0)}%，剩余 ${formatCurrency(
          b.remaining,
          cur
        )}。`,
      });
    }
  }

  // 总预算使用过快：已过天数比例 < 使用率 - 15%
  const summary = budgetSummary(budgets, transactions, month, warnRate);
  if (summary.total > 0 && month === monthOf(todayStr())) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayRatio = now.getDate() / daysInMonth;
    if (summary.usageRate > dayRatio + 0.15 && summary.usageRate < 1) {
      reminders.push({
        id: 'budget-fast',
        category: 'budget',
        level: 'warning',
        title: '本月预算消耗偏快',
        description: `已用预算 ${(summary.usageRate * 100).toFixed(
          0
        )}%，但本月才过去 ${(dayRatio * 100).toFixed(0)}%，注意控制节奏。`,
      });
    }
  }

  // ---------- 2. 贷款提醒 ----------
  const income = totalIncome(transactions, month);
  for (const loan of loans) {
    if (!loan.remindEnabled || loan.remainingPrincipal <= 0) continue;
    const days = daysUntilRepaymentDay(loan.repaymentDay);
    if (days <= 3) {
      reminders.push({
        id: `loan-due-${loan.id}`,
        category: 'loan',
        level: days <= 1 ? 'danger' : 'warning',
        title: `「${loan.name}」即将还款`,
        description: `还款日为每月 ${loan.repaymentDay} 号，${
          days === 0 ? '就是今天' : `还有 ${days} 天`
        }，月供 ${formatCurrency(loan.monthlyPayment, cur)}。`,
      });
    }
    // 本月是否已记录该贷款还款
    const repaidThisMonth = transactions.some(
      (t) =>
        t.type === 'loan_repayment' &&
        t.loanId === loan.id &&
        monthOf(t.date) === month
    );
    if (!repaidThisMonth && month === monthOf(todayStr())) {
      reminders.push({
        id: `loan-unpaid-${loan.id}`,
        category: 'loan',
        level: 'info',
        title: `「${loan.name}」本月未记录还款`,
        description: `如已还款，记得在贷款页面点击「记录还款」。`,
      });
    }
  }

  // 贷款还款占收入过高
  const loanRatio = loanToIncomeRatio(loans, income);
  if (loanRatio > 0.4) {
    reminders.push({
      id: 'loan-ratio',
      category: 'loan',
      level: loanRatio > 0.5 ? 'danger' : 'warning',
      title: '贷款负担偏重',
      description: `每月还款占收入 ${(loanRatio * 100).toFixed(
        0
      )}%，建议控制在 40% 以内。`,
    });
  }

  // ---------- 3. 消费提醒 ----------
  const byCat = expenseByCategory(transactions, month);
  const totalExp = byCat.reduce((s, c) => s + c.amount, 0);
  const findCat = (name: string) => byCat.find((c) => c.category === name)?.amount ?? 0;

  // 餐饮过高（占总支出 > 30%）
  const dining = findCat('餐饮');
  if (totalExp > 0 && dining / totalExp > 0.3) {
    reminders.push({
      id: 'spend-dining',
      category: 'spending',
      level: 'warning',
      title: '餐饮支出偏高',
      description: `本月餐饮 ${formatCurrency(dining, cur)}，占总支出 ${(
        (dining / totalExp) *
        100
      ).toFixed(0)}%。`,
    });
  }
  // 娱乐过高（占总支出 > 20%）
  const fun = findCat('娱乐');
  if (totalExp > 0 && fun / totalExp > 0.2) {
    reminders.push({
      id: 'spend-fun',
      category: 'spending',
      level: 'info',
      title: '娱乐支出偏高',
      description: `本月娱乐 ${formatCurrency(fun, cur)}，占总支出 ${(
        (fun / totalExp) *
        100
      ).toFixed(0)}%。`,
    });
  }
  // 订阅服务过多（笔数 >= 5）
  const subCount = transactions.filter(
    (t) => monthOf(t.date) === month && t.category === '订阅服务'
  ).length;
  if (subCount >= 5) {
    reminders.push({
      id: 'spend-sub',
      category: 'spending',
      level: 'info',
      title: '订阅服务较多',
      description: `本月有 ${subCount} 笔订阅支出，检查是否有可取消的服务。`,
    });
  }
  // 异常大额支出
  const large = findLargeExpenses(transactions, month, settings.largeExpenseThreshold);
  for (const t of large.slice(0, 3)) {
    reminders.push({
      id: `spend-large-${t.id}`,
      category: 'spending',
      level: 'warning',
      title: '异常大额支出',
      description: `${t.date} 「${t.category}」${formatCurrency(t.amount, cur)}${
        t.note ? `（${t.note}）` : ''
      }。`,
    });
  }

  // ---------- 4. 储蓄提醒 ----------
  const rate = savingsRate(transactions, month);
  const target = settings.savingsRateTarget / 100;
  if (income > 0 && rate < target) {
    reminders.push({
      id: 'save-rate',
      category: 'savings',
      level: rate < 0 ? 'danger' : 'info',
      title: '储蓄率低于目标',
      description: `本月储蓄率 ${(rate * 100).toFixed(0)}%，目标 ${(
        target * 100
      ).toFixed(0)}%。`,
    });
  }
  const balance = monthlyBalance(transactions, month);
  if (balance < 0) {
    reminders.push({
      id: 'save-balance',
      category: 'savings',
      level: 'danger',
      title: '本月结余为负',
      description: `当前结余 ${formatCurrency(balance, cur)}，支出超过了收入。`,
    });
  }
  // 财务目标进度落后
  for (const g of goals) {
    if (goalProgress(g) >= 1) continue;
    if (goalStatus(g) === 'behind') {
      reminders.push({
        id: `save-goal-${g.id}`,
        category: 'savings',
        level: 'info',
        title: `目标「${g.name}」进度落后`,
        description: `当前完成 ${(goalProgress(g) * 100).toFixed(
          0
        )}%，建议增加投入以按时达成。`,
      });
    }
  }

  return reminders;
}
