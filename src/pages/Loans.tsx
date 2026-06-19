/**
 * 贷款管理页面：贷款列表、还款进度、记录还款（同步记账）、预计还清日期。
 */
import { useMemo, useState } from 'react';
import type { Loan } from '@/types';
import { useStore } from '@/store/useStore';
import {
  totalRemainingPrincipal,
  totalMonthlyRepayment,
  loanToIncomeRatio,
  remainingPeriods,
  loanProgress,
  payoffMonth,
  totalIncome,
} from '@/lib/calculations';
import {
  currentMonth,
  formatCurrency,
  formatPercent,
  formatMonthLabel,
  daysUntilRepaymentDay,
  todayStr,
} from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Card, StatCard, ProgressBar, Badge, EmptyState, Button } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { LoanForm } from '@/components/forms/LoanForm';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import {
  IconPlus,
  IconBank,
  IconEdit,
  IconTrash,
  IconCheck,
  IconCalendar,
} from '@/components/Icons';

export function Loans() {
  const loans = useStore((s) => s.loans);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const deleteLoan = useStore((s) => s.deleteLoan);
  const recordLoanPayment = useStore((s) => s.recordLoanPayment);
  const cur = settings.currency;
  const confirm = useConfirm();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);

  const monthIncome = useMemo(
    () => totalIncome(transactions, currentMonth()),
    [transactions]
  );
  const totalRemaining = totalRemainingPrincipal(loans);
  const totalMonthly = totalMonthlyRepayment(loans);
  const ratio = loanToIncomeRatio(loans, monthIncome);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(l: Loan) {
    setEditing(l);
    setShowForm(true);
  }
  async function handleDelete(l: Loan) {
    const ok = await confirm({
      title: '删除贷款',
      message: `确定删除「${l.name}」吗？已生成的还款记账不会被删除。`,
      danger: true,
      confirmText: '删除',
    });
    if (ok) {
      deleteLoan(l.id);
      toast.success('贷款已删除');
    }
  }
  async function handleRepay(l: Loan) {
    if (l.remainingPrincipal <= 0) {
      toast.info('该贷款已结清');
      return;
    }
    const ok = await confirm({
      title: '记录一次还款',
      message: `将为「${l.name}」记录一期还款 ${formatCurrency(
        l.monthlyPayment,
        cur
      )}，自动减少剩余本金并同步到记账。确认继续？`,
      confirmText: '确认还款',
    });
    if (ok) {
      recordLoanPayment(l.id);
      toast.success('已记录还款并同步到记账');
    }
  }

  return (
    <>
      <PageHeader
        title="贷款管理"
        subtitle="追踪每笔贷款的还款进度与负担"
        actions={
          <Button onClick={openAdd}>
            <IconPlus className="h-4 w-4" />
            新增贷款
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="总剩余本金"
          value={formatCurrency(totalRemaining, cur)}
          icon={<IconBank className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="每月总还款"
          value={formatCurrency(totalMonthly, cur)}
          tone="expense"
        />
        <StatCard
          label="还款占收入比"
          value={monthIncome > 0 ? formatPercent(ratio) : '—'}
          tone={ratio > 0.4 ? 'expense' : ratio > 0 ? 'warning' : 'default'}
          hint={
            monthIncome > 0 ? '建议控制在 40% 以内' : '本月暂无收入记录，无法计算'
          }
        />
      </div>

      <div className="mt-4">
        {loans.length === 0 ? (
          <EmptyState
            icon={<IconBank className="h-6 w-6" />}
            title="还没有贷款记录"
            description="添加你的房贷、车贷或其他贷款，开始追踪还款进度"
            action={
              <Button onClick={openAdd}>
                <IconPlus className="h-4 w-4" />
                新增贷款
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {loans.map((l) => {
              const progress = loanProgress(l);
              const remPeriods = remainingPeriods(l);
              const days = daysUntilRepaymentDay(l.repaymentDay);
              const paidOff = l.remainingPrincipal <= 0 || remPeriods <= 0;
              const dueSoon = l.remindEnabled && !paidOff && days <= 3;
              return (
                <Card key={l.id} className={dueSoon ? 'ring-1 ring-warning/30' : ''}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{l.name}</span>
                        <Badge tone="blue">{l.type}</Badge>
                        {paidOff && <Badge tone="emerald">已结清</Badge>}
                      </div>
                      {!paidOff && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <IconCalendar className="h-3.5 w-3.5" />
                          每月 {l.repaymentDay} 号还款
                          {dueSoon && (
                            <span className="font-medium text-warning">
                              · {days === 0 ? '今天到期' : `还有 ${days} 天`}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex">
                      <button
                        onClick={() => openEdit(l)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="编辑"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(l)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="删除"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">剩余本金</p>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(l.remainingPrincipal, cur)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">月供</p>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(l.monthlyPayment, cur)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">年利率</p>
                      <p className="font-medium text-muted-foreground">{l.annualRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">预计还清</p>
                      <p className="font-medium text-muted-foreground">
                        {formatMonthLabel(payoffMonth(l))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        已还 {l.paidPeriods} / {l.termMonths} 期
                      </span>
                      <span>剩余 {remPeriods} 期</span>
                    </div>
                    <ProgressBar value={progress} tone={paidOff ? 'emerald' : 'brand'} />
                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {formatPercent(progress)} 已完成
                    </p>
                  </div>

                  {!paidOff && (
                    <Button
                      variant="outline"
                      className="mt-4 w-full"
                      onClick={() => handleRepay(l)}
                    >
                      <IconCheck className="h-4 w-4" />
                      记录本期还款
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '编辑贷款' : '新增贷款'}
      >
        <LoanForm initial={editing ?? undefined} onClose={() => setShowForm(false)} />
      </Modal>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        提示：当前时间 {todayStr()}，还款本金/利息按等额本息近似拆分计算。
      </p>
    </>
  );
}
