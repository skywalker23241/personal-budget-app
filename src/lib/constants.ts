/**
 * 全局常量：分类、支付方式、颜色映射、衣食住行分组等。
 */
import type {
  IncomeType,
  LoanType,
  LoanPlatform,
  GoalType,
  PaymentMethod,
  TransactionType,
} from '@/types';

/** 收入分类 */
export const INCOME_CATEGORIES = [
  '工资',
  '奖金',
  '副业收入',
  '投资收益',
  '退款',
  '其他收入',
] as const;

/** 支出分类 */
export const EXPENSE_CATEGORIES = [
  '房租/房贷',
  '车贷/贷款还款',
  '水电煤网',
  '餐饮',
  '超市/日用品',
  '交通',
  '服装',
  '医疗',
  '娱乐',
  '订阅服务',
  '学习',
  '旅行',
  '人情往来',
  '宠物',
  '其他支出',
] as const;

/** 支付方式 */
export const PAYMENT_METHODS: PaymentMethod[] = [
  '现金',
  '银行卡',
  '信用卡',
  '支付宝',
  '微信',
  '其他',
];

/** 交易类型标签 */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: '收入',
  expense: '支出',
  transfer: '转账',
  loan_repayment: '贷款还款',
};

/** 收入类型 */
export const INCOME_TYPES: IncomeType[] = ['工资', '奖金', '副业', '投资', '其他'];

/** 贷款类型 */
export const LOAN_TYPES: LoanType[] = ['房贷', '车贷', '消费贷', '信用卡分期', '其他'];

/** 借贷/分期平台 */
export const LOAN_PLATFORMS: LoanPlatform[] = [
  '银行',
  '花呗',
  '京东白条',
  '微信分付',
  '美团月付',
  '抖音月付',
  '信用卡',
  '其他',
];

/** 目标类型 */
export const GOAL_TYPES: GoalType[] = [
  '储蓄',
  '还贷',
  '控制消费',
  '应急金',
  '投资',
  '其他',
];

/**
 * 衣食住行分组：将支出分类与关键词映射到四个维度，用于报表分析。
 * keywords 用于匹配备注/分类中的细分项（如"外卖""咖啡"）。
 */
export const LIFE_GROUPS: {
  key: string;
  label: string;
  categories: string[];
  keywords: string[];
  color: string;
}[] = [
  {
    key: 'clothing',
    label: '衣',
    categories: ['服装'],
    keywords: ['服装', '鞋', '包', '美妆', '配饰', '衣'],
    color: '#f472b6',
  },
  {
    key: 'food',
    label: '食',
    categories: ['餐饮', '超市/日用品'],
    keywords: ['餐饮', '外卖', '超市', '咖啡', '零食', '食'],
    color: '#fb923c',
  },
  {
    key: 'housing',
    label: '住',
    categories: ['房租/房贷', '水电煤网'],
    keywords: ['房租', '房贷', '水电', '煤', '网', '物业', '住'],
    color: '#60a5fa',
  },
  {
    key: 'transport',
    label: '行',
    categories: ['交通'],
    keywords: ['公交', '地铁', '打车', '油费', '停车', '保险', '维修', '交通', '行'],
    color: '#34d399',
  },
];

/**
 * 分类配色：用于饼图、图例等。固定一组柔和色板，循环使用。
 */
export const CHART_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#eab308', // yellow
  '#22c55e', // green
  '#64748b', // slate
];

/** 根据分类名稳定地取一个颜色 */
export function colorForCategory(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return CHART_COLORS[hash % CHART_COLORS.length];
}

/** localStorage 持久化的键名 */
export const STORAGE_KEY = 'personal-budget-app:v1';
