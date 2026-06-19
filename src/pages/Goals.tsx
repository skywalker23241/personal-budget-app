/**
 * 财务目标页面：目标列表、完成进度、预计完成时间、建议投入、更新进度。
 */
import { useMemo, useState } from 'react';
import type { FinancialGoal } from '@/types';
import { useStore } from '@/store/useStore';
import {
  goalProgress,
  goalRemaining,
  goalMonthsToComplete,
  goalSuggestedMonthly,
  goalStatus,
} from '@/lib/calculations';
import { formatCurrency, formatPercent, safeNumber, addMonths, currentMonth, formatMonthLabel } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Card, StatCard, ProgressBar, Badge, EmptyState, Button, Input } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { GoalForm } from '@/components/forms/GoalForm';
import { Field } from '@/components/forms/fields';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import {
  IconPlus,
  IconTarget,
  IconEdit,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
} from '@/components/Icons';

const STATUS_META = {
  completed: { tone: 'emerald' as const, label: '已完成' },
  behind: { tone: 'rose' as const, label: '进度落后' },
  in_progress: { tone: 'brand' as const, label: '进行中' },
};

/** 更新进度弹窗 */
function ContributeModal({
  goal,
  onClose,
}: {
  goal: FinancialGoal;
  onClose: () => void;
}) {
  const contributeToGoal = useStore((s) => s.contributeToGoal);
  const settings = useStore((s) => s.settings);
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function apply(sign: 1 | -1) {
    const v = safeNumber(amount);
    if (v <= 0) {
      setError('请输入大于 0 的金额');
      return;
    }
    contributeToGoal(goal.id, sign * v);
    toast.success(sign > 0 ? '已增加进度' : '已减少进度');
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">当前已存</span>
          <span className="font-medium text-foreground">
            {formatCurrency(goal.currentAmount, settings.currency)}
          </span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-muted-foreground">目标金额</span>
          <span className="font-medium text-foreground">
            {formatCurrency(goal.targetAmount, settings.currency)}
          </span>
        </div>
      </div>
      <Field label="金额" required error={error}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="本次投入 / 支取金额"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => apply(-1)}>
          <IconArrowDown className="h-4 w-4" />
          减少
        </Button>
        <Button onClick={() => apply(1)}>
          <IconArrowUp className="h-4 w-4" />
          增加
        </Button>
      </div>
    </div>
  );
}

export function Goals() {
  const goals = useStore((s) => s.goals);
  const deleteGoal = useStore((s) => s.deleteGoal);
  const settings = useStore((s) => s.settings);
  const cur = settings.currency;
  const confirm = useConfirm();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FinancialGoal | null>(null);
  const [contributing, setContributing] = useState<FinancialGoal | null>(null);

  const summary = useMemo(() => {
    const target = goals.reduce((s, g) => s + g.targetAmount, 0);
    const saved = goals.reduce((s, g) => s + g.currentAmount, 0);
    const suggested = goals.reduce((s, g) => s + goalSuggestedMonthly(g), 0);
    return { target, saved, suggested, progress: target > 0 ? saved / target : 0 };
  }, [goals]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(g: FinancialGoal) {
    setEditing(g);
    setShowForm(true);
  }
  async function handleDelete(g: FinancialGoal) {
    const ok = await confirm({
      title: '删除目标',
      message: `确定删除目标「${g.name}」吗？`,
      danger: true,
      confirmText: '删除',
    });
    if (ok) {
      deleteGoal(g.id);
      toast.success('目标已删除');
    }
  }

  return (
    <>
      <PageHeader
        title="财务目标"
        subtitle="设定目标，追踪每一步进展"
        actions={
          <Button onClick={openAdd}>
            <IconPlus className="h-4 w-4" />
            新增目标
          </Button>
        }
      />

      {goals.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="目标总数"
            value={goals.length}
            icon={<IconTarget className="h-4 w-4" />}
            tone="brand"
          />
          <StatCard label="目标总额" value={formatCurrency(summary.target, cur)} />
          <StatCard
            label="已积累"
            value={formatCurrency(summary.saved, cur)}
            tone="income"
            hint={`总进度 ${formatPercent(summary.progress)}`}
          />
          <StatCard
            label="本月建议投入"
            value={formatCurrency(summary.suggested, cur)}
            tone="warning"
          />
        </div>
      )}

      <div className="mt-4">
        {goals.length === 0 ? (
          <EmptyState
            icon={<IconTarget className="h-6 w-6" />}
            title="还没有财务目标"
            description="设定一个储蓄、应急金或还贷目标，让攒钱更有方向"
            action={
              <Button onClick={openAdd}>
                <IconPlus className="h-4 w-4" />
                新增目标
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {goals.map((g) => {
              const progress = goalProgress(g);
              const remaining = goalRemaining(g);
              const months = goalMonthsToComplete(g);
              const suggested = goalSuggestedMonthly(g);
              const status = goalStatus(g);
              const meta = STATUS_META[status];
              const eta =
                months === 0
                  ? '已达成'
                  : months === null
                    ? '未设定月投入'
                    : `约 ${months} 个月（${formatMonthLabel(addMonths(currentMonth(), months))}）`;
              return (
                <Card key={g.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{g.name}</span>
                        <Badge tone="blue">{g.type}</Badge>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        截止 {g.deadline}
                        {g.note ? ` · ${g.note}` : ''}
                      </p>
                    </div>
                    <div className="flex">
                      <button
                        onClick={() => openEdit(g)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="编辑"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(g)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="删除"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-lg font-semibold text-foreground">
                        {formatCurrency(g.currentAmount, cur)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {formatCurrency(g.targetAmount, cur)}
                      </span>
                    </div>
                    <ProgressBar
                      value={progress}
                      tone={status === 'completed' ? 'emerald' : status === 'behind' ? 'rose' : 'brand'}
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {formatPercent(progress)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">还差</p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {formatCurrency(remaining, cur)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">预计完成</p>
                      <p className="mt-0.5 font-semibold text-foreground">{eta}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">建议月投</p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {formatCurrency(suggested, cur)}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => setContributing(g)}
                  >
                    更新进度
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '编辑目标' : '新增目标'}
      >
        <GoalForm initial={editing ?? undefined} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        open={!!contributing}
        onClose={() => setContributing(null)}
        title={`更新进度 · ${contributing?.name ?? ''}`}
        maxWidth="max-w-sm"
      >
        {contributing && (
          <ContributeModal
            goal={contributing}
            onClose={() => setContributing(null)}
          />
        )}
      </Modal>
    </>
  );
}
