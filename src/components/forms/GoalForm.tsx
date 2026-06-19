/**
 * 财务目标表单：新增 / 编辑目标。
 */
import { useState } from 'react';
import type { FinancialGoal, GoalType } from '@/types';
import { GOAL_TYPES } from '@/lib/constants';
import { safeNumber, todayStr, addMonths } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '../Toast';
import { Button, Input } from '@/components/ui';
import { Field, SelectField } from './fields';

interface Props {
  initial?: FinancialGoal;
  onClose: () => void;
}

export function GoalForm({ initial, onClose }: Props) {
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const toast = useToast();
  const isEdit = !!initial;

  // 默认截止日期设为 1 年后月底
  const defaultDeadline = `${addMonths(todayStr().slice(0, 7), 12)}-28`;

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<GoalType>(initial?.type ?? '储蓄');
  const [targetAmount, setTargetAmount] = useState(
    initial ? String(initial.targetAmount) : ''
  );
  const [currentAmount, setCurrentAmount] = useState(
    initial ? String(initial.currentAmount) : '0'
  );
  const [deadline, setDeadline] = useState(initial?.deadline ?? defaultDeadline);
  const [monthlyPlan, setMonthlyPlan] = useState(
    initial ? String(initial.monthlyPlan) : ''
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = '请输入目标名称';
    if (safeNumber(targetAmount) <= 0) e.targetAmount = '目标金额必须大于 0';
    if (safeNumber(currentAmount) < 0) e.currentAmount = '当前金额不能为负';
    if (!deadline) e.deadline = '请选择截止日期';
    if (safeNumber(monthlyPlan) < 0) e.monthlyPlan = '计划投入不能为负';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const payload = {
      name: name.trim(),
      type,
      targetAmount: safeNumber(targetAmount),
      currentAmount: safeNumber(currentAmount),
      deadline,
      monthlyPlan: safeNumber(monthlyPlan),
      note: note.trim(),
    };
    if (isEdit && initial) {
      updateGoal(initial.id, payload);
      toast.success('目标已更新');
    } else {
      addGoal(payload);
      toast.success('目标已添加');
    }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="目标名称" required error={errors.name}>
          <Input
            placeholder="如：应急储备金"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="目标类型" required>
          <SelectField
            value={type}
            onChange={(v) => setType(v as GoalType)}
            options={GOAL_TYPES}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="目标金额" required error={errors.targetAmount}>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
        </Field>
        <Field label="当前已存金额" error={errors.currentAmount}>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="截止日期" required error={errors.deadline}>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>
        <Field label="每月计划投入" error={errors.monthlyPlan}>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={monthlyPlan}
            onChange={(e) => setMonthlyPlan(e.target.value)}
          />
        </Field>
      </div>

      <Field label="备注">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="可选"
          maxLength={100}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit">{isEdit ? '保存修改' : '添加目标'}</Button>
      </div>
    </form>
  );
}
