/**
 * 格式化与日期工具函数。
 */

/** 生成唯一 ID（不依赖外部库） */
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 9);
  const time = Date.now().toString(36);
  return `${prefix}${time}${rand}`;
}

/** 格式化金额，带千分位 */
export function formatNumber(value: number, fractionDigits = 2): string {
  if (!isFinite(value)) return '0';
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** 币种符号映射 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  HKD: 'HK$',
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? '¥';
}

/** 格式化为金额字符串，带币种符号 */
export function formatCurrency(
  value: number,
  currency = 'CNY',
  fractionDigits = 2
): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}${currencySymbol(currency)}${formatNumber(Math.abs(value), fractionDigits)}`;
}

/** 格式化百分比，value 为 0~1 或直接百分数 */
export function formatPercent(value: number, fractionDigits = 0): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

// ---------- 日期工具 ----------

/** 返回今天 YYYY-MM-DD（本地时区） */
export function todayStr(): string {
  return toDateStr(new Date());
}

/** Date -> YYYY-MM-DD（本地时区，避免 toISOString 的时区偏移） */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 返回当前月份 YYYY-MM */
export function currentMonth(): string {
  return todayStr().slice(0, 7);
}

/** 从 YYYY-MM-DD 取月份 YYYY-MM */
export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** 月份字符串 YYYY-MM -> 中文展示 "2026年6月" */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${y}年${parseInt(m, 10)}月`;
}

/** 上一个月 YYYY-MM */
export function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 下一个月 YYYY-MM */
export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 偏移月份：month + n 个月 */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 计算两个日期相差的天数（b - a） */
export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/** 距离本月某个还款日还有几天（可能跨月） */
export function daysUntilRepaymentDay(repaymentDay: number, today = new Date()): number {
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();
  // 本月还款日
  let target = new Date(y, m, repaymentDay);
  if (repaymentDay < day) {
    // 已过，取下月
    target = new Date(y, m + 1, repaymentDay);
  }
  return Math.round((target.getTime() - new Date(y, m, day).getTime()) / 86400000);
}

/** 生成最近 n 天的日期数组（含今天），升序 */
export function lastNDays(n: number): string[] {
  const arr: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    arr.push(toDateStr(d));
  }
  return arr;
}

/** 安全数字转换：非法值返回 0 */
export function safeNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isFinite(n) ? n : 0;
}

/** clamp */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
