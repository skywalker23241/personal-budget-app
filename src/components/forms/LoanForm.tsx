/**
 * 贷款表单：新增 / 编辑贷款。
 */
import { useState } from 'react';
import type { Loan, LoanPlatform, LoanType } from '@/types';
import { LOAN_PLATFORMS, LOAN_TYPES } from '@/lib/constants';
import { safeNumber, todayStr, clamp } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '../Toast';
import { Button, Input } from '@/components/ui';
import { Field, Toggle, SelectField } from './fields';

interface Props {
  initial?: Loan;
  onClose: () => void;
}

const PLATFORM_DEFAULTS: Partial<
  Record<LoanPlatform, { name: string; type: LoanType; annualRate: string }>
> = {
  花呗: { name: '花呗', type: '消费贷', annualRate: '0' },
  京东白条: { name: '京东白条', type: '消费贷', annualRate: '0' },
  微信分付: { name: '微信分付', type: '消费贷', annualRate: '0' },
  美团月付: { name: '美团月付', type: '消费贷', annualRate: '0' },
  抖音月付: { name: '抖音月付', type: '消费贷', annualRate: '0' },
  信用卡: { name: '信用卡分期', type: '信用卡分期', annualRate: '0' },
};

const AUTO_FILLED_NAMES = new Set(
  Object.values(PLATFORM_DEFAULTS).map((item) => item.name),
);

export function LoanForm({ initial, onClose }: Props) {
  const addLoan = useStore((s) => s.addLoan);
  const updateLoan = useStore((s) => s.updateLoan);
  const toast = useToast();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [platform, setPlatform] = useState<LoanPlatform>(initial?.platform ?? '银行');
  const [type, setType] = useState<LoanType>(initial?.type ?? '房贷');
  const [principal, setPrincipal] = useState(initial ? String(initial.principal) : '');
  const [remaining, setRemaining] = useState(
    initial ? String(initial.remainingPrincipal) : ''
  );
  const [annualRate, setAnnualRate] = useState(
    initial ? String(initial.annualRate) : '4.9'
  );
  const [monthlyPayment, setMonthlyPayment] = useState(
    initial ? String(initial.monthlyPayment) : ''
  );
  const [repaymentDay, setRepaymentDay] = useState(
    initial ? String(initial.repaymentDay) : '10'
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayStr());
  const [termMonths, setTermMonths] = useState(
    initial ? String(initial.termMonths) : '360'
  );
  const [paidPeriods, setPaidPeriods] = useState(
    initial ? String(initial.paidPeriods) : '0'
  );
  const [remindEnabled, setRemindEnabled] = useState(initial?.remindEnabled ?? true);
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handlePlatformChange(nextPlatform: LoanPlatform) {
    const defaults = PLATFORM_DEFAULTS[nextPlatform];
    setPlatform(nextPlatform);
    if (!defaults) return;

    setType(defaults.type);
    if (!name.trim() || AUTO_FILLED_NAMES.has(name.trim())) {
      setName(defaults.name);
    }
    if (!isEdit && (!annualRate.trim() || annualRate === '4.9')) {
      setAnnualRate(defaults.annualRate);
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = '请输入贷款名称';
    if (safeNumber(principal) <= 0) e.principal = '本金必须大于 0';
    if (safeNumber(remaining) < 0) e.remaining = '剩余本金不能为负';
    if (safeNumber(annualRate) < 0) e.annualRate = '利率不能为负';
    if (safeNumber(monthlyPayment) < 0) e.monthlyPayment = '月供不能为负';
    if (!startDate) e.startDate = '请选择开始日期';
    if (safeNumber(termMonths) <= 0) e.termMonths = '期限必须大于 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const term = Math.round(safeNumber(termMonths));
    const payload = {
      name: name.trim(),
      type,
      platform,
      principal: safeNumber(principal),
      remainingPrincipal: safeNumber(remaining || principal),
      annualRate: safeNumber(annualRate),
      monthlyPayment: safeNumber(monthlyPayment),
      repaymentDay: clamp(Math.round(safeNumber(repaymentDay)), 1, 31),
      startDate,
      termMonths: term,
      paidPeriods: clamp(Math.round(safeNumber(paidPeriods)), 0, term),
      remindEnabled,
      note: note.trim(),
    };
    if (isEdit && initial) {
      updateLoan(initial.id, payload);
      toast.success('贷款已更新');
    } else {
      addLoan(payload);
      toast.success('贷款已添加');
    }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="贷款名称" required error={errors.name}>
          <Input
            placeholder="如：房贷 / 车贷"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="借贷平台" required>
          <SelectField
            value={platform}
            onChange={(v) => handlePlatformChange(v as LoanPlatform)}
            options={LOAN_PLATFORMS}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="贷款类型" required>
          <SelectField
            value={type}
            onChange={(v) => setType(v as LoanType)}
            options={LOAN_TYPES}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="初始本金" required error={errors.principal}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field
          label="当前剩余本金"
          error={errors.remaining}
          hint={!isEdit ? '留空则默认等于初始本金' : undefined}
        >
          <Input
            type="number"
            min="0"
            step="0.01"
            value={remaining}
            onChange={(e) => setRemaining(e.target.value)}
            placeholder="0.00"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="年利率 (%)" error={errors.annualRate}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
          />
        </Field>
        <Field label="月供金额" error={errors.monthlyPayment}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            placeholder="0.00"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="还款日（每月几号）">
          <Input
            type="number"
            min="1"
            max="31"
            value={repaymentDay}
            onChange={(e) => setRepaymentDay(e.target.value)}
          />
        </Field>
        <Field label="开始日期" required error={errors.startDate}>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="贷款期限（月）" required error={errors.termMonths}>
          <Input
            type="number"
            min="1"
            value={termMonths}
            onChange={(e) => setTermMonths(e.target.value)}
          />
        </Field>
        <Field label="已还期数">
          <Input
            type="number"
            min="0"
            value={paidPeriods}
            onChange={(e) => setPaidPeriods(e.target.value)}
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

      <Toggle checked={remindEnabled} onChange={setRemindEnabled} label="启用还款提醒" />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit">{isEdit ? '保存修改' : '添加贷款'}</Button>
      </div>
    </form>
  );
}
