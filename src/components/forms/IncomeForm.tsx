/**
 * 收入来源表单：新增 / 编辑收入来源。
 */
import { useState } from 'react';
import type { IncomeSource, IncomeType } from '@/types';
import { INCOME_TYPES } from '@/lib/constants';
import { safeNumber, clamp } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '../Toast';
import { Button, Input } from '@/components/ui';
import { Field, Toggle, SelectField } from './fields';

interface Props {
  initial?: IncomeSource;
  onClose: () => void;
}

export function IncomeForm({ initial, onClose }: Props) {
  const addIncomeSource = useStore((s) => s.addIncomeSource);
  const updateIncomeSource = useStore((s) => s.updateIncomeSource);
  const toast = useToast();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<IncomeType>(initial?.type ?? '工资');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [isFixed, setIsFixed] = useState(initial?.isFixed ?? true);
  const [payday, setPayday] = useState(initial ? String(initial.payday) : '10');
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = '请输入收入名称';
    if (safeNumber(amount) <= 0) e.amount = '金额必须大于 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const payload = {
      name: name.trim(),
      type,
      amount: safeNumber(amount),
      isFixed,
      payday: clamp(Math.round(safeNumber(payday)), 1, 31),
      note: note.trim(),
    };
    if (isEdit && initial) {
      updateIncomeSource(initial.id, payload);
      toast.success('收入来源已更新');
    } else {
      addIncomeSource(payload);
      toast.success('收入来源已添加');
    }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="收入名称" required error={errors.name}>
          <Input
            placeholder="如：主职工资"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="收入类型" required>
          <SelectField
            value={type}
            onChange={(v) => setType(v as IncomeType)}
            options={INCOME_TYPES}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="金额" required error={errors.amount}>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="到账日（每月几号）">
          <Input
            type="number"
            min="1"
            max="31"
            value={payday}
            onChange={(e) => setPayday(e.target.value)}
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

      <Toggle checked={isFixed} onChange={setIsFixed} label="固定收入" />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit">{isEdit ? '保存修改' : '添加收入'}</Button>
      </div>
    </form>
  );
}
