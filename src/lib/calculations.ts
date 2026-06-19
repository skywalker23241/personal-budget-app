/**
 * 财务计算逻辑：收支统计、预算使用率、贷款、目标、健康评分、异常检测等。
 * 这些是纯函数，便于复用与测试。
 */
import type {
  Budget,
  BudgetStatus,
  BudgetWithUsage,
  FinancialGoal,
  Loan,
  Transaction,
} from '@/types';
import { monthOf, clamp, addMonths, daysBetween, todayStr } from './format';
import { LIFE_GROUPS } from './constants';

// ---------- 基础筛选 ----------

/** 取某月的交易 */
export function transactionsInMonth(txs: Transaction[], month: string): Transaction[] {
  return txs.filter((t) => monthOf(t.date) === month);
}

/** 某月总收入 */
export function totalIncome(txs: Transaction[], month: string): number {
  return transactionsInMonth(txs, month)
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
}

/**
 * 某月总支出（含支出与贷款还款；转账不计入）。
 */
export function totalExpense(txs: Transaction[], month: string): number {
  return transactionsInMonth(txs, month)
    .filter((t) => t.type === 'expense' || t.type === 'loan_repayment')
    .reduce((s, t) => s + t.amount, 0);
}

/** 某月结余 = 收入 - 支出 */
export function monthlyBalance(txs: Transaction[], month: string): number {
  return totalIncome(txs, month) - totalExpense(txs, month);
}

/**
 * 储蓄率 = (收入 - 支出) / 收入。收入为 0 时返回 0。
 * 返回 0~1 的小数（可为负）。
 */
export function savingsRate(txs: Transaction[], month: string): number {
  const income = totalIncome(txs, month);
  if (income <= 0) return 0;
  return (income - totalExpense(txs, month)) / income;
}

/**
 * 各分类支出汇总。
 * 仅统计支出 + 贷款还款。返回 { 分类: 金额 } 并按金额降序。
 */
export function expenseByCategory(
  txs: Transaction[],
  month: string
): { category: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const t of transactionsInMonth(txs, month)) {
    if (t.type !== 'expense' && t.type !== 'loan_repayment') continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** 某月某分类的实际支出（用于预算使用率，仅统计 countInBudget 的记录） */
export function spentInCategory(
  txs: Transaction[],
  month: string,
  category: string
): number {
  return transactionsInMonth(txs, month)
    .filter(
      (t) =>
        t.countInBudget &&
        (t.type === 'expense' || t.type === 'loan_repayment') &&
        t.category === category
    )
    .reduce((s, t) => s + t.amount, 0);
}

/** 固定 / 可变支出占比 */
export function fixedVsVariable(
  txs: Transaction[],
  month: string
): { fixed: number; variable: number } {
  let fixed = 0;
  let variable = 0;
  for (const t of transactionsInMonth(txs, month)) {
    if (t.type !== 'expense' && t.type !== 'loan_repayment') continue;
    if (t.isFixed) fixed += t.amount;
    else variable += t.amount;
  }
  return { fixed, variable };
}

// ---------- 预算 ----------

/** 判断预算状态 */
export function budgetStatus(usageRate: number, warnThreshold = 0.8): BudgetStatus {
  if (usageRate >= 1) return 'exceeded';
  if (usageRate >= warnThreshold) return 'warning';
  return 'normal';
}

/** 计算单条预算的使用情况 */
export function budgetWithUsage(
  budget: Budget,
  txs: Transaction[],
  warnThreshold = 0.8
): BudgetWithUsage {
  const used = spentInCategory(txs, budget.month, budget.category);
  const remaining = budget.amount - used;
  const usageRate = budget.amount > 0 ? used / budget.amount : used > 0 ? 1 : 0;
  return {
    ...budget,
    used,
    remaining,
    usageRate,
    status: budgetStatus(usageRate, warnThreshold),
  };
}

/** 某月所有预算的使用情况 */
export function budgetsWithUsage(
  budgets: Budget[],
  txs: Transaction[],
  month: string,
  warnThreshold = 0.8
): BudgetWithUsage[] {
  return budgets
    .filter((b) => b.month === month)
    .map((b) => budgetWithUsage(b, txs, warnThreshold));
}

/** 某月预算总览 */
export function budgetSummary(
  budgets: Budget[],
  txs: Transaction[],
  month: string,
  warnThreshold = 0.8
): { total: number; used: number; remaining: number; usageRate: number } {
  const list = budgetsWithUsage(budgets, txs, month, warnThreshold);
  const total = list.reduce((s, b) => s + b.amount, 0);
  const used = list.reduce((s, b) => s + b.used, 0);
  return {
    total,
    used,
    remaining: total - used,
    usageRate: total > 0 ? used / total : 0,
  };
}

// ---------- 贷款 ----------

/** 贷款总剩余本金 */
export function totalRemainingPrincipal(loans: Loan[]): number {
  return loans.reduce((s, l) => s + l.remainingPrincipal, 0);
}

/** 每月贷款总还款额 */
export function totalMonthlyRepayment(loans: Loan[]): number {
  return loans.reduce((s, l) => s + l.monthlyPayment, 0);
}

/** 贷款还款占收入比例（0~1+），收入为 0 返回 0 */
export function loanToIncomeRatio(loans: Loan[], monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 0;
  return totalMonthlyRepayment(loans) / monthlyIncome;
}

/** 剩余期数 */
export function remainingPeriods(loan: Loan): number {
  return Math.max(0, loan.termMonths - loan.paidPeriods);
}

/** 贷款还款进度 0~1 */
export function loanProgress(loan: Loan): number {
  if (loan.termMonths <= 0) return 0;
  return clamp(loan.paidPeriods / loan.termMonths, 0, 1);
}

/** 预计还清日期 YYYY-MM（按开始日期 + 期限推算） */
export function payoffMonth(loan: Loan): string {
  const startMonth = loan.startDate.slice(0, 7);
  return addMonths(startMonth, loan.termMonths);
}

/**
 * 估算一次月供中的本金 / 利息拆分（等额本息近似）。
 * 利息 = 剩余本金 * 月利率；本金 = 月供 - 利息。
 */
export function splitPayment(loan: Loan): { principalPart: number; interestPart: number } {
  const monthlyRate = loan.annualRate / 100 / 12;
  const interestPart = Math.min(
    loan.remainingPrincipal * monthlyRate,
    loan.monthlyPayment
  );
  const principalPart = Math.max(0, loan.monthlyPayment - interestPart);
  return {
    principalPart: Math.min(principalPart, loan.remainingPrincipal),
    interestPart,
  };
}

// ---------- 目标 ----------

/** 目标完成率 0~1 */
export function goalProgress(goal: FinancialGoal): number {
  if (goal.targetAmount <= 0) return 0;
  return clamp(goal.currentAmount / goal.targetAmount, 0, 1);
}

/** 距离目标还差多少钱 */
export function goalRemaining(goal: FinancialGoal): number {
  return Math.max(0, goal.targetAmount - goal.currentAmount);
}

/**
 * 按每月计划投入，预计还需多少个月完成。无计划投入返回 null。
 */
export function goalMonthsToComplete(goal: FinancialGoal): number | null {
  const remaining = goalRemaining(goal);
  if (remaining <= 0) return 0;
  if (goal.monthlyPlan <= 0) return null;
  return Math.ceil(remaining / goal.monthlyPlan);
}

/**
 * 按截止日期推算的本月建议投入金额。
 */
export function goalSuggestedMonthly(goal: FinancialGoal): number {
  const remaining = goalRemaining(goal);
  if (remaining <= 0) return 0;
  const today = todayStr();
  const days = daysBetween(today, goal.deadline);
  if (days <= 0) return remaining; // 已到期，建议一次性补齐
  const months = Math.max(1, Math.ceil(days / 30));
  return remaining / months;
}

/** 目标状态：完成 / 落后 / 进行中 */
export function goalStatus(goal: FinancialGoal): 'completed' | 'behind' | 'in_progress' {
  if (goalProgress(goal) >= 1) return 'completed';
  const today = todayStr();
  const totalDays = daysBetween(goal.createdAt.slice(0, 10), goal.deadline);
  const passedDays = daysBetween(goal.createdAt.slice(0, 10), today);
  if (totalDays <= 0) return 'in_progress';
  const expectedProgress = clamp(passedDays / totalDays, 0, 1);
  // 实际进度落后预期 10% 以上视为落后
  return goalProgress(goal) < expectedProgress - 0.1 ? 'behind' : 'in_progress';
}

// ---------- 衣食住行 ----------

/** 按衣食住行四个维度汇总支出 */
export function lifeGroupBreakdown(
  txs: Transaction[],
  month: string
): { key: string; label: string; amount: number; color: string }[] {
  const monthTxs = transactionsInMonth(txs, month).filter(
    (t) => t.type === 'expense' || t.type === 'loan_repayment'
  );
  return LIFE_GROUPS.map((g) => {
    const amount = monthTxs
      .filter(
        (t) =>
          g.categories.includes(t.category) ||
          g.keywords.some((k) => t.note.includes(k) || t.category.includes(k))
      )
      .reduce((s, t) => s + t.amount, 0);
    return { key: g.key, label: g.label, amount, color: g.color };
  });
}

// ---------- 异常检测 ----------

/**
 * 是否存在异常大额消费：单笔金额超过阈值，或超过当月平均单笔支出的 3 倍。
 * 仅检测「可变支出」——固定支出（如房租、月供）属于预期内开销，不视为异常。
 */
export function findLargeExpenses(
  txs: Transaction[],
  month: string,
  threshold: number
): Transaction[] {
  const expenses = transactionsInMonth(txs, month).filter(
    (t) => (t.type === 'expense' || t.type === 'loan_repayment') && !t.isFixed
  );
  if (expenses.length === 0) return [];
  const avg = expenses.reduce((s, t) => s + t.amount, 0) / expenses.length;
  const dynamicThreshold = Math.max(threshold, avg * 3);
  return expenses
    .filter((t) => t.amount >= dynamicThreshold)
    .sort((a, b) => b.amount - a.amount);
}

/**
 * 分类支出环比是否突增：本月对比上月增长超过 50% 且增量 > 200。
 */
export function categorySpikes(
  txs: Transaction[],
  month: string,
  prevMonthStr: string
): { category: string; current: number; previous: number; growth: number }[] {
  const cur = new Map(expenseByCategory(txs, month).map((e) => [e.category, e.amount]));
  const prev = new Map(
    expenseByCategory(txs, prevMonthStr).map((e) => [e.category, e.amount])
  );
  const spikes: {
    category: string;
    current: number;
    previous: number;
    growth: number;
  }[] = [];
  for (const [category, current] of cur) {
    const previous = prev.get(category) ?? 0;
    const delta = current - previous;
    const growth = previous > 0 ? delta / previous : current > 0 ? 1 : 0;
    if (delta > 200 && growth >= 0.5) {
      spikes.push({ category, current, previous, growth });
    }
  }
  return spikes.sort((a, b) => b.growth - a.growth);
}

// ---------- 财务健康评分 ----------

export interface HealthScore {
  score: number; // 0~100
  grade: string; // 优秀 / 良好 / 一般 / 较差
  factors: { label: string; ok: boolean; detail: string }[];
}

/**
 * 财务健康评分（满分 100），综合 5 个因素：
 * 1. 收入是否大于支出
 * 2. 储蓄率是否达标
 * 3. 是否有分类超预算
 * 4. 贷款还款是否占收入过高（>40% 扣分）
 * 5. 是否有异常大额支出
 */
export function healthScore(params: {
  income: number;
  expense: number;
  savingsRateValue: number;
  savingsTarget: number; // 0~1
  overBudgetCount: number;
  loanRatio: number; // 0~1
  largeExpenseCount: number;
}): HealthScore {
  const {
    income,
    expense,
    savingsRateValue,
    savingsTarget,
    overBudgetCount,
    loanRatio,
    largeExpenseCount,
  } = params;

  const factors: HealthScore['factors'] = [];
  let score = 0;

  // 1. 收支平衡（25 分）
  const balanced = income > expense;
  factors.push({
    label: '收支平衡',
    ok: balanced,
    detail: balanced ? '本月收入大于支出' : '本月入不敷出，需控制开销',
  });
  if (balanced) score += 25;
  else if (income > 0 && expense / income < 1.1) score += 10;

  // 2. 储蓄率达标（25 分）
  const savingOk = savingsRateValue >= savingsTarget;
  factors.push({
    label: '储蓄率达标',
    ok: savingOk,
    detail: savingOk
      ? `储蓄率 ${(savingsRateValue * 100).toFixed(0)}% 已达目标`
      : `储蓄率 ${(savingsRateValue * 100).toFixed(0)}% 低于目标 ${(savingsTarget * 100).toFixed(0)}%`,
  });
  if (savingOk) score += 25;
  else if (savingsRateValue >= savingsTarget * 0.6) score += 12;

  // 3. 预算未超支（20 分）
  const budgetOk = overBudgetCount === 0;
  factors.push({
    label: '预算未超支',
    ok: budgetOk,
    detail: budgetOk ? '所有分类预算正常' : `有 ${overBudgetCount} 个分类超预算`,
  });
  if (budgetOk) score += 20;
  else if (overBudgetCount <= 2) score += 8;

  // 4. 贷款负担合理（20 分）
  const loanOk = loanRatio <= 0.4;
  factors.push({
    label: '贷款负担合理',
    ok: loanOk,
    detail:
      loanRatio > 0
        ? `贷款还款占收入 ${(loanRatio * 100).toFixed(0)}%`
        : '当前无贷款负担',
  });
  if (loanOk) score += 20;
  else if (loanRatio <= 0.5) score += 10;

  // 5. 无异常大额支出（10 分）
  const noAnomaly = largeExpenseCount === 0;
  factors.push({
    label: '无异常大额支出',
    ok: noAnomaly,
    detail: noAnomaly ? '消费平稳' : `有 ${largeExpenseCount} 笔异常大额支出`,
  });
  if (noAnomaly) score += 10;

  score = clamp(Math.round(score), 0, 100);
  const grade =
    score >= 85 ? '优秀' : score >= 70 ? '良好' : score >= 50 ? '一般' : '较差';

  return { score, grade, factors };
}
