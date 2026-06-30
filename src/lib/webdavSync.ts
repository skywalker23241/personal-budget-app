import type { AppData } from '@/types';

const CONFIG_KEY = 'personal-budget-app:webdav-config:v1';
const META_KEY = 'personal-budget-app:webdav-meta:v1';
const SNAPSHOT_SCHEMA = 'personal-budget-webdav-sync/v1';
const WEBDAV_PROXY_ENDPOINT = '/api/webdav';

export interface WebDavConfig {
  serverUrl: string;
  username: string;
  password: string;
  remotePath: string;
}

export interface WebDavSyncMeta {
  lastSyncAt?: string;
  lastLocalChangeAt?: string;
  lastRemoteUpdatedAt?: string;
  lastResult?: 'uploaded' | 'downloaded' | 'unchanged';
}

export interface CloudSnapshot {
  schema: typeof SNAPSHOT_SCHEMA;
  updatedAt: string;
  data: AppData;
}

export const DEFAULT_WEBDAV_CONFIG: WebDavConfig = {
  serverUrl: '',
  username: '',
  password: '',
  remotePath: '/personal-budget-app/budget-sync.json',
};

function nowIso(): string {
  return new Date().toISOString();
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  const localStorage = storage();
  if (!localStorage) return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  const localStorage = storage();
  if (!localStorage) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function removeItem(key: string) {
  const localStorage = storage();
  if (!localStorage) return;
  localStorage.removeItem(key);
}

function normalizeRemotePath(path: string): string {
  const clean = path.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  return clean || DEFAULT_WEBDAV_CONFIG.remotePath.replace(/^\/+/, '');
}

function normalizeConfig(config: WebDavConfig): WebDavConfig {
  return {
    serverUrl: config.serverUrl.trim(),
    username: config.username.trim(),
    password: config.password,
    remotePath: `/${normalizeRemotePath(config.remotePath)}`,
  };
}

export function loadWebDavConfig(): WebDavConfig {
  return normalizeConfig(readJson(CONFIG_KEY, DEFAULT_WEBDAV_CONFIG));
}

export function saveWebDavConfig(config: WebDavConfig): WebDavConfig {
  const normalized = normalizeConfig(config);
  validateWebDavConfig(normalized);
  writeJson(CONFIG_KEY, normalized);
  return normalized;
}

export function clearWebDavConfig() {
  removeItem(CONFIG_KEY);
}

export function loadWebDavSyncMeta(): WebDavSyncMeta {
  return readJson(META_KEY, {});
}

export function saveWebDavSyncMeta(meta: WebDavSyncMeta): WebDavSyncMeta {
  writeJson(META_KEY, meta);
  return meta;
}

export function clearWebDavSyncMeta() {
  removeItem(META_KEY);
}

export function markLocalDataChanged(when = nowIso()): WebDavSyncMeta {
  return saveWebDavSyncMeta({
    ...loadWebDavSyncMeta(),
    lastLocalChangeAt: when,
  });
}

export function markCloudDownloadApplied(remoteUpdatedAt: string): WebDavSyncMeta {
  return saveWebDavSyncMeta({
    ...loadWebDavSyncMeta(),
    lastSyncAt: nowIso(),
    lastLocalChangeAt: remoteUpdatedAt,
    lastRemoteUpdatedAt: remoteUpdatedAt,
    lastResult: 'downloaded',
  });
}

export function validateWebDavConfig(config: WebDavConfig) {
  if (!config.serverUrl.trim()) {
    throw new Error('请填写 WebDAV 服务地址');
  }

  let url: URL;
  try {
    url = new URL(config.serverUrl.trim());
  } catch {
    throw new Error('WebDAV 服务地址格式不正确');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('WebDAV 服务地址必须以 http:// 或 https:// 开头');
  }

  if (!config.username.trim()) {
    throw new Error('请填写 WebDAV 用户名');
  }

  if (!config.password) {
    throw new Error('请填写 WebDAV 密码或应用密码');
  }

  if (!normalizeRemotePath(config.remotePath)) {
    throw new Error('请填写云端文件路径');
  }
}

async function requestWebDav(
  config: WebDavConfig,
  remotePath: string,
  init: RequestInit,
  acceptedStatuses: number[] = [],
): Promise<Response> {
  validateWebDavConfig(config);

  const headers = new Headers(init.headers);
  const proxyHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    proxyHeaders[key] = value;
  });

  let response: Response;
  try {
    response = await fetch(WEBDAV_PROXY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        serverUrl: config.serverUrl,
        username: config.username,
        password: config.password,
        remotePath,
        method: init.method ?? 'GET',
        headers: proxyHeaders,
        body: typeof init.body === 'string' ? init.body : undefined,
      }),
    });
  } catch {
    throw new Error(
      '无法连接 WebDAV 代理。请确认本地开发服务器正在运行，或线上环境已提供 /api/webdav 接口。',
    );
  }

  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    let detail = response.statusText;
    try {
      const contentType = response.headers.get('Content-Type') ?? '';
      if (contentType.includes('application/json')) {
        const payload = (await response.clone().json()) as { error?: string };
        detail = payload.error || detail;
      }
    } catch {
      // 保留原始状态文本。
    }

    if (response.status === 404) {
      throw new Error('未找到 /api/webdav 代理接口。请重启本地开发服务器后再试。');
    }

    throw new Error(`WebDAV 请求失败：${response.status} ${detail}`);
  }

  return response;
}

async function ensureRemoteDirectory(config: WebDavConfig) {
  const pathParts = normalizeRemotePath(config.remotePath).split('/').filter(Boolean);
  pathParts.pop();

  let current = '';
  for (const part of pathParts) {
    current += `${part}/`;
    await requestWebDav(config, current, { method: 'MKCOL' }, [200, 201, 405, 409]);
  }
}

function hasAppDataShape(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.transactions) &&
    Array.isArray(candidate.budgets) &&
    Array.isArray(candidate.loans) &&
    Array.isArray(candidate.loanPayments) &&
    Array.isArray(candidate.incomeSources) &&
    Array.isArray(candidate.goals) &&
    !!candidate.settings &&
    typeof candidate.settings === 'object'
  );
}

function parseCloudSnapshot(raw: string, fallbackUpdatedAt: string): CloudSnapshot {
  const parsed = JSON.parse(raw) as unknown;

  if (hasAppDataShape(parsed)) {
    return {
      schema: SNAPSHOT_SCHEMA,
      updatedAt: fallbackUpdatedAt,
      data: parsed,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('云端文件不是有效的 JSON 对象');
  }

  const candidate = parsed as Record<string, unknown>;
  if (candidate.schema !== SNAPSHOT_SCHEMA) {
    throw new Error('云端文件不是本应用的 WebDAV 同步文件');
  }

  if (typeof candidate.updatedAt !== 'string' || !hasAppDataShape(candidate.data)) {
    throw new Error('云端同步文件格式不正确');
  }

  return {
    schema: SNAPSHOT_SCHEMA,
    updatedAt: candidate.updatedAt,
    data: candidate.data,
  };
}

export async function testWebDavConnection(config: WebDavConfig): Promise<boolean> {
  const normalized = normalizeConfig(config);
  await ensureRemoteDirectory(normalized);
  const response = await requestWebDav(
    normalized,
    normalized.remotePath,
    { method: 'GET' },
    [404],
  );
  return response.status !== 404;
}

export async function downloadCloudSnapshot(
  config: WebDavConfig,
): Promise<CloudSnapshot | null> {
  const normalized = normalizeConfig(config);
  const response = await requestWebDav(
    normalized,
    normalized.remotePath,
    { method: 'GET' },
    [404],
  );

  if (response.status === 404) return null;

  const lastModified = response.headers.get('Last-Modified');
  const lastModifiedTime = lastModified ? Date.parse(lastModified) : NaN;
  const fallbackUpdatedAt = Number.isFinite(lastModifiedTime)
    ? new Date(lastModifiedTime).toISOString()
    : nowIso();
  return parseCloudSnapshot(await response.text(), fallbackUpdatedAt);
}

export async function uploadCloudSnapshot(
  config: WebDavConfig,
  data: AppData,
  updatedAt = nowIso(),
): Promise<CloudSnapshot> {
  const normalized = normalizeConfig(config);
  const snapshot: CloudSnapshot = {
    schema: SNAPSHOT_SCHEMA,
    updatedAt,
    data,
  };

  await ensureRemoteDirectory(normalized);
  await requestWebDav(normalized, normalized.remotePath, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(snapshot, null, 2),
  });

  saveWebDavSyncMeta({
    ...loadWebDavSyncMeta(),
    lastSyncAt: nowIso(),
    lastLocalChangeAt: updatedAt,
    lastRemoteUpdatedAt: updatedAt,
    lastResult: 'uploaded',
  });

  return snapshot;
}

export function compareIsoTime(a: string, b: string): number {
  const timeA = Date.parse(a);
  const timeB = Date.parse(b);
  if (!Number.isFinite(timeA) || !Number.isFinite(timeB)) return a.localeCompare(b);
  return timeA - timeB;
}
