/**
 * SOP Upload Proxy (for Apps Script Web App)
 *
 * 用途：解決 Apps Script Web App 無法設定 CORS header，導致瀏覽器端 fetch 被擋的問題。
 * 作法：前端改呼叫本機/伺服器端 proxy，由 proxy 轉送到 Apps Script，再把結果回傳給前端。
 *
 * 預設：http://localhost:8787/upload
 *
 * 需求：Node.js >= 18（內建 fetch）
 */

const http = require('http');

const PORT = Number(process.env.PORT || 8787);

function send(res, code, obj) {
  const body = JSON.stringify(obj || {});
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => {
      buf += c;
      // 防呆：避免被巨大 payload 撐爆
      if (buf.length > 12 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        try { req.destroy(); } catch (_) {}
      }
    });
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function forwardToAppsScript(payload) {
  const uploadUrl = String(payload.uploadUrl || '').trim();
  if (!uploadUrl) throw new Error('缺少 uploadUrl');

  // 只允許轉送必要欄位
  const body = {
    token: String(payload.token || '').trim(),
    path: String(payload.path || '').trim(),
    filename: String(payload.filename || '').trim(),
    mimeType: String(payload.mimeType || 'application/octet-stream').trim(),
    base64: String(payload.base64 || '')
  };

  if (!body.token) throw new Error('缺少 token');
  if (!body.path) throw new Error('缺少 path');
  if (!body.filename) throw new Error('缺少 filename');
  if (!body.base64) throw new Error('缺少 base64');

  const r = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  let data = null;
  try {
    data = await r.json();
  } catch (_) {
    data = null;
  }

  if (!r.ok) {
    const msg = data?.error ? String(data.error) : `HTTP ${r.status}`;
    return { ok: false, error: msg };
  }
  return data || { ok: false, error: 'Apps Script 回傳非 JSON' };
}

const server = http.createServer(async (req, res) => {
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600'
      });
      return res.end();
    }

    if (req.method !== 'POST') {
      return send(res, 404, { ok: false, error: 'Not Found' });
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== '/upload') {
      return send(res, 404, { ok: false, error: 'Not Found' });
    }

    const payload = await readJson(req);
    const data = await forwardToAppsScript(payload);
    return send(res, 200, data);
  } catch (e) {
    return send(res, 400, { ok: false, error: String(e?.message || e || 'unknown') });
  }
});

server.listen(PORT, () => {
  console.log(`SOP Upload Proxy listening on http://localhost:${PORT}/upload`);
  console.log('Press Ctrl+C to stop.');
});
