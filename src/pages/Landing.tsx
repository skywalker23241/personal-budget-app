import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import NumberFlow from '@number-flow/react';
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from 'input-otp';
import { Liveline, type LivelinePoint } from 'liveline';
import { LevaPanel, useControls, useCreateStore } from 'leva';
import { Command } from 'cmdk';
import { Virtuoso } from 'react-virtuoso';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Toaster, toast } from 'sonner';
import {
  ArrowRight,
  BadgeCheck,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleDollarSign,
  Command as CommandIcon,
  Download,
  Gauge,
  GripVertical,
  LockKeyhole,
  PiggyBank,
  ReceiptText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

type BudgetCard = {
  id: string;
  label: string;
  amount: number;
  spent: number;
  tone: string;
};

type LedgerItem = {
  id: string;
  title: string;
  category: string;
  amount: number;
  method: string;
  time: string;
  type: 'income' | 'expense';
};

const cnyFormat = {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0,
} satisfies Intl.NumberFormatOptions;

const commandItems = [
  { label: '记一笔餐饮支出', detail: '自动进入快速记账' },
  { label: '查看本月预算', detail: '跳转到预算执行面板' },
  { label: '同步 WebDAV 备份', detail: '生成加密快照' },
  { label: '导出年度报表', detail: '下载 CSV 与图表摘要' },
  { label: '检查贷款提醒', detail: '筛出 7 天内到期还款' },
];

const featureCards = [
  {
    title: '本地优先的数据底座',
    copy: '默认保存在浏览器本地，需要时再启用 WebDAV 加密同步。',
    icon: ShieldCheck,
  },
  {
    title: '预算和账单同屏判断',
    copy: '把每日可花、分类超支、固定支出和贷款提醒放在同一条工作流里。',
    icon: Gauge,
  },
  {
    title: '大账单也保持轻快',
    copy: '上百上千条记录仍能快速滚动、搜索和筛选。',
    icon: ReceiptText,
  },
];

const initialBudgets: BudgetCard[] = [
  { id: 'food', label: '餐饮', amount: 2200, spent: 1460, tone: 'bg-emerald-500' },
  { id: 'rent', label: '房租/房贷', amount: 4500, spent: 4500, tone: 'bg-blue-500' },
  { id: 'traffic', label: '交通', amount: 700, spent: 320, tone: 'bg-amber-500' },
  { id: 'fun', label: '娱乐', amount: 500, spent: 380, tone: 'bg-rose-500' },
];

function useLiveBudgetSeries() {
  const seed = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return Array.from({ length: 42 }, (_, index) => {
      const value =
        6500 + Math.sin(index / 3) * 420 + Math.cos(index / 6) * 260 + index * 12;
      return {
        time: now - (42 - index) * 2,
        value: Math.round(value),
      };
    });
  }, []);

  const [points, setPoints] = useState<LivelinePoint[]>(seed);
  const [value, setValue] = useState(seed[seed.length - 1]?.value ?? 6500);

  useEffect(() => {
    let tick = seed.length;
    const id = window.setInterval(() => {
      setPoints((current) => {
        const last = current[current.length - 1]?.value ?? value;
        const next = Math.max(
          5200,
          Math.min(
            8600,
            last + Math.sin(tick / 2.7) * 120 + (Math.random() - 0.48) * 180,
          ),
        );
        const point = {
          time: Math.floor(Date.now() / 1000),
          value: Math.round(next),
        };
        tick += 1;
        setValue(point.value);
        return [...current.slice(-72), point];
      });
    }, 1300);

    return () => window.clearInterval(id);
  }, [seed.length, value]);

  return { points, value };
}

function AnimatedCurrency({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <NumberFlow
      className={className}
      value={value}
      locales="zh-CN"
      format={cnyFormat}
      willChange
    />
  );
}

function AnimatedPercent({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <NumberFlow
      className={className}
      value={value}
      locales="zh-CN"
      suffix="%"
      format={{ maximumFractionDigits: 0 }}
      willChange
    />
  );
}

function LandingHeader({ onCommandOpen }: { onCommandOpen: () => void }) {
  return (
    <header className="relative z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="个人预算记账助手">
          <img src="/logo.svg" alt="" className="h-9 w-9 rounded-xl shadow-sm" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">个人预算</p>
            <p className="text-xs text-muted-foreground">记账助手</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a className="transition-colors hover:text-foreground" href="#overview">
            总览
          </a>
          <a className="transition-colors hover:text-foreground" href="#workflow">
            工作流
          </a>
          <a className="transition-colors hover:text-foreground" href="#performance">
            性能
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCommandOpen} aria-label="打开命令中心">
            <Search className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/app">
              进入应用
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeroBackdrop() {
  const { resolvedTheme } = useTheme();
  const { points, value } = useLiveBudgetSeries();

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-background/65" />

      <div className="absolute bottom-[-4rem] right-[-7rem] hidden w-[56rem] rotate-[-3deg] lg:block">
        <div className="rounded-lg border bg-card/95 p-4 shadow-2xl shadow-foreground/10">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <div>
              <p className="text-xs text-muted-foreground">本月现金流</p>
              <AnimatedCurrency value={value} className="text-3xl font-semibold text-foreground" />
            </div>
            <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              实时更新
            </div>
          </div>
          <div className="grid grid-cols-[1fr_15rem] gap-4">
            <div className="h-72 overflow-hidden rounded-lg border bg-background">
              <Liveline
                data={points}
                value={value}
                color="#10b981"
                theme={resolvedTheme}
                badge
                showValue
                grid
                fill
                pulse
                window={95}
                formatValue={(v) =>
                  new Intl.NumberFormat('zh-CN', {
                    style: 'currency',
                    currency: 'CNY',
                    maximumFractionDigits: 0,
                  }).format(v)
                }
              />
            </div>
            <div className="space-y-3">
              {initialBudgets.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-lg border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">
                      {Math.round((item.spent / item.amount) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', item.tone)}
                      style={{ width: `${Math.min(100, (item.spent / item.amount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection({ onCommandOpen }: { onCommandOpen: () => void }) {
  return (
    <section className="relative isolate min-h-[82svh] overflow-hidden border-b">
      <HeroBackdrop />
      <LandingHeader onCommandOpen={onCommandOpen} />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/85 px-3 py-1 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-warning" />
            预算、账单、贷款和目标放进同一个节奏里
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            个人预算记账助手
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            每天打开一次，就知道今天还能花多少、哪些分类正在超支、贷款什么时候还、
            储蓄目标离你还有多远。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/app">
                进入预算驾驶舱
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" onClick={onCommandOpen}>
              <CommandIcon className="h-4 w-4" />
              打开命令中心
            </Button>
          </div>
        </div>

        <div className="mt-8 grid max-w-4xl grid-cols-3 gap-2 sm:mt-10 sm:gap-3">
          <div className="rounded-lg border bg-background/85 p-3 shadow-sm backdrop-blur sm:p-4">
            <p className="text-[11px] text-muted-foreground sm:text-xs">本月剩余</p>
            <AnimatedCurrency value={6820} className="mt-1 block text-xl font-semibold sm:text-2xl" />
          </div>
          <div className="rounded-lg border bg-background/85 p-3 shadow-sm backdrop-blur sm:p-4">
            <p className="text-[11px] text-muted-foreground sm:text-xs">储蓄率</p>
            <AnimatedPercent value={28} className="mt-1 block text-xl font-semibold sm:text-2xl" />
          </div>
          <div className="rounded-lg border bg-background/85 p-3 shadow-sm backdrop-blur sm:p-4">
            <p className="text-[11px] text-muted-foreground sm:text-xs">到期提醒</p>
            <NumberFlow value={3} className="mt-1 block text-xl font-semibold sm:text-2xl" willChange />
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveOverview() {
  const { resolvedTheme } = useTheme();
  const { points, value } = useLiveBudgetSeries();

  return (
    <section id="overview" className="border-b bg-muted/25 py-14 sm:py-18">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">实时预算余额</p>
              <AnimatedCurrency value={value} className="mt-1 block text-4xl font-semibold" />
            </div>
            <div className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
              <ChartNoAxesCombined className="h-4 w-4" />
              现金流稳定
            </div>
          </div>
          <div className="h-80 overflow-hidden rounded-lg border bg-background">
            <Liveline
              data={points}
              value={value}
              color="#0ea5e9"
              theme={resolvedTheme}
              window={90}
              windows={[
                { label: '30s', secs: 30 },
                { label: '90s', secs: 90 },
                { label: '3m', secs: 180 },
              ]}
              windowStyle="rounded"
              showValue
              valueMomentumColor
              formatValue={(v) =>
                new Intl.NumberFormat('zh-CN', {
                  style: 'currency',
                  currency: 'CNY',
                  maximumFractionDigits: 0,
                }).format(v)
              }
            />
          </div>
        </div>

        <div className="grid content-start gap-4">
          {[
            ['收入', 20500, '工资、副业和固定现金流自动分层'],
            ['支出', 13680, '按预算分类沉淀长期消费画像'],
            ['可投资结余', 6820, '扣除固定支出后的真实余量'],
          ].map(([label, value, text]) => (
            <div key={label} className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <AnimatedCurrency value={Number(value)} className="mt-1 block text-3xl font-semibold" />
                </div>
                <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OtpSlot(props: SlotProps) {
  return (
    <div
      className={cn(
        'relative flex h-12 w-10 items-center justify-center border-y border-r text-xl font-semibold transition-colors first:rounded-l-md first:border-l last:rounded-r-md',
        props.isActive
          ? 'border-foreground bg-background shadow-[0_0_0_3px_hsl(var(--foreground)/0.08)]'
          : 'border-border bg-muted/40',
      )}
    >
      <span className="text-foreground">{props.char ?? props.placeholderChar}</span>
      {props.hasFakeCaret && (
        <span className="otp-caret absolute h-6 w-px rounded-full bg-foreground" />
      )}
    </div>
  );
}

function SecurityPanel() {
  const [otp, setOtp] = useState('48');

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">安全同步确认</p>
          <p className="mt-1 text-sm text-muted-foreground">
            高风险操作需要一次性密码，避免误导出或覆盖备份。
          </p>
        </div>
        <LockKeyhole className="h-5 w-5 text-muted-foreground" />
      </div>

      <OTPInput
        maxLength={6}
        value={otp}
        onChange={setOtp}
        pattern={REGEXP_ONLY_DIGITS}
        placeholder="000000"
        containerClassName="group flex items-center"
        onComplete={() =>
          toast.success('验证通过', {
            description: '预算快照已准备加密同步。',
          })
        }
        render={({ slots }) => (
          <>
            <div className="flex">{slots.slice(0, 3).map((slot, index) => <OtpSlot key={index} {...slot} />)}</div>
            <div className="flex w-8 items-center justify-center">
              <span className="h-1 w-3 rounded-full bg-border" />
            </div>
            <div className="flex">{slots.slice(3).map((slot, index) => <OtpSlot key={index} {...slot} />)}</div>
          </>
        )}
      />

      <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-success" />
          备份文件加密后再上传
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-success" />
          本地账本不会被第三方读取
        </div>
      </div>

      <Button
        className="mt-5 w-full"
        onClick={() =>
          toast.promise(new Promise((resolve) => window.setTimeout(resolve, 900)), {
            loading: '正在生成同步快照',
            success: '同步快照已生成',
            error: '同步失败，请稍后重试',
          })
        }
      >
        <ShieldCheck className="h-4 w-4" />
        同步预算快照
      </Button>
    </div>
  );
}

function BudgetStrategyPanel() {
  const store = useCreateStore();
  const strategy = useControls(
    '预算策略',
    {
      spendingCap: { value: 9800, min: 6000, max: 16000, step: 100, label: '月支出上限' },
      savingsTarget: { value: 26, min: 5, max: 50, step: 1, label: '储蓄目标' },
      alertLevel: { value: 82, min: 50, max: 95, step: 1, label: '预警阈值' },
      lockFixedBills: { value: true, label: '锁定固定支出' },
    },
    { store },
  ) as {
    spendingCap: number;
    savingsTarget: number;
    alertLevel: number;
    lockFixedBills: boolean;
  };

  const daily = strategy.spendingCap / 30;
  const projectedSavings = Math.max(0, 20500 - strategy.spendingCap);

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">预算策略调节器</p>
          <p className="mt-1 text-sm text-muted-foreground">
            拖动参数时，右侧预算结果会即时重算。
          </p>
        </div>
        <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_13rem]">
        <div className="landing-leva min-h-[16rem] overflow-hidden rounded-lg border bg-background">
          <LevaPanel
            store={store}
            fill
            flat
            hideCopyButton
            titleBar={{ title: '策略面板', filter: false, drag: false }}
          />
        </div>
        <div className="grid gap-3">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs text-muted-foreground">日均可花</p>
            <AnimatedCurrency value={daily} className="mt-1 block text-2xl font-semibold" />
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs text-muted-foreground">预计结余</p>
            <AnimatedCurrency value={projectedSavings} className="mt-1 block text-2xl font-semibold" />
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs text-muted-foreground">预警线</p>
            <AnimatedPercent value={strategy.alertLevel} className="mt-1 block text-2xl font-semibold" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableBudgetCard({ item }: { item: BudgetCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const usage = Math.min(100, (item.spent / item.amount) * 100);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'rounded-lg border bg-background p-4 shadow-sm',
        isDragging && 'relative z-10 shadow-lg ring-2 ring-ring',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`调整 ${item.label} 优先级`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-foreground">{item.label}</p>
            <span className="text-sm text-muted-foreground">
              {Math.round(usage)}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full', item.tone)} style={{ width: `${usage}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>
              已用 <AnimatedCurrency value={item.spent} />
            </span>
            <span>
              预算 <AnimatedCurrency value={item.amount} />
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

function BudgetPriorityList() {
  const [items, setItems] = useState(initialBudgets);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
    toast.message('预算优先级已更新');
  }

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">预算优先级</p>
          <p className="mt-1 text-sm text-muted-foreground">
            分类顺序会影响首页提醒和复盘视图。
          </p>
        </div>
        <WalletCards className="h-5 w-5 text-muted-foreground" />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3">
            {items.map((item) => (
              <SortableBudgetCard key={item.id} item={item} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="border-b py-14 sm:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-medium text-muted-foreground">从记录到决策</p>
          <h2 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
            记账不是录入表格，是不断校准生活的速度
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-6">
            <SecurityPanel />
            <BudgetPriorityList />
          </div>
          <BudgetStrategyPanel />
        </div>
      </div>
    </section>
  );
}

function createLedgerItems(): LedgerItem[] {
  const titles = ['午餐', '地铁充值', '主职工资', '超市采购', '视频会员', '房贷还款', '咖啡', '副业收入'];
  const categories = ['餐饮', '交通', '收入', '日用品', '订阅', '贷款', '餐饮', '收入'];
  const methods = ['微信', '支付宝', '银行卡', '信用卡'];

  return Array.from({ length: 860 }, (_, index) => {
    const template = index % titles.length;
    const isIncome = categories[template] === '收入';
    return {
      id: `ledger-${index}`,
      title: titles[template],
      category: categories[template],
      amount: isIncome ? 1200 + (index % 9) * 300 : 18 + (index % 17) * 24,
      method: methods[index % methods.length],
      time: `07-${String((index % 28) + 1).padStart(2, '0')} ${String(8 + (index % 12)).padStart(2, '0')}:30`,
      type: isIncome ? 'income' : 'expense',
    };
  });
}

function LedgerVirtualList() {
  const data = useMemo(() => createLedgerItems(), []);

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">完整账单流</p>
          <p className="mt-1 text-sm text-muted-foreground">大批量记录保持同样的滚动手感。</p>
        </div>
        <ReceiptText className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="h-[24rem] overflow-hidden rounded-lg border bg-background">
        <Virtuoso
          data={data}
          fixedItemHeight={66}
          itemContent={(_, item) => (
            <div className="flex h-[66px] items-center gap-3 border-b px-4">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  item.type === 'income'
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive',
                )}
              >
                {item.type === 'income' ? (
                  <PiggyBank className="h-4 w-4" />
                ) : (
                  <ReceiptText className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.time} · {item.category} · {item.method}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-sm font-semibold',
                  item.type === 'income' ? 'text-success' : 'text-foreground',
                )}
              >
                {item.type === 'income' ? '+' : '-'}
                <AnimatedCurrency value={item.amount} />
              </span>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function PerformanceSection({ onCommandOpen }: { onCommandOpen: () => void }) {
  return (
    <section id="performance" className="border-b bg-muted/25 py-14 sm:py-18">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="grid content-start gap-6">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">命令中心</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  快速触达记账、预算、同步、导出和提醒。
                </p>
              </div>
              <CommandIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <button
              type="button"
              onClick={onCommandOpen}
              className="flex w-full items-center gap-3 rounded-lg border bg-background px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              搜索动作、页面或账单
              <ChevronRight className="ml-auto h-4 w-4" />
            </button>
            <div className="mt-4 grid gap-2">
              {commandItems.slice(0, 3).map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {featureCards.map(({ title, copy, icon: Icon }) => (
              <div key={title} className="rounded-lg border bg-card p-5 shadow-sm">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <p className="mt-3 font-semibold text-foreground">{title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <LedgerVirtualList />
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="py-14 sm:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border bg-foreground p-6 text-background shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm text-background/65">今天就把账本重新放回你手里</p>
              <h2 className="mt-2 text-3xl font-semibold">从一笔支出开始，建立可持续的预算节奏。</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-background/70">
                先用示例数据熟悉流程，再替换成自己的收入、预算和贷款计划。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild variant="secondary" size="lg">
                <Link to="/app">
                  打开应用
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/20 bg-transparent text-background hover:bg-white/10 hover:text-background"
                onClick={() =>
                  toast.success('演示报表已生成', {
                    description: '你可以在应用内导出真实账单。',
                  })
                }
              >
                <Download className="h-4 w-4" />
                生成演示报表
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label="命令中心" loop>
      <div className="flex items-center gap-3 border-b px-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Command.Input placeholder="搜索记账动作、页面或提醒..." />
      </div>
      <Command.List>
        <Command.Empty>没有匹配的动作</Command.Empty>
        <Command.Group heading="常用动作">
          {commandItems.map((item) => (
            <Command.Item
              key={item.label}
              value={`${item.label} ${item.detail}`}
              onSelect={() => {
                onOpenChange(false);
                toast.success(item.label, { description: item.detail });
              }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CommandIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

export function Landing() {
  const [commandOpen, setCommandOpen] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection onCommandOpen={() => setCommandOpen(true)} />
      <LiveOverview />
      <WorkflowSection />
      <PerformanceSection onCommandOpen={() => setCommandOpen(true)} />
      <ClosingCta />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <Toaster richColors closeButton position="bottom-right" theme={resolvedTheme} />
    </div>
  );
}
