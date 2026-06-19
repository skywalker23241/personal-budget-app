/**
 * 记账表单：新增 / 编辑交易记录。
 */
import { useState } from 'react';
import type { PaymentMethod, Transaction, TransactionType } from '@/types';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/constants';
import { todayStr, safeNumber } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '../Toast';
import { Button, Input } from '@/components/ui';
import { Field, SegmentedControl, Toggle, SelectField } from './fields';

interface Props {
  initial?: Transaction;
  /** 预设类型（如从某页面新增） */
  defaultType?: TransactionType;
  onClose: () => void;
}

export function TransactionForm({ initial, defaultType, onClose }: Props) {
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const toast = useToast();
  const isEdit = !!initial;

  const [type, setType] = useState<TransactionType>(
    initial?.type ?? defaultType ?? 'expense'
  );
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [category, setCategory] = useState(
    initial?.category ?? (type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[3])
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? '微信'
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [countInBudget, setCountInBudget] = useState(
    initial?.countInBudget ?? type !== 'income'
  );
  const [isFixed, setIsFixed] = useState(initial?.isFixed ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // 切换类型时，若当前分类不在新类型分类列表内，自动重置
  function handleTypeChange(t: TransactionType) {
    setType(t);
    const list = t === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!list.includes(category as never)) {
      setCategory(list[t === 'income' ? 0 : 3]);
    }
    if (t === 'income') setCountInBudget(false);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!date) e.date = '请选择日期';
    const amt = safeNumber(amount);
    if (!amount.trim()) e.amount = '请输入金额';
    else if (amt <= 0) e.amount = '金额必须大于 0';
    if (!category) e.category = '请选择分类';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const payload = {
      date,
      type,
      amount: safeNumber(amount),
      category,
      paymentMethod,
      note: note.trim(),
      countInBudget,
      isFixed,
      loanId: initial?.loanId,
    };
    if (isEdit && initial) {
      updateTransaction(initial.id, payload);
      toast.success('记录已更新');
    } else {
      addTransaction(payload);
      toast.success('记录已添加');
    }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="类型" required>
        <SegmentedControl
          value={type}
          onChange={handleTypeChange}
          options={(
            ['income', 'expense', 'transfer', 'loan_repayment'] as TransactionType[]
          ).map((t) => ({ value: t, label: TRANSACTION_TYPE_LABELS[t] }))}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="日期" required error={errors.date}>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="金额" required error={errors.amount}>
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="分类" required error={errors.category}>
          <SelectField
            value={category}
            onChange={setCategory}
            options={categories}
          />
        </Field>
        <Field label="支付方式">
          <SelectField
            value={paymentMethod}
            onChange={(v) => setPaymentMethod(v as PaymentMethod)}
            options={PAYMENT_METHODS}
          />
        </Field>
      </div>

      <Field label="备注">
        <Input
          type="text"
          placeholder="可选，如：和朋友聚餐"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Toggle checked={countInBudget} onChange={setCountInBudget} label="计入预算" />
        <Toggle checked={isFixed} onChange={setIsFixed} label="固定收支" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit">{isEdit ? '保存修改' : '添加记录'}</Button>
      </div>
    </form>
  );
}
