/**
 * 报表分析页面：月度收支汇总、分类分析、衣食住行、消费趋势、异常消费。
 */
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { useStore } from '@/store/useStore';
import {
  totalIncome,
  totalExpense,
  savingsRate,
  fixedVsVariable,
  expenseByCategory,
  categorySpikes,
  lifeGroupBreakdown,
  findLargeExpenses,
  transactionsInMonth,
} from '@/lib/calculations';
import { generateReminders } from '@/lib/reminders';
import {
  currentMonth,
  prevMonth,
  addMonths,
  formatCurrency,
  formatPercent,
  formatMonthLabel,
} from '@/lib/format';
import { CHART_COLORS } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { MonthPicker } from '@/components/MonthPicker';
import {
  Card,
  StatCard,
  SectionTitle,
  ProgressBar,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { CategoryBars, MonthlyTrendLine, CategoryDonut, useChartTheme } from '@/components/charts';
import { ReminderList } from '@/components/ReminderList';
import { IconChart, IconArrowUp, IconTrendingUp } from '@/components/Icons';

type Granularity = 'day' | 'week' | 'month';

export function Reports() {
  const [month, setMonth] = useState(currentMonth());
  const [gran, setGran] = useState<Granularity>('day');

  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const loans = useStore((s) => s.loans);
  const goals = useStore((s) => s.goals);
  const settings = useStore((s) => s.settings);
  const cur = settings.currency;
  const chart = useChartTheme();

  const r = useMemo(() => {
    const income = totalIncome(transactions, month);
    const expense = totalExpense(transactions, month);
    const balance = income - expense;
    const rate = savingsRate(transactions, month);
    const { fixed, variable } = fixedVsVariable(transactions, month);
    const fvTotal = fixed + variable;

    const byCat = expenseByCategory(transactions, month);
    const catTotal = byCat.reduce((s, c) => s + c.amount, 0);
    const maxCat = byCat[0];
    const spikes = categorySpikes(transactions, month, prevMonth(month));
    const fastest = spikes[0];

    const life = lifeGroupBreakdown(transactions, month);
    const lifeTotal = life.reduce((s, g) => s + g.amount, 0);

    // 月度趋势（近 6 个月）
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const mm = addMonths(month, -i);
      const inc = totalIncome(transactions, mm);
      const exp = totalExpense(transactions, mm);
      monthly.push({
        label: formatMonthLabel(mm).replace(/^\d+年/, ''),
        income: inc,
        expense: exp,
        balance: inc - exp,
      });
    }

    // 异常消费
    const large = findLargeExpenses(transactions, month, settings.largeExpenseThreshold);
    const reminders = generateReminders({
      transactions,
      budgets,
      loans,
      goals,
      settings,
      month,
    }).filter((x) => x.category === 'spending' || x.category === 'budget');

    return {
      income,
      expense,
      balance,
      rate,
      fixed,
      variable,
      fixedRatio: fvTotal > 0 ? fixed / fvTotal : 0,
      variableRatio: fvTotal > 0 ? variable / fvTotal : 0,
      byCat,
      catTotal,
      maxCat,
      fastest,
      life,
      lifeTotal,
      monthly,
      large,
      reminders,
    };
  }, [transactions, budgets, loans, goals, settings, month]);

  // 趋势图数据：按日 / 周 / 月
  const trendData = useMemo(() => {
    if (gran === 'month') {
      return r.monthly.map((m) => ({ label: m.label, value: m.expense }));
    }
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthTxs = transactionsInMonth(transactions, month).filter(
      (t) => t.type === 'expense' || t.type === 'loan_repayment'
    );
    if (gran === 'day') {
      const arr = Array.from({ length: daysInMonth }, (_, i) => ({
        label: String(i + 1),
        value: 0,
      }));
      for (const t of monthTxs) {
        const d = Number(t.date.slice(8, 10));
        if (d >= 1 && d <= daysInMonth) arr[d - 1].value += t.amount;
      }
      return arr;
    }
    // 周
    const weeks = [
      { label: '第1周', value: 0 },
      { label: '第2周', value: 0 },
      { label: '第3周', value: 0 },
      { label: '第4周', value: 0 },
      { label: '第5周', value: 0 },
    ];
    for (const t of monthTxs) {
      const d = Number(t.date.slice(8, 10));
      const w = Math.min(4, Math.floor((d - 1) / 7));
      weeks[w].value += t.amount;
    }
    return weeks.filter((_, i) => i < Math.ceil(daysInMonth / 7));
  }, [gran, month, transactions, r.monthly]);

  return (
    <>
      <PageHeader
        title="报表分析"
        subtitle="看清钱花在哪、变化趋势与异常"
        actions={<MonthPicker month={month} onChange={setMonth} />}
      />

      {/* 1. 月度收支汇总 */}
      <SectionTitle title={`${formatMonthLabel(month)} 收支汇总`} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="总收入" value={formatCurrency(r.income, cur)} tone="income" />
        <StatCard label="总支出" value={formatCurrency(r.expense, cur)} tone="expense" />
        <StatCard
          label="结余"
          value={formatCurrency(r.balance, cur)}
          tone={r.balance >= 0 ? 'brand' : 'expense'}
        />
        <StatCard
          label="储蓄率"
          value={formatPercent(r.rate)}
          tone={r.rate >= settings.savingsRateTarget / 100 ? 'income' : 'warning'}
        />
        <StatCard
          label="固定支出占比"
          value={formatPercent(r.fixedRatio)}
          hint={formatCurrency(r.fixed, cur)}
        />
        <StatCard
          label="可变支出占比"
          value={formatPercent(r.variableRatio)}
          hint={formatCurrency(r.variable, cur)}
        />
      </div>

      {/* 固定 vs 可变 进度 */}
      {r.fixed + r.variable > 0 && (
        <Card className="mt-4">
          <SectionTitle title="固定 / 可变支出结构" />
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>固定支出</span>
                <span>
                  {formatCurrency(r.fixed, cur)}（{formatPercent(r.fixedRatio)}）
                </span>
              </div>
              <ProgressBar value={r.fixedRatio} tone="brand" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>可变支出</span>
                <span>
                  {formatCurrency(r.variable, cur)}（{formatPercent(r.variableRatio)}）
                </span>
              </div>
              <ProgressBar value={r.variableRatio} tone="amber" />
            </div>
          </div>
        </Card>
      )}

      {/* 2. 分类支出分析 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="分类支出排行" />
          <CategoryBars
            data={r.byCat.slice(0, 10).map((c) => ({ name: c.category, value: c.amount }))}
            currency={cur}
          />
        </Card>
        <Card>
          <SectionTitle title="分类支出占比" />
          <CategoryDonut
            data={r.byCat.map((c) => ({ name: c.category, value: c.amount }))}
            currency={cur}
          />
        </Card>
      </div>

      {/* 最大支出 / 增长最快 */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <IconChart className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">最大支出分类</p>
              {r.maxCat ? (
                <p className="text-lg font-semibold text-foreground">
                  {r.maxCat.category}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {formatCurrency(r.maxCat.amount, cur)}（
                    {formatPercent(r.catTotal > 0 ? r.maxCat.amount / r.catTotal : 0)}）
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">本月暂无支出</p>
              )}
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <IconTrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">增长最快分类（环比上月）</p>
              {r.fastest ? (
                <p className="text-lg font-semibold text-foreground">
                  {r.fastest.category}
                  <span className="ml-2 text-sm font-normal text-warning">
                    +{formatPercent(r.fastest.growth)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">无明显增长</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 3. 衣食住行分析 */}
      <Card className="mt-4">
        <SectionTitle title="衣食住行分析" subtitle="生活四大维度的开销分布" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {r.life.map((g) => (
            <div
              key={g.key}
              className="rounded-xl border p-4 text-center"
            >
              <div
                className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ backgroundColor: g.color }}
              >
                {g.label}
              </div>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(g.amount, cur)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPercent(r.lifeTotal > 0 ? g.amount / r.lifeTotal : 0)}
              </p>
              <div className="mt-2">
                <ProgressBar
                  value={r.lifeTotal > 0 ? g.amount / r.lifeTotal : 0}
                  tone="slate"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 4. 消费趋势 */}
      <Card className="mt-4">
        <SectionTitle
          title="消费趋势"
          action={
            <Tabs value={gran} onValueChange={(v) => setGran(v as Granularity)}>
              <TabsList className="h-9">
                <TabsTrigger value="day">日</TabsTrigger>
                <TabsTrigger value="week">周</TabsTrigger>
                <TabsTrigger value="month">月</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
        {trendData.some((d) => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: chart.axis }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: chart.axis }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={chart.tooltip}
                cursor={{ fill: chart.cursor }}
                formatter={(v: number) => [formatCurrency(v, cur), '支出']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {trendData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            该时间范围暂无支出
          </div>
        )}
      </Card>

      {/* 月度收支趋势线 */}
      <Card className="mt-4">
        <SectionTitle title="月度收支趋势（近 6 个月）" />
        <MonthlyTrendLine data={r.monthly} currency={cur} />
      </Card>

      {/* 5. 异常消费提醒 */}
      <Card className="mt-4">
        <SectionTitle
          title="异常消费提醒"
          action={
            r.large.length > 0 ? (
              <Badge tone="rose">
                <IconArrowUp className="h-3 w-3" />
                {r.large.length} 笔大额
              </Badge>
            ) : undefined
          }
        />
        <ReminderList
          reminders={r.reminders}
          emptyText="本月消费平稳，未发现异常"
        />
      </Card>
    </>
  );
}
