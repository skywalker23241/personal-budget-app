import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

interface WebDavProxyPayload {
  serverUrl?: string;
  username?: string;
  password?: string;
  remotePath?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

const ALLOWED_WEBDAV_METHODS = new Set(['GET', 'PUT', 'MKCOL', 'HEAD']);

function normalizeRemotePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/^\/+/, '');
}

function encodeRemotePath(path: string): string {
  return normalizeRemotePath(path)
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

function buildWebDavUrl(serverUrl: string, remotePath: string): string {
  const base = serverUrl.trim().replace(/\/+$/, '') + '/';
  return new URL(encodeRemotePath(remotePath), base).toString();
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('请求体过大'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>,
) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function validateProxyPayload(payload: WebDavProxyPayload) {
  if (!payload.serverUrl) throw new Error('缺少 WebDAV 服务地址');
  if (!payload.username) throw new Error('缺少 WebDAV 用户名');
  if (!payload.password) throw new Error('缺少 WebDAV 密码或应用密码');
  if (!payload.remotePath) throw new Error('缺少云端文件路径');

  const url = new URL(payload.serverUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('WebDAV 服务地址必须以 http:// 或 https:// 开头');
  }

  const method = (payload.method ?? 'GET').toUpperCase();
  if (!ALLOWED_WEBDAV_METHODS.has(method)) {
    throw new Error(`不支持的 WebDAV 方法：${method}`);
  }

  return method;
}

function webDavDevProxyPlugin(): Plugin {
  return {
    name: 'personal-budget-webdav-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/webdav', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'WebDAV 代理只接受 POST 请求' });
          return;
        }

        try {
          const payload = JSON.parse(await readRequestBody(req)) as WebDavProxyPayload;
          const method = validateProxyPayload(payload);
          const remoteUrl = buildWebDavUrl(payload.serverUrl ?? '', payload.remotePath ?? '');
          const headers = new Headers(payload.headers);
          headers.set(
            'Authorization',
            `Basic ${Buffer.from(`${payload.username}:${payload.password}`).toString('base64')}`,
          );

          const remoteResponse = await fetch(remoteUrl, {
            method,
            headers,
            body: method === 'GET' || method === 'HEAD' ? undefined : payload.body,
          });

          res.statusCode = remoteResponse.status;
          res.statusMessage = remoteResponse.statusText;
          for (const headerName of ['content-type', 'last-modified', 'etag']) {
            const headerValue = remoteResponse.headers.get(headerName);
            if (headerValue) res.setHeader(headerName, headerValue);
          }

          if (method === 'HEAD') {
            res.end();
            return;
          }

          const buffer = Buffer.from(await remoteResponse.arrayBuffer());
          res.end(buffer);
        } catch (error) {
          sendJson(res, 502, {
            error: error instanceof Error ? error.message : 'WebDAV 代理请求失败',
          });
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), webDavDevProxyPlugin()],
  resolve: {
    alias: {
      // 与 tsconfig.json 的 paths 保持一致，让 Vite 也能解析 "@/..."
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        // 拆分较大的第三方库，优化首屏加载
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
