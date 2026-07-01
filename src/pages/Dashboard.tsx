/**
 * 首页仪表盘：核心财务数据、图表、最近记录、提醒、健康评分。
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import {
  totalIncome,
  totalExpense,
  savingsRate as calcSavingsRate,
  expenseByCategory,
  budgetSummary,
  totalRemainingPrincipal,
  loanToIncomeRatio,
  findLargeExpenses,
  budgetsWithUsage,
  healthScore,
  transactionsInMonth,
} from '@/lib/calculations';
import { generateReminders } from '@/lib/reminders';
import {
  formatCurrency,
  formatPercent,
  currentMonth,
  lastNDays,
  monthOf,
  todayStr,
} from '@/lib/format';
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { MonthPicker } from '@/components/MonthPicker';
import { StatCard, Card, SectionTitle, Badge, Button, ProgressBar } from '@/components/ui';
import { CategoryDonut, IncomeExpenseTrend } from '@/components/charts';
import { ReminderList } from '@/components/ReminderList';
import { QuickTransactionModal } from '@/components/QuickTransactionModal';
import { MobileCollapsibleSection } from '@/components/MobileCollapsibleSection';
import { cn } from '@/lib/utils';
import {
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconWallet,
  IconPiggy,
  IconBank,
  IconChart,
  IconHeart,
} from '@/components/Icons';

/** 健康评分环形图 */
function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const color =
    score >= 85 ? '#10b981' : score >= 70 ? '#6366f1' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" className="stroke-muted" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">满分 100</span>
      </div>
    </div>
  );
}

function daysRemainingInMonth(month: string): number {
  const [year, monthIndex] = month.split('-').map(Number);
  const today = new Date();
  const isCurrent =
    today.getFullYear() === year && today.getMonth() + 1 === monthIndex;
  const totalDays = new Date(year, monthIndex, 0).getDate();
  if (!isCurrent) return totalDays;
  return Math.max(1, totalDays - today.getDate() + 1);
}

export function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [showAdd, setShowAdd] = useState(false);

  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const loans = useStore((s) => s.loans);
  const goals = useStore((s) => s.goals);
  const settings = useStore((s) => s.settings);

  const cur = settings.currency;
  const warnRate = settings.budgetWarnThreshold / 100;

  const data = useMemo(() => {
    const income = totalIncome(transactions, month);
    const expense = totalExpense(transactions, month);
    const balance = income - expense;
    const rate = calcSavingsRate(transactions, month);
    const bSummary = budgetSummary(budgets, transactions, month, warnRate);
    const bList = budgetsWithUsage(budgets, transactions, month, warnRate);
    const overBudget = bList.filter((b) => b.status === 'exceeded');
    const budgetWatch = bList
      .filter((b) => b.status !== 'normal')
      .sort((a, b) => b.usageRate - a.usageRate)
      .slice(0, 3);
    const dailyAvailable =
      bSummary.total > 0 ? Math.max(0, bSummary.remaining) / daysRemainingInMonth(month) : 0;
    const loanRemaining = totalRemainingPrincipal(loans);
    const monthRepayment = transactionsInMonth(transactions, month)
      .filter((t) => t.type === 'loan_repayment')
      .reduce((s, t) => s + t.amount, 0);
    const loanRatio = loanToIncomeRatio(loans, income);
    const large = findLargeExpenses(transactions, month, settings.largeExpenseThreshold);

    const pieData = expenseByCategory(transactions, month).map((e) => ({
      name: e.category,
      value: e.amount,
    }));

    // 最近 7 天趋势
    const days = lastNDays(7);
    const trend = days.map((d) => {
      const dayTxs = transactions.filter((t) => t.date === d);
      return {
        label: d.slice(5),
        income: dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: dayTxs
          .filter((t) => t.type === 'expense' || t.type === 'loan_repayment')
          .reduce((s, t) => s + t.amount, 0),
      };
    });

    const recent = [...transactions]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)))
      .slice(0, 10);

    const health = healthScore({
      income,
      expense,
      savingsRateValue: rate,
      savingsTarget: settings.savingsRateTarget / 100,
      overBudgetCount: overBudget.length,
      loanRatio,
      largeExpenseCount: large.length,
    });

    const reminders = generateReminders({
      transactions,
      budgets,
      loans,
      goals,
      settings,
      month,
    });

    return {
      income,
      expense,
      balance,
      rate,
      bSummary,
      budgetWatch,
      dailyAvailable,
      loanRemaining,
      monthRepayment,
      pieData,
      trend,
      recent,
      health,
      budgetReminders: reminders.filter((r) => r.category === 'budget'),
      loanReminders: reminders.filter((r) => r.category === 'loan'),
    };
  }, [transactions, budgets, loans, goals, settings, month, warnRate]);

  const isCurrentMonth = month === monthOf(todayStr());

  return (
    <>
      <PageHeader
        title="仪表盘"
        subtitle="一眼掌握你的财务状况"
        actions={
          <>
            <MonthPicker month={month} onChange={setMonth} />
            <Button onClick={() => setShowAdd(true)}>
              <IconPlus className="h-4 w-4" />
              记一笔
            </Button>
          </>
        }
      />

      <Card className="mb-4 overflow-hidden bg-foreground text-background">
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div>
            <p className="text-sm text-background/65">
              {isCurrentMonth ? '本月还可支配' : `${month} 预算回看`}
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
              <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {formatCurrency(Math.max(0, data.bSummary.remaining), cur)}
              </p>
              <p className="pb-1 text-sm text-background/70">
                {data.bSummary.total > 0
                  ? `日均可花 ${formatCurrency(data.dailyAvailable, cur)}`
                  : '还没有设置本月预算'}
              </p>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-background/70">
              {data.bSummary.total <= 0
                ? '先给常用分类设置预算，首页就能给出每日可花额度和风险提醒。'
                : data.bSummary.remaining < 0
                  ? '本月预算已经超支，建议先暂停非必要消费，并复盘超支分类。'
                  : data.budgetWatch.length > 0
                    ? `${data.budgetWatch[0].category} 已接近预算上限，今天记账时可以优先关注这类支出。`
                    : '预算执行平稳，可以按当前节奏继续消费。'}
            </p>
          </div>

          <div className="rounded-md border border-white/10 bg-white/8 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-background/70">预算使用率</span>
              <span className="font-semibold text-background">
                {formatPercent(data.bSummary.usageRate)}
              </span>
            </div>
            <ProgressBar
              value={data.bSummary.usageRate}
              tone={
                data.bSummary.usageRate >= 1
                  ? 'rose'
                  : data.bSummary.usageRate >= warnRate
                    ? 'amber'
                    : 'emerald'
              }
              className="bg-white/15"
            />
            <div className="mt-4 space-y-2">
              {data.budgetWatch.length > 0 ? (
                data.budgetWatch.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-background/70">{item.category}</span>
                    <span className="font-medium text-background">
                      {formatPercent(item.usageRate)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-background/65">暂无超支或预警分类</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 md:hidden">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">本月收入</p>
          <p className="mt-1 text-xl font-semibold text-success">
            {formatCurrency(data.income, cur)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">本月支出</p>
          <p className="mt-1 text-xl font-semibold text-destructive">
            {formatCurrency(data.expense, cur)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">本月结余</p>
          <p
            className={cn(
              'mt-1 text-xl font-semibold',
              data.balance >= 0 ? 'text-foreground' : 'text-destructive',
            )}
          >
            {formatCurrency(data.balance, cur)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">储蓄率</p>
          <p
            className={cn(
              'mt-1 text-xl font-semibold',
              data.rate >= settings.savingsRateTarget / 100
                ? 'text-success'
                : 'text-warning',
            )}
          >
            {formatPercent(data.rate)}
          </p>
        </Card>
      </div>

      {/* 核心数据卡片 */}
      <div className="hidden grid-cols-2 gap-3 sm:gap-4 md:grid lg:grid-cols-4">
        <StatCard
          label="本月总收入"
          value={formatCurrency(data.income, cur)}
          tone="income"
          icon={<IconArrowUp className="h-4 w-4" />}
        />
        <StatCard
          label="本月总支出"
          value={formatCurrency(data.expense, cur)}
          tone="expense"
          icon={<IconArrowDown className="h-4 w-4" />}
        />
        <StatCard
          label="本月结余"
          value={formatCurrency(data.balance, cur)}
          tone={data.balance >= 0 ? 'brand' : 'expense'}
          hint={data.balance >= 0 ? '收支为正' : '支出超过收入'}
          icon={<IconWallet className="h-4 w-4" />}
        />
        <StatCard
          label="储蓄率"
          value={formatPercent(data.rate)}
          tone={data.rate >= settings.savingsRateTarget / 100 ? 'income' : 'warning'}
          hint={`目标 ${settings.savingsRateTarget}%`}
          icon={<IconPiggy className="h-4 w-4" />}
        />
        <StatCard
          label="本月预算剩余"
          value={formatCurrency(data.bSummary.remaining, cur)}
          tone={data.bSummary.remaining >= 0 ? 'default' : 'expense'}
          hint={`总预算 ${formatCurrency(data.bSummary.total, cur)}`}
          icon={<IconWallet className="h-4 w-4" />}
        />
        <StatCard
          label="预算使用率"
          value={formatPercent(data.bSummary.usageRate)}
          tone={data.bSummary.usageRate >= 1 ? 'expense' : data.bSummary.usageRate >= warnRate ? 'warning' : 'default'}
          icon={<IconChart className="h-4 w-4" />}
        />
        <StatCard
          label="贷款待还总额"
          value={formatCurrency(data.loanRemaining, cur)}
          tone="default"
          icon={<IconBank className="h-4 w-4" />}
        />
        <StatCard
          label="本月还款金额"
          value={formatCurrency(data.monthRepayment, cur)}
          tone="default"
          icon={<IconBank className="h-4 w-4" />}
        />
      </div>

      {/* 最近记录 */}
      <Card className="mt-4">
        <SectionTitle
          title="最近记录"
          subtitle={isCurrentMonth ? '最新收支' : '最新收支（不限月份）'}
        />
        {data.recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            还没有记录，点击右上角「记一笔」开始吧
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.recent.map((t, index) => {
              const isIncome = t.type === 'income';
              return (
                <li
                  key={t.id}
                  className={cn(
                    'flex items-center gap-3 py-2.5',
                    index >= 5 && 'hidden md:flex',
                  )}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isIncome ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {isIncome ? (
                      <IconArrowUp className="h-4 w-4" />
                    ) : (
                      <IconArrowDown className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t.category}
                      {t.note && <span className="text-muted-foreground"> · {t.note}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.date} · {TRANSACTION_TYPE_LABELS[t.type]} · {t.paymentMethod}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      isIncome ? 'text-success' : 'text-foreground'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(t.amount, cur)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {data.recent.length > 5 && (
          <Button variant="outline" className="mt-3 w-full md:hidden" asChild>
            <Link to="/transactions">查看更多账单</Link>
          </Button>
        )}
      </Card>

      {/* 图表区 */}
      <MobileCollapsibleSection
        className="mt-4"
        title="统计详情"
        subtitle="趋势、分类和完整数据"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <SectionTitle title="最近 7 天收支趋势" />
            <IncomeExpenseTrend data={data.trend} currency={cur} />
          </Card>
          <Card>
            <SectionTitle title="本月支出分类" />
            <CategoryDonut data={data.pieData} currency={cur} />
          </Card>
        </div>
      </MobileCollapsibleSection>

      {/* 健康评分 + 提醒 */}
      <MobileCollapsibleSection
        className="mt-4"
        title="财务提醒"
        subtitle={`健康评分 ${data.health.score}，预算/还款提醒按需查看`}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <SectionTitle title="财务健康评分" />
            <div className="flex items-center gap-4">
              <ScoreRing score={data.health.score} />
              <div className="min-w-0 flex-1">
                <Badge
                  tone={
                    data.health.grade === '优秀'
                      ? 'emerald'
                      : data.health.grade === '良好'
                        ? 'brand'
                        : data.health.grade === '一般'
                          ? 'amber'
                          : 'rose'
                  }
                >
                  <IconHeart className="h-3 w-3" />
                  {data.health.grade}
                </Badge>
                <ul className="mt-3 space-y-1.5">
                  {data.health.factors.map((f) => (
                    <li key={f.label} className="flex items-center gap-2 text-xs">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          f.ok ? 'bg-success' : 'bg-destructive'
                        }`}
                      />
                      <span className="text-muted-foreground">{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle title="超预算提醒" />
            <ReminderList
              reminders={data.budgetReminders}
              emptyText="预算执行良好，暂无超支"
              max={4}
            />
          </Card>

          <Card>
            <SectionTitle title="贷款还款提醒" />
            <ReminderList
              reminders={data.loanReminders}
              emptyText="近期没有待还款提醒"
              max={4}
            />
          </Card>
        </div>
      </MobileCollapsibleSection>

      <QuickTransactionModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
