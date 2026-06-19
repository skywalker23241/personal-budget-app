/**
 * 全局数据类型定义
 * 所有实体的 TypeScript 类型集中在此，作为整个应用的数据模型基础。
 */

// ---------- 交易 / 记账 ----------

/** 交易类型：收入 / 支出 / 转账 / 贷款还款 */
export type TransactionType = 'income' | 'expense' | 'transfer' | 'loan_repayment';

/** 支付方式 */
export type PaymentMethod = '现金' | '银行卡' | '信用卡' | '支付宝' | '微信' | '其他';

export interface Transaction {
  /** 唯一 ID */
  id: string;
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 类型 */
  type: TransactionType;
  /** 金额（始终为正数，类型决定收/支方向） */
  amount: number;
  /** 分类（收入/支出分类名称） */
  category: string;
  /** 支付方式 */
  paymentMethod: PaymentMethod;
  /** 备注 */
  note: string;
  /** 是否计入预算 */
  countInBudget: boolean;
  /** 是否固定支出/收入 */
  isFixed: boolean;
  /** 关联的贷款 ID（贷款还款时使用） */
  loanId?: string;
  /** 创建时间（ISO 字符串） */
  createdAt: string;
}

// ---------- 预算 ----------

export interface Budget {
  id: string;
  /** 月份 YYYY-MM */
  month: string;
  /** 分类 */
  category: string;
  /** 预算金额 */
  amount: number;
}

/** 预算状态 */
export type BudgetStatus = 'normal' | 'warning' | 'exceeded';

/** 预算 + 实时计算后的派生数据 */
export interface BudgetWithUsage extends Budget {
  /** 已使用金额 */
  used: number;
  /** 剩余金额（可为负） */
  remaining: number;
  /** 使用率 0~1+ */
  usageRate: number;
  /** 状态 */
  status: BudgetStatus;
}

// ---------- 贷款 ----------

export type LoanType = '房贷' | '车贷' | '消费贷' | '信用卡分期' | '其他';

export interface Loan {
  id: string;
  /** 贷款名称 */
  name: string;
  /** 贷款类型 */
  type: LoanType;
  /** 初始本金 */
  principal: number;
  /** 当前剩余本金 */
  remainingPrincipal: number;
  /** 年利率（百分比，如 4.5 表示 4.5%） */
  annualRate: number;
  /** 月供金额 */
  monthlyPayment: number;
  /** 还款日（每月几号 1-28/31） */
  repaymentDay: number;
  /** 贷款开始日期 YYYY-MM-DD */
  startDate: string;
  /** 贷款期限（月） */
  termMonths: number;
  /** 已还期数 */
  paidPeriods: number;
  /** 是否启用还款提醒 */
  remindEnabled: boolean;
  /** 备注 */
  note: string;
}

/** 单笔还款记录 */
export interface LoanPayment {
  id: string;
  loanId: string;
  /** 还款日期 YYYY-MM-DD */
  date: string;
  /** 还款金额 */
  amount: number;
  /** 其中本金部分 */
  principalPart: number;
  /** 其中利息部分 */
  interestPart: number;
  note: string;
}

// ---------- 收入来源 ----------

export type IncomeType = '工资' | '奖金' | '副业' | '投资' | '其他';

export interface IncomeSource {
  id: string;
  /** 收入名称 */
  name: string;
  /** 收入类型 */
  type: IncomeType;
  /** 金额 */
  amount: number;
  /** 是否固定收入 */
  isFixed: boolean;
  /** 到账日（每月几号） */
  payday: number;
  /** 备注 */
  note: string;
}

// ---------- 财务目标 ----------

export type GoalType = '储蓄' | '还贷' | '控制消费' | '应急金' | '投资' | '其他';
export type GoalStatus = 'in_progress' | 'completed' | 'behind';

export interface FinancialGoal {
  id: string;
  /** 目标名称 */
  name: string;
  /** 目标类型 */
  type: GoalType;
  /** 目标金额 */
  targetAmount: number;
  /** 当前已存金额 */
  currentAmount: number;
  /** 截止日期 YYYY-MM-DD */
  deadline: string;
  /** 每月计划投入金额 */
  monthlyPlan: number;
  /** 备注 */
  note: string;
  /** 创建时间 */
  createdAt: string;
}

// ---------- 设置 ----------

export interface AppSettings {
  /** 默认币种 */
  currency: string;
  /** 月度储蓄率目标（百分比，如 20 表示 20%） */
  savingsRateTarget: number;
  /** 预算预警阈值（百分比，默认 80） */
  budgetWarnThreshold: number;
  /** 大额支出提醒阈值（金额） */
  largeExpenseThreshold: number;
  /** 每月记账周期起始日（默认 1 号） */
  monthStartDay: number;
}

// ---------- 提醒 ----------

export type ReminderLevel = 'info' | 'warning' | 'danger';
export type ReminderCategory = 'budget' | 'loan' | 'spending' | 'savings';

export interface Reminder {
  id: string;
  category: ReminderCategory;
  level: ReminderLevel;
  title: string;
  description: string;
}

// ---------- 全量应用数据（用于导入/导出/持久化） ----------

export interface AppData {
  transactions: Transaction[];
  budgets: Budget[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  incomeSources: IncomeSource[];
  goals: FinancialGoal[];
  settings: AppSettings;
}
