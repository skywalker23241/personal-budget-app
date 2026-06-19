/**
 * 通用工具：cn() 合并 className（clsx + tailwind-merge），shadcn/ui 约定。
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
