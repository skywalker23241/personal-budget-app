/**
 * 设置页面：偏好设置 + 数据管理（导出/导入 JSON、导出 CSV、清空、载入示例）。
 */
import { useRef, useState, type ReactNode } from 'react';
import {
  ChevronRight,
  Cloud,
  RefreshCw,
  Save,
  ShieldCheck,
  Unplug,
} from 'lucide-react';
import type { AppData } from '@/types';
import { useStore } from '@/store/useStore';
import { todayStr } from '@/lib/format';
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  DEFAULT_WEBDAV_CONFIG,
  clearWebDavConfig,
  clearWebDavSyncMeta,
  compareIsoTime,
  downloadCloudSnapshot,
  loadWebDavConfig,
  loadWebDavSyncMeta,
  markCloudDownloadApplied,
  saveWebDavConfig,
  saveWebDavSyncMeta,
  testWebDavConnection,
  uploadCloudSnapshot,
  type WebDavConfig,
} from '@/lib/webdavSync';
import { PageHeader } from '@/components/PageHeader';
import { AppSummaryCard } from '@/components/AppSummaryCard';
import { MobileCollapsibleSection } from '@/components/MobileCollapsibleSection';
import { Card, SectionTitle, Button, Input } from '@/components/ui';
import { Field, SelectField } from '@/components/forms/fields';
import { ThemeSegmented } from '@/components/ThemeToggle';
import { useConfirm } from '@/components/ConfirmDialog';
import { useSecurityConfirm } from '@/components/SecurityConfirmDialog';
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

function formatSyncTime(value?: string): string {
  if (!value) return '从未';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function syncResultLabel(result?: string): string {
  if (result === 'uploaded') return '已上传';
  if (result === 'downloaded') return '已下载';
  if (result === 'unchanged') return '无变化';
  return '暂无';
}

function SettingActionRow({
  icon,
  title,
  description,
  onClick,
  disabled,
  danger,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="app-press group flex w-full items-center gap-3 py-3 text-left disabled:pointer-events-none disabled:opacity-50"
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
          danger && 'bg-destructive/10 text-destructive',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-medium text-foreground group-hover:text-foreground',
            danger && 'text-destructive',
          )}
        >
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const exportData = useStore((s) => s.exportData);
  const replaceAll = useStore((s) => s.replaceAll);
  const clearAll = useStore((s) => s.clearAll);
  const loadSampleData = useStore((s) => s.loadSampleData);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const loans = useStore((s) => s.loans);
  const incomeSources = useStore((s) => s.incomeSources);
  const goals = useStore((s) => s.goals);
  const confirm = useConfirm();
  const { securityConfirm, securityConfirmDialog } = useSecurityConfirm();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [syncConfig, setSyncConfig] = useState<WebDavConfig>(() => loadWebDavConfig());
  const [syncMeta, setSyncMeta] = useState(() => loadWebDavSyncMeta());
  const [syncing, setSyncing] = useState<string | null>(null);
  const syncConfigured = Boolean(
    syncConfig.serverUrl && syncConfig.username && syncConfig.remotePath,
  );
  const totalLocalItems =
    transactions.length + budgets.length + loans.length + incomeSources.length + goals.length;

  function updateSyncConfig<K extends keyof WebDavConfig>(
    key: K,
    value: WebDavConfig[K],
  ) {
    setSyncConfig((prev) => ({ ...prev, [key]: value }));
  }

  function persistSyncConfig(): WebDavConfig {
    const saved = saveWebDavConfig(syncConfig);
    setSyncConfig(saved);
    return saved;
  }

  function refreshSyncMeta() {
    setSyncMeta(loadWebDavSyncMeta());
  }

  async function runSync(action: string, task: () => Promise<void>) {
    setSyncing(action);
    try {
      await task();
    } catch (err) {
      toast.error('同步失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      refreshSyncMeta();
      setSyncing(null);
    }
  }

  function handleSaveSyncConfig() {
    try {
      persistSyncConfig();
      toast.success('WebDAV 配置已保存');
    } catch (err) {
      toast.error('保存失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  }

  async function handleTestConnection() {
    await runSync('test', async () => {
      const config = persistSyncConfig();
      const fileExists = await testWebDavConnection(config);
      toast.success(fileExists ? '连接成功，已找到云端同步文件' : '连接成功，云端还没有同步文件');
    });
  }

  async function handleUploadToCloud() {
    const ok = await securityConfirm({
      title: '安全同步确认：上传本机数据',
      message:
        '将用当前浏览器里的全部预算数据覆盖 WebDAV 云端同步文件。建议确认本机数据完整后再继续。',
      confirmText: '上传覆盖',
    });
    if (!ok) return;

    await runSync('upload', async () => {
      const config = persistSyncConfig();
      await uploadCloudSnapshot(config, exportData(), new Date().toISOString());
      toast.success('已上传本机数据到 WebDAV');
    });
  }

  async function handleDownloadFromCloud() {
    const ok = await securityConfirm({
      title: '安全同步确认：下载云端数据',
      message:
        '将用 WebDAV 云端同步文件覆盖当前浏览器里的全部预算数据。建议先导出 JSON 备份。',
      confirmText: '下载覆盖',
    });
    if (!ok) return;

    await runSync('download', async () => {
      const config = persistSyncConfig();
      const snapshot = await downloadCloudSnapshot(config);
      if (!snapshot) {
        toast.info('云端还没有同步文件');
        return;
      }
      replaceAll(snapshot.data);
      setSyncMeta(markCloudDownloadApplied(snapshot.updatedAt));
      toast.success('已从 WebDAV 下载数据');
    });
  }

  async function handleSmartSync() {
    await runSync('smart', async () => {
      const config = persistSyncConfig();
      const snapshot = await downloadCloudSnapshot(config);

      if (!snapshot) {
        await uploadCloudSnapshot(config, exportData(), new Date().toISOString());
        toast.success('云端无同步文件，已上传本机数据');
        return;
      }

      const currentMeta = loadWebDavSyncMeta();
      const localUpdatedAt = currentMeta.lastLocalChangeAt;

      if (!localUpdatedAt) {
        const ok = await securityConfirm({
          title: '安全同步确认：首次同步',
          message:
            '云端已有同步文件，但本机没有同步历史。继续将从云端下载并覆盖本机数据；取消后可改用“上传本机数据”。',
          confirmText: '从云端下载',
        });
        if (!ok) return;
        replaceAll(snapshot.data);
        setSyncMeta(markCloudDownloadApplied(snapshot.updatedAt));
        toast.success('已从云端下载数据');
        return;
      }

      const comparison = compareIsoTime(localUpdatedAt, snapshot.updatedAt);
      if (comparison > 0) {
        await uploadCloudSnapshot(config, exportData(), localUpdatedAt);
        toast.success('本机数据较新，已上传到云端');
        return;
      }

      if (comparison < 0) {
        const ok = await securityConfirm({
          title: '安全同步确认：云端数据较新',
          message: `云端更新于 ${formatSyncTime(snapshot.updatedAt)}，本机更新于 ${formatSyncTime(
            localUpdatedAt,
          )}。继续将用云端数据覆盖本机。`,
          confirmText: '下载覆盖',
        });
        if (!ok) return;
        replaceAll(snapshot.data);
        setSyncMeta(markCloudDownloadApplied(snapshot.updatedAt));
        toast.success('云端数据较新，已下载到本机');
        return;
      }

      saveWebDavSyncMeta({
        ...currentMeta,
        lastSyncAt: new Date().toISOString(),
        lastRemoteUpdatedAt: snapshot.updatedAt,
        lastResult: 'unchanged',
      });
      toast.info('本机和云端已是最新');
    });
  }

  async function handleClearSyncConfig() {
    const ok = await confirm({
      title: '清除 WebDAV 配置',
      message: '将删除当前浏览器保存的 WebDAV 地址、账号、密码和同步状态，不会删除云端文件。',
      danger: true,
      confirmText: '清除配置',
    });
    if (!ok) return;

    clearWebDavConfig();
    clearWebDavSyncMeta();
    setSyncConfig(DEFAULT_WEBDAV_CONFIG);
    setSyncMeta({});
    toast.success('WebDAV 配置已清除');
  }

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
      {securityConfirmDialog}
      <PageHeader title="设置" subtitle="偏好设置与数据管理" />

      <AppSummaryCard
        eyebrow="设置中心"
        title={syncConfigured ? '云同步配置' : '本地数据'}
        value={syncConfigured ? syncResultLabel(syncMeta.lastResult) : `${totalLocalItems} 项`}
        subtitle={
          syncConfigured
            ? `最近同步：${formatSyncTime(syncMeta.lastSyncAt)}。密码仅保存在当前浏览器。`
            : '当前数据保存在本机浏览器，建议配置 WebDAV 或定期导出备份。'
        }
        accent={syncConfigured ? 'info' : 'warning'}
        meta={[
          { label: '记账记录', value: `${transactions.length} 笔` },
          { label: '预算/目标', value: `${budgets.length + goals.length} 项` },
          { label: '贷款/收入', value: `${loans.length + incomeSources.length} 项` },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 偏好设置 */}
        <MobileCollapsibleSection
          title="偏好设置"
          subtitle="主题、币种和提醒阈值"
          defaultOpen
        >
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
        </MobileCollapsibleSection>

        {/* 数据管理 */}
        <div className="space-y-4">
          <MobileCollapsibleSection
            title="数据备份"
            subtitle="导入、导出 JSON / CSV"
          >
            <Card>
              <SectionTitle title="数据备份" subtitle="所有数据仅保存在本地浏览器" />
              <div className="divide-y divide-border">
                <SettingActionRow
                  icon={<IconDownload className="h-4 w-4" />}
                  title="导出全部数据"
                  description="JSON 备份，可恢复到任意浏览器"
                  onClick={handleExportJSON}
                />
                <SettingActionRow
                  icon={<IconReceipt className="h-4 w-4" />}
                  title="导出记账记录"
                  description={`${transactions.length} 笔流水，CSV 格式`}
                  onClick={handleExportCSV}
                />
                <SettingActionRow
                  icon={<IconUpload className="h-4 w-4" />}
                  title={importing ? '导入中…' : '从 JSON 文件导入'}
                  description="会覆盖当前所有本地数据"
                  onClick={() => fileRef.current?.click()}
                  disabled={importing}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
            </Card>
          </MobileCollapsibleSection>

          <MobileCollapsibleSection
            title="WebDAV 云同步"
            subtitle={`最近同步：${formatSyncTime(syncMeta.lastSyncAt)}`}
          >
          <Card>
              <SectionTitle
                title="WebDAV 云同步"
                subtitle="同步为云端 JSON 文件，适合坚果云、NAS、Nextcloud 等 WebDAV 服务"
                action={<Cloud className="h-5 w-5 text-muted-foreground" />}
              />

            <div className="space-y-4">
              <Field label="WebDAV 服务地址" hint="例如 https://dav.example.com/dav/">
                <Input
                  value={syncConfig.serverUrl}
                  onChange={(e) => updateSyncConfig('serverUrl', e.target.value)}
                  placeholder="https://dav.example.com/dav/"
                  autoComplete="url"
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="用户名">
                  <Input
                    value={syncConfig.username}
                    onChange={(e) => updateSyncConfig('username', e.target.value)}
                    placeholder="WebDAV 账号"
                    autoComplete="username"
                  />
                </Field>

                <Field label="密码 / 应用密码">
                  <Input
                    type="password"
                    value={syncConfig.password}
                    onChange={(e) => updateSyncConfig('password', e.target.value)}
                    placeholder="建议使用应用密码"
                    autoComplete="current-password"
                  />
                </Field>
              </div>

              <Field label="云端文件路径" hint="会自动创建中间目录；同一账号多设备保持一致">
                <Input
                  value={syncConfig.remotePath}
                  onChange={(e) => updateSyncConfig('remotePath', e.target.value)}
                  placeholder="/personal-budget-app/budget-sync.json"
                />
              </Field>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={handleSaveSyncConfig}
                  disabled={!!syncing}
                >
                  <Save className="h-4 w-4" />
                  保存配置
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={handleTestConnection}
                  disabled={!!syncing}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {syncing === 'test' ? '测试中…' : '测试连接'}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  className="justify-start"
                  onClick={handleSmartSync}
                  disabled={!!syncing}
                >
                  <RefreshCw className="h-4 w-4" />
                  {syncing === 'smart' ? '同步中…' : '智能同步'}
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={handleUploadToCloud}
                  disabled={!!syncing}
                >
                  <IconUpload className="h-4 w-4" />
                  {syncing === 'upload' ? '上传中…' : '上传本机'}
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={handleDownloadFromCloud}
                  disabled={!!syncing}
                >
                  <IconDownload className="h-4 w-4" />
                  {syncing === 'download' ? '下载中…' : '下载云端'}
                </Button>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                <p>上次同步：{formatSyncTime(syncMeta.lastSyncAt)}</p>
                <p>本机修改：{formatSyncTime(syncMeta.lastLocalChangeAt)}</p>
                <p>云端版本：{formatSyncTime(syncMeta.lastRemoteUpdatedAt)}</p>
                <p>最近结果：{syncResultLabel(syncMeta.lastResult)}</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  密码只保存在当前浏览器；同步请求会通过同源 /api/webdav 代理转发到 WebDAV。
                  上传或下载覆盖数据前需要输入一次性确认码（安全同步确认）。
                  本地开发服务器已内置代理，正式部署时也需要提供同名接口。
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start text-muted-foreground"
                  onClick={handleClearSyncConfig}
                  disabled={!!syncing}
                >
                  <Unplug className="h-4 w-4" />
                  清除配置
                </Button>
              </div>
            </div>
          </Card>
          </MobileCollapsibleSection>

          <MobileCollapsibleSection
            title="其他操作"
            subtitle="示例数据与本地重置"
          >
            <Card>
              <SectionTitle title="其他操作" subtitle="演示数据与本地重置" />
              <div className="divide-y divide-border">
                <SettingActionRow
                  icon={<IconSettings className="h-4 w-4" />}
                  title="载入示例数据"
                  description="用示例账本体验完整功能"
                  onClick={handleLoadSample}
                />
                <SettingActionRow
                  icon={<IconTrash className="h-4 w-4" />}
                  title="清空所有数据"
                  description="仅保留当前偏好设置"
                  onClick={handleClear}
                  danger
                />
              </div>
            </Card>
          </MobileCollapsibleSection>

          <Card className="bg-muted/30">
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
