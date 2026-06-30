import { Buffer } from 'node:buffer';

const ALLOWED_WEBDAV_METHODS = new Set(['GET', 'PUT', 'MKCOL', 'HEAD']);
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;

function normalizeRemotePath(path) {
  return path.trim().replace(/\\/g, '/').replace(/^\/+/, '');
}

function encodeRemotePath(path) {
  return normalizeRemotePath(path)
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

function buildWebDavUrl(serverUrl, remotePath) {
  const base = serverUrl.trim().replace(/\/+$/, '') + '/';
  return new URL(encodeRemotePath(remotePath), base).toString();
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function validateProxyPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('请求体格式不正确');
  }

  if (!payload.serverUrl) throw new Error('缺少 WebDAV 服务地址');
  if (!payload.username) throw new Error('缺少 WebDAV 用户名');
  if (!payload.password) throw new Error('缺少 WebDAV 密码或应用密码');
  if (!payload.remotePath) throw new Error('缺少云端文件路径');

  const url = new URL(payload.serverUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('WebDAV 服务地址必须以 http:// 或 https:// 开头');
  }

  const allowedHostSetting =
    globalThis.Netlify?.env?.get?.('WEBDAV_ALLOWED_HOSTS') ||
    process.env.WEBDAV_ALLOWED_HOSTS ||
    '';
  const allowedHosts = allowedHostSetting
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (allowedHosts.length > 0 && !allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new Error(`当前部署不允许连接该 WebDAV 主机：${url.hostname}`);
  }

  const method = (payload.method || 'GET').toUpperCase();
  if (!ALLOWED_WEBDAV_METHODS.has(method)) {
    throw new Error(`不支持的 WebDAV 方法：${method}`);
  }

  return method;
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'WebDAV 代理只接受 POST 请求' });
  }

  let payload;
  try {
    const requestText = await request.text();
    if (new TextEncoder().encode(requestText).byteLength > MAX_REQUEST_BODY_BYTES) {
      return jsonResponse(413, { error: '请求体过大' });
    }
    payload = JSON.parse(requestText);
  } catch {
    return jsonResponse(400, { error: '请求体不是有效的 JSON' });
  }

  try {
    const method = validateProxyPayload(payload);
    const remoteUrl = buildWebDavUrl(payload.serverUrl, payload.remotePath);
    const headers = new Headers(payload.headers || {});
    headers.delete('host');
    headers.delete('content-length');
    headers.set(
      'Authorization',
      `Basic ${Buffer.from(`${payload.username}:${payload.password}`).toString('base64')}`,
    );

    const remoteResponse = await fetch(remoteUrl, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : payload.body,
    });

    const responseHeaders = new Headers();
    for (const headerName of ['content-type', 'last-modified', 'etag']) {
      const headerValue = remoteResponse.headers.get(headerName);
      if (headerValue) responseHeaders.set(headerName, headerValue);
    }

    if (method === 'HEAD' || remoteResponse.status === 204) {
      return new Response(null, {
        status: remoteResponse.status,
        statusText: remoteResponse.statusText,
        headers: responseHeaders,
      });
    }

    return new Response(await remoteResponse.arrayBuffer(), {
      status: remoteResponse.status,
      statusText: remoteResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return jsonResponse(502, {
      error: error instanceof Error ? error.message : 'WebDAV 代理请求失败',
    });
  }
}
