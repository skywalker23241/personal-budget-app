/**
 * `@/components/ui` 统一出口：shadcn 原语 + App 级组合件。
 * 注意：Card 由 composites 提供（带默认内边距，兼容旧用法），
 * 因此这里只从 ./card 透出其子部件。
 */
export * from './button';
export {
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './card';
export * from './input';
export * from './label';
export * from './textarea';
export * from './select';
export * from './dialog';
export * from './alert-dialog';
export * from './progress';
export * from './switch';
export * from './tabs';
export * from './separator';
export * from './composites';
