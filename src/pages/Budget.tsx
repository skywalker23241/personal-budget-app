/**
 * 预算管理页面：按月设置分类预算，展示使用进度、超支高亮，支持复制上月预算。
 */
import { useMemo, useState } from 'react';
import type { Budget, BudgetWithUsage } from '@/types';
import { useStore } from '@/store/useStore';
import { budgetsWithUsage, budgetSummary } from '@/lib/calculations';
import { currentMonth, formatCurrency, formatPercent, prevMonth, formatMonthLabel } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { AppSummaryCard } from '@/components/AppSummaryCard';
import { MonthPicker } from '@/components/MonthPicker';
import { StatCard, Card, ProgressBar, Badge, EmptyState, Button } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { BudgetForm } from '@/components/forms/BudgetForm';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import { IconPlus, IconWallet, IconEdit, IconTrash, IconDownload } from '@/components/Icons';

const STATUS_META = {
  normal: { tone: 'emerald' as const, label: '正常', bar: 'emerald' as const },
  warning: { tone: 'amber' as const, label: '接近超支', bar: 'amber' as const },
  exceeded: { tone: 'rose' as const, label: '已超支', bar: 'rose' as const },
};

export function BudgetPage() {
  const [month, setMonth] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [showAllMobileBudgets, setShowAllMobileBudgets] = useState(false);

  const budgets = useStore((s) => s.budgets);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const deleteBudget = useStore((s) => s.deleteBudget);
  const copyBudgetFromPrevMonth = useStore((s) => s.copyBudgetFromPrevMonth);
  const cur = settings.currency;
  const warnRate = settings.budgetWarnThreshold / 100;
  const confirm = useConfirm();
  const toast = useToast();

  const list = useMemo(
    () => budgetsWithUsage(budgets, transactions, month, warnRate),
    [budgets, transactions, month, warnRate]
  );
  const summary = useMemo(
    () => budgetSummary(budgets, transactions, month, warnRate),
    [budgets, transactions, month, warnRate]
  );
  const sorted = useMemo(
    () => [...list].sort((a, b) => b.usageRate - a.usageRate),
    [list]
  );
  const existingCategories = list.map((b) => b.category);
  const riskiestBudget = sorted[0];
  const mobileBudgetHighlights = useMemo(() => {
    const risky = sorted.filter((b) => b.status !== 'normal');
    return risky.length > 0 ? risky : sorted.slice(0, 3);
  }, [sorted]);
  const mobileBudgetHighlightIds = new Set(mobileBudgetHighlights.map((b) => b.id));
  const hiddenMobileBudgetCount = Math.max(
    0,
    sorted.length - mobileBudgetHighlights.length,
  );
  const summaryAccent =
    summary.usageRate >= 1
      ? 'danger'
      : summary.usageRate >= warnRate
        ? 'warning'
        : summary.total > 0
          ? 'success'
          : 'default';

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(b: BudgetWithUsage) {
    setEditing(b);
    setShowForm(true);
  }
  async function handleDelete(b: BudgetWithUsage) {
    const ok = await confirm({
      title: '删除预算',
      message: `确定删除「${b.category}」的预算吗？`,
      danger: true,
      confirmText: '删除',
    });
    if (ok) {
      deleteBudget(b.id);
      toast.success('预算已删除');
    }
  }
  function handleCopy() {
    const n = copyBudgetFromPrevMonth(month);
    if (n > 0) toast.success(`已从 ${formatMonthLabel(prevMonth(month))} 复制 ${n} 项预算`);
    else toast.info('上月没有可复制的新预算项');
  }

  return (
    <>
      <PageHeader
        title="预算管理"
        subtitle="为每个分类设置月度预算，控制开销节奏"
        actions={
          <>
            <MonthPicker month={month} onChange={setMonth} />
            <Button variant="outline" onClick={handleCopy} title="复制上月预算到本月">
              <IconDownload className="h-4 w-4" />
              复制上月
            </Button>
            <Button onClick={openAdd}>
              <IconPlus className="h-4 w-4" />
              新增预算
            </Button>
          </>
        }
      />

      <AppSummaryCard
        eyebrow={formatMonthLabel(month)}
        title={
          summary.total === 0
            ? '本月预算'
            : summary.remaining >= 0
              ? '本月还可花'
              : '本月已超支'
        }
        value={
          summary.total === 0
            ? '未设置'
            : formatCurrency(Math.abs(summary.remaining), cur)
        }
        subtitle={
          summary.total === 0
            ? '先添加几个高频分类预算，后续每天打开就能看到消费节奏。'
            : riskiestBudget
              ? `${riskiestBudget.category} 使用率最高，当前为 ${formatPercent(
                  riskiestBudget.usageRate,
                )}。`
              : '本月预算节奏稳定。'
        }
        accent={summaryAccent}
        meta={[
          { label: '总预算', value: formatCurrency(summary.total, cur) },
          { label: '已使用', value: formatCurrency(summary.used, cur) },
          { label: '使用率', value: formatPercent(summary.usageRate) },
        ]}
      />

      {/* 总览 */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="本月总预算"
          value={formatCurrency(summary.total, cur)}
          icon={<IconWallet className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="本月已使用"
          value={formatCurrency(summary.used, cur)}
          tone="expense"
        />
        <StatCard
          label="本月剩余"
          value={formatCurrency(summary.remaining, cur)}
          tone={summary.remaining >= 0 ? 'income' : 'expense'}
        />
        <StatCard
          label="预算使用率"
          value={formatPercent(summary.usageRate)}
          tone={
            summary.usageRate >= 1
              ? 'expense'
              : summary.usageRate >= warnRate
                ? 'warning'
                : 'default'
          }
        />
      </div>

      {/* 总进度 */}
      {summary.total > 0 && (
        <Card className="mt-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">总预算执行进度</span>
            <span className="text-muted-foreground">
              {formatCurrency(summary.used, cur)} / {formatCurrency(summary.total, cur)}
            </span>
          </div>
          <ProgressBar
            value={summary.usageRate}
            tone={
              summary.usageRate >= 1
                ? 'rose'
                : summary.usageRate >= warnRate
                  ? 'amber'
                  : 'emerald'
            }
          />
        </Card>
      )}

      {/* 预算列表 */}
      <div className="mt-4">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<IconWallet className="h-6 w-6" />}
            title={`${formatMonthLabel(month)} 还没有预算`}
            description="新增分类预算，或一键复制上月预算开始管理"
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy}>
                  复制上月
                </Button>
                <Button onClick={openAdd}>
                  <IconPlus className="h-4 w-4" />
                  新增预算
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {sorted.map((b) => {
              const meta = STATUS_META[b.status];
              return (
                <Card
                  key={b.id}
                  className={cn(
                    b.status === 'exceeded' && 'ring-1 ring-destructive/30',
                    !showAllMobileBudgets &&
                      !mobileBudgetHighlightIds.has(b.id) &&
                      'hidden md:block',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{b.category}</span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        已用 {formatCurrency(b.used, cur)} / 预算{' '}
                        {formatCurrency(b.amount, cur)}
                      </p>
                    </div>
                    <div className="flex">
                      <button
                        onClick={() => openEdit(b)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="编辑"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="删除"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={b.usageRate} tone={meta.bar} />
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span
                        className={
                          b.status === 'exceeded' ? 'text-destructive' : 'text-muted-foreground'
                        }
                      >
                        {formatPercent(b.usageRate)}
                      </span>
                      <span
                        className={
                          b.remaining < 0
                            ? 'font-medium text-destructive'
                            : 'text-muted-foreground'
                        }
                      >
                        {b.remaining >= 0
                          ? `剩余 ${formatCurrency(b.remaining, cur)}`
                          : `超支 ${formatCurrency(-b.remaining, cur)}`}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        {sorted.length > 0 && hiddenMobileBudgetCount > 0 && (
          <Button
            variant="outline"
            className="mt-3 w-full md:hidden"
            onClick={() => setShowAllMobileBudgets((value) => !value)}
          >
            {showAllMobileBudgets
              ? '收起普通分类'
              : `展开其余 ${hiddenMobileBudgetCount} 个分类`}
          </Button>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '编辑预算' : '新增预算'}
        maxWidth="max-w-md"
      >
        <BudgetForm
          initial={editing ?? undefined}
          month={month}
          existingCategories={existingCategories}
          onClose={() => setShowForm(false)}
        />
      </Modal>
    </>
  );
}
