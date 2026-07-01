/**
 * 默认示例数据：首次打开应用时自动载入，方便用户看到完整效果。
 * 数据按"当前月份"动态生成，保证仪表盘、报表始终有当月内容。
 */
import type { AppData, Transaction } from '@/types';
import { uid, todayStr, currentMonth, prevMonth, toDateStr } from './format';

/** 在指定月份内构造一个 YYYY-MM-DD 日期（day 自动裁剪到合法范围） */
function dateIn(month: string, day: number): string {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(1, day), lastDay);
  return `${month}-${String(d).padStart(2, '0')}`;
}

function tx(partial: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  return {
    id: uid('tx_'),
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

/** 为某个月份生成一组典型的收支记录 */
function monthlyTransactions(month: string, loanId: string): Transaction[] {
  return [
    // 收入
    tx({
      date: dateIn(month, 10),
      type: 'income',
      amount: 18000,
      category: '工资',
      paymentMethod: '银行卡',
      note: '月薪',
      countInBudget: false,
      isFixed: true,
    }),
    tx({
      date: dateIn(month, 15),
      type: 'income',
      amount: 2500,
      category: '副业收入',
      paymentMethod: '支付宝',
      note: '接私活',
      countInBudget: false,
      isFixed: false,
    }),
    // 住
    tx({
      date: dateIn(month, 1),
      type: 'expense',
      amount: 4500,
      category: '房租/房贷',
      paymentMethod: '银行卡',
      note: '每月房租',
      countInBudget: true,
      isFixed: true,
    }),
    tx({
      date: dateIn(month, 6),
      type: 'expense',
      amount: 380,
      category: '水电煤网',
      paymentMethod: '支付宝',
      note: '水电费',
      countInBudget: true,
      isFixed: true,
    }),
    // 食（多笔餐饮）
    tx({
      date: dateIn(month, 3),
      type: 'expense',
      amount: 68,
      category: '餐饮',
      paymentMethod: '微信',
      note: '午餐',
      countInBudget: true,
      isFixed: false,
    }),
    tx({
      date: dateIn(month, 8),
      type: 'expense',
      amount: 152,
      category: '餐饮',
      paymentMethod: '微信',
      note: '外卖聚餐',
      countInBudget: true,
      isFixed: false,
    }),
    tx({
      date: dateIn(month, 14),
      type: 'expense',
      amount: 45,
      category: '餐饮',
      paymentMethod: '支付宝',
      note: '咖啡',
      countInBudget: true,
      isFixed: false,
    }),
    tx({
      date: dateIn(month, 20),
      type: 'expense',
      amount: 320,
      category: '超市/日用品',
      paymentMethod: '银行卡',
      note: '超市采购',
      countInBudget: true,
      isFixed: false,
    }),
    // 行
    tx({
      date: dateIn(month, 5),
      type: 'expense',
      amount: 200,
      category: '交通',
      paymentMethod: '支付宝',
      note: '地铁充值',
      countInBudget: true,
      isFixed: false,
    }),
    tx({
      date: dateIn(month, 18),
      type: 'expense',
      amount: 88,
      category: '交通',
      paymentMethod: '微信',
      note: '打车',
      countInBudget: true,
      isFixed: false,
    }),
    // 衣
    tx({
      date: dateIn(month, 12),
      type: 'expense',
      amount: 599,
      category: '服装',
      paymentMethod: '信用卡',
      note: '换季买衣服',
      countInBudget: true,
      isFixed: false,
    }),
    // 娱乐 / 订阅
    tx({
      date: dateIn(month, 9),
      type: 'expense',
      amount: 120,
      category: '娱乐',
      paymentMethod: '支付宝',
      note: '电影+爆米花',
      countInBudget: true,
      isFixed: false,
    }),
    tx({
      date: dateIn(month, 2),
      type: 'expense',
      amount: 25,
      category: '订阅服务',
      paymentMethod: '支付宝',
      note: '视频会员',
      countInBudget: true,
      isFixed: true,
    }),
    // 贷款还款（同步到记账）
    tx({
      date: dateIn(month, 8),
      type: 'loan_repayment',
      amount: 3200,
      category: '车贷/贷款还款',
      paymentMethod: '银行卡',
      note: '车贷月供',
      countInBudget: true,
      isFixed: true,
      loanId,
    }),
  ];
}

/** 生成完整示例数据 */
export function createSampleData(): AppData {
  const thisMonth = currentMonth();
  const lastMonth = prevMonth(thisMonth);
  const carLoanId = uid('loan_');

  const transactions: Transaction[] = [
    ...monthlyTransactions(lastMonth, carLoanId),
    ...monthlyTransactions(thisMonth, carLoanId),
    // 当月再加几笔近几天的零散支出，让 7 天趋势更生动
    tx({
      date: todayStr(),
      type: 'expense',
      amount: 39,
      category: '餐饮',
      paymentMethod: '微信',
      note: '今日午餐',
      countInBudget: true,
      isFixed: false,
    }),
    tx({
      date: toDateStr(new Date(Date.now() - 86400000)),
      type: 'expense',
      amount: 156,
      category: '超市/日用品',
      paymentMethod: '支付宝',
      note: '生活用品',
      countInBudget: true,
      isFixed: false,
    }),
    tx({
      date: toDateStr(new Date(Date.now() - 2 * 86400000)),
      type: 'expense',
      amount: 60,
      category: '交通',
      paymentMethod: '微信',
      note: '打车回家',
      countInBudget: true,
      isFixed: false,
    }),
  ];

  return {
    transactions,
    settings: {
      currency: 'CNY',
      savingsRateTarget: 20,
      budgetWarnThreshold: 80,
      largeExpenseThreshold: 2000,
      monthStartDay: 1,
    },
    budgets: [
      { id: uid('bg_'), month: thisMonth, category: '餐饮', amount: 2000 },
      { id: uid('bg_'), month: thisMonth, category: '超市/日用品', amount: 1000 },
      { id: uid('bg_'), month: thisMonth, category: '交通', amount: 600 },
      { id: uid('bg_'), month: thisMonth, category: '服装', amount: 500 },
      { id: uid('bg_'), month: thisMonth, category: '娱乐', amount: 400 },
      { id: uid('bg_'), month: thisMonth, category: '房租/房贷', amount: 4500 },
    ],
    loans: [
      {
        id: carLoanId,
        name: '我的车贷',
        type: '车贷',
        platform: '银行',
        principal: 150000,
        remainingPrincipal: 96000,
        annualRate: 4.9,
        monthlyPayment: 3200,
        repaymentDay: 8,
        startDate: dateIn(prevMonth(prevMonth(thisMonth)), 8).slice(0, 7) + '-08',
        termMonths: 60,
        paidPeriods: 18,
        remindEnabled: true,
        note: '购车分期贷款',
      },
    ],
    loanPayments: [],
    incomeSources: [
      {
        id: uid('inc_'),
        name: '主职工资',
        type: '工资',
        amount: 18000,
        isFixed: true,
        payday: 10,
        note: '每月 10 号发薪',
      },
      {
        id: uid('inc_'),
        name: '副业收入',
        type: '副业',
        amount: 2500,
        isFixed: false,
        payday: 15,
        note: '接活不固定',
      },
    ],
    goals: [
      {
        id: uid('goal_'),
        name: '应急储备金',
        type: '应急金',
        targetAmount: 60000,
        currentAmount: 24000,
        deadline: dateIn(`${new Date().getFullYear() + 1}-12`, 31),
        monthlyPlan: 3000,
        note: '6 个月生活费的应急金',
        createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
      },
      {
        id: uid('goal_'),
        name: '旅行基金',
        type: '储蓄',
        targetAmount: 20000,
        currentAmount: 8500,
        deadline: dateIn(`${new Date().getFullYear()}-12`, 31),
        monthlyPlan: 2000,
        note: '年底出国旅行',
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      },
    ],
  };
}
