/**
 * 记账页面：新增 / 编辑 / 删除记录，支持筛选、排序、搜索。
 * 桌面端表格展示，移动端卡片展示。
 */
import { useMemo, useState } from 'react';
import type { Transaction, TransactionType } from '@/types';
import { useStore } from '@/store/useStore';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Card, Badge, EmptyState, Button, Input, Label } from '@/components/ui';
import { SelectField } from '@/components/forms/fields';
import { Modal } from '@/components/Modal';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconReceipt,
  IconArrowUp,
  IconArrowDown,
} from '@/components/Icons';

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date-desc', label: '日期（新→旧）' },
  { value: 'date-asc', label: '日期（旧→新）' },
  { value: 'amount-desc', label: '金额（高→低）' },
  { value: 'amount-asc', label: '金额（低→高）' },
];

function typeBadge(type: TransactionType) {
  const map: Record<TransactionType, 'emerald' | 'rose' | 'blue' | 'amber'> = {
    income: 'emerald',
    expense: 'rose',
    transfer: 'blue',
    loan_repayment: 'amber',
  };
  return <Badge tone={map[type]}>{TRANSACTION_TYPE_LABELS[type]}</Badge>;
}

export function Transactions() {
  const transactions = useStore((s) => s.transactions);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const settings = useStore((s) => s.settings);
  const cur = settings.currency;
  const confirm = useConfirm();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  // 筛选状态
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date-desc');

  const filtered = useMemo(() => {
    let list = transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !t.note.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'date-asc':
          return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        case 'date-desc':
        default:
          return a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt);
      }
    });
    return list;
  }, [transactions, typeFilter, categoryFilter, from, to, search, sort]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense' || t.type === 'loan_repayment') expense += t.amount;
    }
    return { income, expense, count: filtered.length };
  }, [filtered]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(t: Transaction) {
    setEditing(t);
    setShowForm(true);
  }
  async function handleDelete(t: Transaction) {
    const ok = await confirm({
      title: '删除记录',
      message: `确定删除「${t.category} ${formatCurrency(t.amount, cur)}」这条记录吗？此操作不可撤销。`,
      danger: true,
      confirmText: '删除',
    });
    if (ok) {
      deleteTransaction(t.id);
      toast.success('记录已删除');
    }
  }

  const hasFilter =
    typeFilter !== 'all' || categoryFilter !== 'all' || !!from || !!to || !!search;

  function resetFilters() {
    setTypeFilter('all');
    setCategoryFilter('all');
    setFrom('');
    setTo('');
    setSearch('');
  }

  return (
    <>
      <PageHeader
        title="记账"
        subtitle={`共 ${transactions.length} 条记录`}
        actions={
          <Button onClick={openAdd}>
            <IconPlus className="h-4 w-4" />
            记一笔
          </Button>
        }
      />

      {/* 筛选栏 */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Label className="mb-1.5 block">搜索备注 / 分类</Label>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="输入关键词"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">类型</Label>
            <SelectField
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as TransactionType | 'all')}
              options={[
                { value: 'all', label: '全部类型' },
                ...(Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]).map(
                  (t) => ({ value: t, label: TRANSACTION_TYPE_LABELS[t] }),
                ),
              ]}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">分类</Label>
            <SelectField
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[{ value: 'all', label: '全部分类' }, ...ALL_CATEGORIES]}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">起始日期</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">结束日期</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Label className="font-normal text-muted-foreground">排序</Label>
            <SelectField
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={SORT_OPTIONS}
              className="w-[150px]"
            />
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                清除筛选
              </Button>
            )}
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">
              收入{' '}
              <span className="font-semibold text-success">
                {formatCurrency(totals.income, cur)}
              </span>
            </span>
            <span className="text-muted-foreground">
              支出{' '}
              <span className="font-semibold text-destructive">
                {formatCurrency(totals.expense, cur)}
              </span>
            </span>
          </div>
        </div>
      </Card>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconReceipt className="h-6 w-6" />}
          title={hasFilter ? '没有符合条件的记录' : '还没有任何记录'}
          description={
            hasFilter ? '试试调整筛选条件' : '点击「记一笔」开始记录你的第一笔收支'
          }
          action={
            !hasFilter && (
              <Button onClick={openAdd}>
                <IconPlus className="h-4 w-4" />
                记一笔
              </Button>
            )
          }
        />
      ) : (
        <Card padding={false}>
          {/* 桌面表格 */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">日期</th>
                  <th className="px-5 py-3 font-medium">类型</th>
                  <th className="px-5 py-3 font-medium">分类</th>
                  <th className="px-5 py-3 font-medium">备注</th>
                  <th className="px-5 py-3 font-medium">支付方式</th>
                  <th className="px-5 py-3 text-right font-medium">金额</th>
                  <th className="px-5 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => {
                  const isIncome = t.type === 'income';
                  return (
                    <tr key={t.id} className="hover:bg-muted/60">
                      <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                        {t.date}
                      </td>
                      <td className="px-5 py-3">{typeBadge(t.type)}</td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-foreground">{t.category}</span>
                        <div className="mt-0.5 flex gap-1">
                          {t.isFixed && <Badge tone="slate">固定</Badge>}
                          {!t.countInBudget && t.type !== 'income' && (
                            <Badge tone="slate">不计预算</Badge>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[12rem] truncate px-5 py-3 text-muted-foreground">
                        {t.note || '—'}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{t.paymentMethod}</td>
                      <td
                        className={`whitespace-nowrap px-5 py-3 text-right font-semibold ${
                          isIncome ? 'text-success' : 'text-foreground'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(t.amount, cur)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <button
                          onClick={() => openEdit(t)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label="编辑"
                        >
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="删除"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 移动卡片 */}
          <ul className="divide-y divide-border sm:hidden">
            {filtered.map((t) => {
              const isIncome = t.type === 'income';
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isIncome ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {isIncome ? (
                      <IconArrowUp className="h-4 w-4" />
                    ) : (
                      <IconArrowDown className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1" onClick={() => openEdit(t)}>
                    <p className="truncate text-sm font-medium text-foreground">
                      {t.category}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.date} · {t.paymentMethod}
                      {t.note ? ` · ${t.note}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-sm font-semibold ${
                        isIncome ? 'text-success' : 'text-foreground'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(t.amount, cur)}
                    </span>
                    <div className="flex">
                      <button
                        onClick={() => openEdit(t)}
                        className="rounded-md p-1 text-muted-foreground"
                        aria-label="编辑"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="rounded-md p-1 text-muted-foreground"
                        aria-label="删除"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '编辑记录' : '新增记录'}
      >
        <TransactionForm
          initial={editing ?? undefined}
          onClose={() => setShowForm(false)}
        />
      </Modal>
    </>
  );
}
