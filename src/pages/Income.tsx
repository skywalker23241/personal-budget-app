/**
 * 收入管理页面：管理收入来源、记录到账、收入趋势与来源占比。
 */
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { IncomeSource } from '@/types';
import { useStore } from '@/store/useStore';
import { transactionsInMonth, totalIncome } from '@/lib/calculations';
import {
  currentMonth,
  addMonths,
  formatCurrency,
  formatMonthLabel,
  monthOf,
} from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Card, StatCard, SectionTitle, Badge, EmptyState, Button } from '@/components/ui';
import { CategoryDonut, useChartTheme } from '@/components/charts';
import { Modal } from '@/components/Modal';
import { IncomeForm } from '@/components/forms/IncomeForm';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import {
  IconPlus,
  IconCoins,
  IconEdit,
  IconTrash,
  IconCheck,
  IconArrowUp,
} from '@/components/Icons';

export function Income() {
  const incomeSources = useStore((s) => s.incomeSources);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const deleteIncomeSource = useStore((s) => s.deleteIncomeSource);
  const recordIncomeArrival = useStore((s) => s.recordIncomeArrival);
  const cur = settings.currency;
  const confirm = useConfirm();
  const toast = useToast();
  const chart = useChartTheme();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IncomeSource | null>(null);

  const month = currentMonth();

  const stats = useMemo(() => {
    const monthIncomeTxs = transactionsInMonth(transactions, month).filter(
      (t) => t.type === 'income'
    );
    const total = monthIncomeTxs.reduce((s, t) => s + t.amount, 0);
    const fixed = monthIncomeTxs.filter((t) => t.isFixed).reduce((s, t) => s + t.amount, 0);
    const variable = total - fixed;

    // 收入来源占比（按本月收入分类）
    const byCat = new Map<string, number>();
    for (const t of monthIncomeTxs) {
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    }
    const pie = [...byCat.entries()].map(([name, value]) => ({ name, value }));

    // 近 6 个月收入趋势
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const mm = addMonths(month, -i);
      trend.push({
        label: formatMonthLabel(mm).replace(/^\d+年/, ''),
        income: totalIncome(transactions, mm),
      });
    }

    // 工资 / 收入到账记录（最近，本月优先）
    const arrivals = [...transactions]
      .filter((t) => t.type === 'income')
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);

    return { total, fixed, variable, pie, trend, arrivals };
  }, [transactions, month]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(s: IncomeSource) {
    setEditing(s);
    setShowForm(true);
  }
  async function handleDelete(s: IncomeSource) {
    const ok = await confirm({
      title: '删除收入来源',
      message: `确定删除「${s.name}」吗？`,
      danger: true,
      confirmText: '删除',
    });
    if (ok) {
      deleteIncomeSource(s.id);
      toast.success('收入来源已删除');
    }
  }
  async function handleArrival(s: IncomeSource) {
    const ok = await confirm({
      title: '记录收入到账',
      message: `将记录一笔「${s.name}」收入 ${formatCurrency(
        s.amount,
        cur
      )} 到今天，并同步到记账。确认？`,
      confirmText: '确认到账',
    });
    if (ok) {
      recordIncomeArrival(s.id);
      toast.success('收入已记录');
    }
  }

  return (
    <>
      <PageHeader
        title="收入管理"
        subtitle="管理收入来源，记录每月到账"
        actions={
          <Button onClick={openAdd}>
            <IconPlus className="h-4 w-4" />
            新增收入来源
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label={`${formatMonthLabel(month)}总收入`}
          value={formatCurrency(stats.total, cur)}
          tone="income"
          icon={<IconCoins className="h-4 w-4" />}
        />
        <StatCard label="固定收入" value={formatCurrency(stats.fixed, cur)} tone="brand" />
        <StatCard
          label="非固定收入"
          value={formatCurrency(stats.variable, cur)}
          tone="default"
        />
      </div>

      {/* 图表 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="近 6 个月收入趋势" />
          {stats.trend.some((t) => t.income > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={stats.trend}
                margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gIncomeTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chart.income} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chart.income} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: chart.axis }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chart.axis }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={chart.tooltip}
                  formatter={(v: number) => [formatCurrency(v, cur), '收入']}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke={chart.income}
                  strokeWidth={2}
                  fill="url(#gIncomeTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              暂无收入数据
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle title="本月收入来源占比" />
          <CategoryDonut data={stats.pie} currency={cur} />
        </Card>
      </div>

      {/* 收入来源 + 到账记录 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="收入来源" subtitle="点击「到账」快速记一笔收入" />
          {incomeSources.length === 0 ? (
            <EmptyState
              icon={<IconCoins className="h-6 w-6" />}
              title="还没有收入来源"
              description="添加你的工资、副业等收入来源"
              action={
                <Button onClick={openAdd}>
                  <IconPlus className="h-4 w-4" />
                  新增收入来源
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {incomeSources.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <Badge tone="brand">{s.type}</Badge>
                      {s.isFixed && <Badge tone="slate">固定</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      每月 {s.payday} 号 · {formatCurrency(s.amount, cur)}
                      {s.note ? ` · ${s.note}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 px-2.5 text-xs"
                    onClick={() => handleArrival(s)}
                  >
                    <IconCheck className="h-3.5 w-3.5" />
                    到账
                  </Button>
                  <button
                    onClick={() => openEdit(s)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="编辑"
                  >
                    <IconEdit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="删除"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle title="收入到账记录" subtitle="最近的收入流水" />
          {stats.arrivals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无收入记录</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.arrivals.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                    <IconArrowUp className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t.category}
                      {t.note && <span className="text-muted-foreground"> · {t.note}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.date}
                      {monthOf(t.date) === month && (
                        <span className="ml-1 text-success">本月</span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-success">
                    +{formatCurrency(t.amount, cur)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '编辑收入来源' : '新增收入来源'}
        maxWidth="max-w-md"
      >
        <IncomeForm initial={editing ?? undefined} onClose={() => setShowForm(false)} />
      </Modal>
    </>
  );
}
