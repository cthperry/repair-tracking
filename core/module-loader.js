/**
 * Module Loader（延遲載入 UI/Controller/CSS）
 * V161.184
 *
 * 目的：
 * - 初次載入僅預載 model/service（資料層）
 * - UI / Controller / Feature CSS 依「切換模組」才載入
 *
 * 注意：
 * - 不使用 fetch()；改用 DOM 注入 script/link，降低 file:// 限制影響
 * - CSS 載入加入 timeout 保底，避免少數瀏覽器 link.onload 不觸發導致卡死
 */
(function () {
  'use strict';

  const _loadedScripts = new Set();
  const _loadedStyles = new Set();
  const _inflight = new Map();

  function _loadStyle(href, timeoutMs = 2500) {
    if (!href) return Promise.resolve();
    if (_loadedStyles.has(href)) return Promise.resolve();

    const key = 'style:' + href;
    if (_inflight.has(key)) return _inflight.get(key);

    const p = new Promise((resolve, reject) => {
      const el = document.createElement('link');
      el.rel = 'stylesheet';
      el.href = href;

      const t = setTimeout(() => {
        // 保底：避免卡死，超時視為成功（CSS 不阻斷功能）
        _loadedStyles.add(href);
        resolve();
      }, timeoutMs);

      el.onload = () => {
        clearTimeout(t);
        _loadedStyles.add(href);
        resolve();
      };
      el.onerror = () => {
        clearTimeout(t);
        reject(new Error('CSS 載入失敗：' + href));
      };

      document.head.appendChild(el);
    });

    _inflight.set(key, p);
    return p.finally(() => _inflight.delete(key));
  }

  function _loadScript(src, timeoutMs = 8000) {
    if (!src) return Promise.resolve();
    if (_loadedScripts.has(src)) return Promise.resolve();

    const key = 'script:' + src;
    if (_inflight.has(key)) return _inflight.get(key);

    const p = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = false; // 保持載入順序

      const t = setTimeout(() => {
        reject(new Error('Script 載入逾時：' + src));
      }, timeoutMs);

      el.onload = () => {
        clearTimeout(t);
        _loadedScripts.add(src);
        resolve();
      };
      el.onerror = () => {
        clearTimeout(t);
        reject(new Error('Script 載入失敗：' + src));
      };

      document.head.appendChild(el);
    });

    _inflight.set(key, p);
    return p.finally(() => _inflight.delete(key));
  }

  // route -> UI/controller/css（僅 UI 層延遲，model/service 仍維持預載）
  const manifest = {
    dashboard: {
      styles: ["features/dashboard/dashboard.css"],
      scripts: ["features/dashboard/dashboard.ui.js", "features/dashboard/dashboard.controller.js"]
    },
    repairs: {
      styles: ['features/repairs/repairs.css', 'features/worklogs/worklog.css'],
      scripts: ['features/worklogs/worklog.ui.js', 'features/repairs/repairs.ui.js', 'features/repairs/repairs.ui-forms.js', 'features/repairs/repairs.controller.js']
    },
    machines: {
      styles: ['features/machines/machines.css'],
      scripts: ['features/machines/machines.ui.js', 'features/machines/machines.controller.js']
    },
    maintenance: {
      styles: ['features/maintenance/maintenance.css'],
      scripts: ['features/maintenance/maintenance.ui.js', 'features/maintenance/maintenance.controller.js']
    },
    customers: {
      styles: ['features/customers/customers.css'],
      scripts: ['features/customers/customers.ui.js', 'features/customers/customers.ui-forms.js', 'features/customers/customers.controller.js']
    },
    parts: {
      styles: ['features/parts/parts.css'],
      scripts: ['features/parts/parts.ui.js', 'features/parts/parts.controller.js']
    },
    quotes: {
      styles: ['features/quotes/quotes.css'],
      scripts: ['features/quotes/quotes.ui.js', 'features/quotes/quotes.controller.js']
    },
    orders: {
      styles: ['features/orders/orders.css'],
      scripts: ['features/orders/orders.ui.js', 'features/orders/orders.controller.js']
    },
    kb: {
      styles: ['features/kb/kb.css'],
      scripts: ['features/kb/kb.ui.js', 'features/kb/kb.controller.js']
    },
    weekly: {
      styles: ['features/weekly/weekly.css'],
      scripts: ['features/weekly/weekly.ui.js', 'features/weekly/weekly.controller.js']
    },
    guide: {
      styles: ['features/guide/guide.css'],
      scripts: ['features/guide/guide.ui.js', 'features/guide/guide.controller.js']
    },
    settings: {
      styles: ['features/settings/settings.css'],
      scripts: ['features/settings/settings.ui.js', 'features/settings/settings.controller.js']
    }
  };

  async function ensure(route) {
    const r = (route || '').toString().trim();
    const m = manifest[r];
    if (!m) return;

    const styles = Array.isArray(m.styles) ? m.styles : [];
    for (const href of styles) await _loadStyle(href);

    const scripts = Array.isArray(m.scripts) ? m.scripts : [];
    for (const src of scripts) await _loadScript(src);
  }

  window.ModuleLoader = {
    ensure,
    manifest,
    _loadedScripts,
    _loadedStyles
  };
})();
