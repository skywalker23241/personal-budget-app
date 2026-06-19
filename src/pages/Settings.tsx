/**
 * 设置页面：偏好设置 + 数据管理（导出/导入 JSON、导出 CSV、清空、载入示例）。
 */
import { useRef, useState } from 'react';
import type { AppData } from '@/types';
import { useStore } from '@/store/useStore';
import { todayStr } from '@/lib/format';
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { Card, SectionTitle, Button, Input } from '@/components/ui';
import { Field, SelectField } from '@/components/forms/fields';
import { ThemeSegmented } from '@/components/ThemeToggle';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import {
  IconDownload,
  IconUpload,
  IconTrash,
  IconReceipt,
  IconSettings,
} from '@/components/Icons';

const CURRENCIES = [
  { code: 'CNY', label: '人民币 ¥ (CNY)' },
  { code: 'USD', label: '美元 $ (USD)' },
  { code: 'EUR', label: '欧元 € (EUR)' },
  { code: 'GBP', label: '英镑 £ (GBP)' },
  { code: 'JPY', label: '日元 ¥ (JPY)' },
  { code: 'HKD', label: '港币 HK$ (HKD)' },
];

/** 触发浏览器下载 */
function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** CSV 字段转义 */
function csvCell(v: string | number): string {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const exportData = useStore((s) => s.exportData);
  const replaceAll = useStore((s) => s.replaceAll);
  const clearAll = useStore((s) => s.clearAll);
  const loadSampleData = useStore((s) => s.loadSampleData);
  const transactions = useStore((s) => s.transactions);
  const confirm = useConfirm();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function handleExportJSON() {
    const data = exportData();
    download(
      `预算记账备份_${todayStr()}.json`,
      JSON.stringify(data, null, 2),
      'application/json'
    );
    toast.success('已导出 JSON 备份');
  }

  function handleExportCSV() {
    if (transactions.length === 0) {
      toast.info('暂无记账记录可导出');
      return;
    }
    const header = [
      '日期',
      '类型',
      '金额',
      '分类',
      '支付方式',
      '备注',
      '计入预算',
      '固定收支',
    ];
    const rows = [...transactions]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((t) =>
        [
          t.date,
          TRANSACTION_TYPE_LABELS[t.type],
          t.amount,
          t.category,
          t.paymentMethod,
          t.note,
          t.countInBudget ? '是' : '否',
          t.isFixed ? '是' : '否',
        ]
          .map(csvCell)
          .join(',')
      );
    // 加 BOM 以便 Excel 正确识别 UTF-8
    const csv = '﻿' + [header.join(','), ...rows].join('\n');
    download(`记账记录_${todayStr()}.csv`, csv, 'text/csv;charset=utf-8');
    toast.success('已导出 CSV');
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许重复选择同一文件
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<AppData>;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray(parsed.transactions)
      ) {
        throw new Error('文件格式不正确');
      }
      const ok = await confirm({
        title: '导入数据',
        message:
          '导入将覆盖当前所有数据（交易、预算、贷款、收入、目标、设置）。建议先导出备份。确认导入？',
        danger: true,
        confirmText: '覆盖导入',
      });
      if (ok) {
        replaceAll({
          transactions: parsed.transactions ?? [],
          budgets: parsed.budgets ?? [],
          loans: parsed.loans ?? [],
          loanPayments: parsed.loanPayments ?? [],
          incomeSources: parsed.incomeSources ?? [],
          goals: parsed.goals ?? [],
          settings: parsed.settings ?? settings,
        });
        toast.success('数据导入成功');
      }
    } catch (err) {
      toast.error('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setImporting(false);
    }
  }

  async function handleClear() {
    const ok = await confirm({
      title: '清空所有数据',
      message:
        '将删除全部交易、预算、贷款、收入来源和目标（设置保留）。此操作不可撤销，建议先导出备份。确认清空？',
      danger: true,
      confirmText: '确认清空',
    });
    if (ok) {
      clearAll();
      toast.success('数据已清空');
    }
  }

  async function handleLoadSample() {
    const ok = await confirm({
      title: '载入示例数据',
      message: '将用示例数据替换当前全部数据。确认继续？',
      confirmText: '载入示例',
    });
    if (ok) {
      loadSampleData();
      toast.success('已载入示例数据');
    }
  }

  return (
    <>
      <PageHeader title="设置" subtitle="偏好设置与数据管理" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 偏好设置 */}
        <Card>
          <SectionTitle title="偏好设置" />
          <div className="space-y-4">
            <Field label="外观主题" hint="浅色 / 深色 / 跟随系统">
              <ThemeSegmented />
            </Field>

            <Field label="默认币种">
              <SelectField
                value={settings.currency}
                onChange={(v) => updateSettings({ currency: v })}
                options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
              />
            </Field>

            <Field
              label="月度储蓄率目标 (%)"
              hint="储蓄率 = (收入 - 支出) / 收入"
            >
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.savingsRateTarget}
                onChange={(e) =>
                  updateSettings({
                    savingsRateTarget: Math.max(0, Math.min(100, Number(e.target.value))),
                  })
                }
              />
            </Field>

            <Field label="预算预警阈值 (%)" hint="使用率达到该比例时提醒，默认 80%">
              <Input
                type="number"
                min="1"
                max="100"
                value={settings.budgetWarnThreshold}
                onChange={(e) =>
                  updateSettings({
                    budgetWarnThreshold: Math.max(1, Math.min(100, Number(e.target.value))),
                  })
                }
              />
            </Field>

            <Field label="大额支出提醒阈值" hint="单笔支出超过该金额视为大额">
              <Input
                type="number"
                min="0"
                value={settings.largeExpenseThreshold}
                onChange={(e) =>
                  updateSettings({
                    largeExpenseThreshold: Math.max(0, Number(e.target.value)),
                  })
                }
              />
            </Field>

            <Field label="每月记账周期起始日" hint="用于自定义月度周期起始（1-28）">
              <Input
                type="number"
                min="1"
                max="28"
                value={settings.monthStartDay}
                onChange={(e) =>
                  updateSettings({
                    monthStartDay: Math.max(1, Math.min(28, Number(e.target.value))),
                  })
                }
              />
            </Field>
          </div>
        </Card>

        {/* 数据管理 */}
        <div className="space-y-4">
          <Card>
            <SectionTitle title="数据备份" subtitle="所有数据仅保存在本地浏览器" />
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={handleExportJSON}>
                <IconDownload className="h-4 w-4" />
                导出全部数据（JSON 备份）
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleExportCSV}>
                <IconReceipt className="h-4 w-4" />
                导出记账记录（CSV）
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileRef.current?.click()}
                disabled={importing}
              >
                <IconUpload className="h-4 w-4" />
                {importing ? '导入中…' : '从 JSON 文件导入'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle title="其他操作" />
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={handleLoadSample}>
                <IconSettings className="h-4 w-4" />
                载入示例数据
              </Button>
              <Button variant="destructive" className="w-full justify-start" onClick={handleClear}>
                <IconTrash className="h-4 w-4" />
                清空所有数据
              </Button>
            </div>
          </Card>

          <Card>
            <p className="text-xs leading-relaxed text-muted-foreground">
              本应用为纯前端应用，不依赖任何后端服务，数据通过浏览器 localStorage
              持久化保存。清除浏览器缓存或更换设备/浏览器将导致数据丢失，请定期使用「导出
              JSON 备份」功能保存数据。
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
