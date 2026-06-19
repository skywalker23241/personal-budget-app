/**
 * 预算表单：为某分类设置 / 修改预算金额。
 */
import { useState } from 'react';
import type { Budget } from '@/types';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { safeNumber, formatMonthLabel } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '../Toast';
import { Button, Input } from '@/components/ui';
import { Field, SelectField } from './fields';

interface Props {
  initial?: Budget;
  month: string;
  /** 当月已存在预算的分类（新增时用于过滤，避免重复） */
  existingCategories: string[];
  onClose: () => void;
}

export function BudgetForm({ initial, month, existingCategories, onClose }: Props) {
  const addBudget = useStore((s) => s.addBudget);
  const updateBudget = useStore((s) => s.updateBudget);
  const toast = useToast();
  const isEdit = !!initial;

  const available = EXPENSE_CATEGORIES.filter(
    (c) => isEdit || !existingCategories.includes(c)
  );
  const [category, setCategory] = useState(
    initial?.category ?? available[0] ?? EXPENSE_CATEGORIES[0]
  );
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!category) e.category = '请选择分类';
    if (!amount.trim()) e.amount = '请输入预算金额';
    else if (safeNumber(amount) <= 0) e.amount = '预算金额必须大于 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    if (isEdit && initial) {
      updateBudget(initial.id, { category, amount: safeNumber(amount) });
      toast.success('预算已更新');
    } else {
      addBudget({ month, category, amount: safeNumber(amount) });
      toast.success('预算已添加');
    }
    onClose();
  }

  if (!isEdit && available.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {formatMonthLabel(month)} 的所有支出分类都已设置预算了。你可以直接在列表中修改已有预算。
        </p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            知道了
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        设置 <span className="font-medium text-foreground">{formatMonthLabel(month)}</span>{' '}
        的分类预算
      </p>
      <Field label="支出分类" required error={errors.category}>
        <SelectField
          value={category}
          onChange={setCategory}
          options={isEdit ? EXPENSE_CATEGORIES : available}
          disabled={isEdit}
        />
      </Field>
      <Field label="预算金额" required error={errors.amount}>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit">{isEdit ? '保存修改' : '添加预算'}</Button>
      </div>
    </form>
  );
}
