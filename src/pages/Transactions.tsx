/**
 * 记账页面：新增 / 编辑 / 删除记录，支持筛选、排序、搜索。
 * 桌面端表格展示，移动端卡片展示。
 */
import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
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
import { BottomSheet } from '@/components/BottomSheet';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { QuickTransactionModal } from '@/components/QuickTransactionModal';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconReceipt,
} from '@/components/Icons';

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date-desc', label: '日期（新→旧）' },
  { value: 'date-asc', label: '日期（旧→新）' },
  { value: 'amount-desc', label: '金额（高→低）' },
  { value: 'amount-asc', label: '金额（低→高）' },
];

type TransactionGroup = {
  date: string;
  income: number;
  expense: number;
  items: Transaction[];
};

function typeBadge(type: TransactionType) {
  const map: Record<TransactionType, 'emerald' | 'rose' | 'blue' | 'amber'> = {
    income: 'emerald',
    expense: 'rose',
    transfer: 'blue',
    loan_repayment: 'amber',
  };
  return <Badge tone={map[type]}>{TRANSACTION_TYPE_LABELS[type]}</Badge>;
}

function formatDateHeader(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function categoryMark(t: Transaction): string {
  if (t.type === 'income') return '收';
  if (t.type === 'loan_repayment') return '还';
  return t.category.slice(0, 1);
}

function groupTransactions(list: Transaction[]): TransactionGroup[] {
  const groups: TransactionGroup[] = [];
  const map = new Map<string, TransactionGroup>();

  for (const t of list) {
    let group = map.get(t.date);
    if (!group) {
      group = { date: t.date, income: 0, expense: 0, items: [] };
      map.set(t.date, group);
      groups.push(group);
    }
    group.items.push(t);
    if (t.type === 'income') group.income += t.amount;
    else if (t.type === 'expense' || t.type === 'loan_repayment') {
      group.expense += t.amount;
    }
  }

  return groups;
}

export function Transactions() {
  const transactions = useStore((s) => s.transactions);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const settings = useStore((s) => s.settings);
  const cur = settings.currency;
  const confirm = useConfirm();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(12);

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

  const grouped = useMemo(() => groupTransactions(filtered), [filtered]);
  const mobileGrouped = useMemo(
    () => groupTransactions(filtered.slice(0, mobileVisibleCount)),
    [filtered, mobileVisibleCount],
  );

  useEffect(() => {
    setMobileVisibleCount(12);
  }, [typeFilter, categoryFilter, from, to, search, sort]);

  function openAdd() {
    setEditing(null);
    setShowQuickAdd(true);
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
  const filterCount = [
    typeFilter !== 'all',
    categoryFilter !== 'all',
    !!from || !!to,
    !!search.trim(),
  ].filter(Boolean).length;

  function resetFilters() {
    setTypeFilter('all');
    setCategoryFilter('all');
    setFrom('');
    setTo('');
    setSearch('');
  }

  const filterFields = (
    <>
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
    </>
  );

  function renderLedger(groupsToRender: TransactionGroup[]) {
    return (
      <Card padding={false} className="overflow-hidden">
        <div className="divide-y divide-border">
          {groupsToRender.map((group) => (
            <section key={group.date}>
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/45 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateHeader(group.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">{group.date}</p>
                </div>
                <div className="flex gap-3 text-xs">
                  {group.income > 0 && (
                    <span className="text-success">
                      收 {formatCurrency(group.income, cur)}
                    </span>
                  )}
                  {group.expense > 0 && (
                    <span className="text-destructive">
                      支 {formatCurrency(group.expense, cur)}
                    </span>
                  )}
                </div>
              </div>

              <ul className="divide-y divide-border">
                {group.items.map((t) => {
                  const isIncome = t.type === 'income';
                  const isDebt = t.type === 'loan_repayment';
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35 sm:px-5"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${
                          isIncome
                            ? 'bg-success/10 text-success'
                            : isDebt
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {categoryMark(t)}
                      </span>

                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="app-press min-w-0 flex-1 rounded-md text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {t.category}
                          </span>
                          <span className="hidden sm:inline-flex">{typeBadge(t.type)}</span>
                          {t.isFixed && (
                            <span className="hidden sm:inline-flex">
                              <Badge tone="slate">固定</Badge>
                            </span>
                          )}
                          {!t.countInBudget && t.type !== 'income' && (
                            <span className="hidden sm:inline-flex">
                              <Badge tone="slate">不计预算</Badge>
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {t.paymentMethod}
                          {t.note ? ` · ${t.note}` : ''}
                        </p>
                      </button>

                      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span
                          className={`whitespace-nowrap text-sm font-semibold ${
                            isIncome ? 'text-success' : 'text-foreground'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(t.amount, cur)}
                        </span>
                        <div className="hidden sm:flex">
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
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Card>
    );
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
      <Card className="mb-4 hidden md:block">
        {filterFields}
      </Card>

      <div className="mb-4 space-y-3 md:hidden">
        <Button
          variant="outline"
          className="h-11 w-full justify-between"
          onClick={() => setShowFilters(true)}
        >
          <span className="flex items-center gap-2">
            <IconSearch className="h-4 w-4" />
            {hasFilter ? '查看搜索 / 筛选' : '搜索 / 筛选'}
          </span>
          <span className="flex items-center gap-2">
            {filterCount > 0 && <Badge tone="brand">{filterCount}</Badge>}
            <SlidersHorizontal className="h-4 w-4" />
          </span>
        </Button>

        <Card className="grid grid-cols-3 gap-2 p-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">记录</p>
            <p className="mt-1 text-base font-semibold text-foreground">{totals.count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">收入</p>
            <p className="mt-1 truncate text-base font-semibold text-success">
              {formatCurrency(totals.income, cur)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">支出</p>
            <p className="mt-1 truncate text-base font-semibold text-destructive">
              {formatCurrency(totals.expense, cur)}
            </p>
          </div>
        </Card>
      </div>

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
        <>
          <div className="hidden md:block">{renderLedger(grouped)}</div>
          <div className="md:hidden">
            {renderLedger(mobileGrouped)}
            {filtered.length > mobileVisibleCount && (
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => setMobileVisibleCount((count) => count + 12)}
              >
                查看更多（还剩 {filtered.length - mobileVisibleCount} 条）
              </Button>
            )}
          </div>
        </>
      )}

      <BottomSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="搜索与筛选"
        footer={
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" onClick={resetFilters}>
              清空条件
            </Button>
            <Button onClick={() => setShowFilters(false)}>确认筛选</Button>
          </div>
        }
      >
        {filterFields}
      </BottomSheet>

      <QuickTransactionModal
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
      />

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
