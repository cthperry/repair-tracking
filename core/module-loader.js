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

  function _buildVer(){
    try {
      return (
        window.AppConfig?.BUILD_NUMBER ||
        window.AppConfig?.system?.buildNumber ||
        window.AppConfig?.system?.BUILD_NUMBER ||
        ''
      ).toString().trim();
    } catch (_) {
      return '';
    }
  }

  // 避免瀏覽器快取導致「更新未生效」：僅在 http/https 下加入 query 版號
  function _withVer(url){
    try {
      if (!url) return url;
      if (location && location.protocol === 'file:') return url;
      const ver = _buildVer();
      if (!ver) return url;
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}v=${encodeURIComponent(ver)}`;
    } catch (_) {
      return url;
    }
  }

  function _loadStyle(href, timeoutMs = 2500) {
    if (!href) return Promise.resolve();
    const finalHref = _withVer(href);
    if (_loadedStyles.has(finalHref)) return Promise.resolve();

    const key = 'style:' + finalHref;
    if (_inflight.has(key)) return _inflight.get(key);

    const p = new Promise((resolve, reject) => {
      const el = document.createElement('link');
      el.rel = 'stylesheet';
      el.href = finalHref;

      const t = setTimeout(() => {
        // 保底：避免卡死，超時視為成功（CSS 不阻斷功能）
        _loadedStyles.add(finalHref);
        resolve();
      }, timeoutMs);

      el.onload = () => {
        clearTimeout(t);
        _loadedStyles.add(finalHref);
        resolve();
      };
      el.onerror = () => {
        clearTimeout(t);
        reject(new Error('CSS 載入失敗：' + finalHref));
      };

      document.head.appendChild(el);
    });

    _inflight.set(key, p);
    return p.finally(() => _inflight.delete(key));
  }

  function _loadScript(src, timeoutMs = 8000) {
    if (!src) return Promise.resolve();
    const finalSrc = _withVer(src);
    if (_loadedScripts.has(finalSrc)) return Promise.resolve();

    const key = 'script:' + finalSrc;
    if (_inflight.has(key)) return _inflight.get(key);

    const p = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = finalSrc;
      el.async = false; // 保持載入順序

      const t = setTimeout(() => {
        reject(new Error('Script 載入逾時：' + finalSrc));
      }, timeoutMs);

      el.onload = () => {
        clearTimeout(t);
        _loadedScripts.add(finalSrc);
        resolve();
      };
      el.onerror = () => {
        clearTimeout(t);
        reject(new Error('Script 載入失敗：' + finalSrc));
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
      styles: ['features/repairs/repairs.css', 'features/worklogs/worklog.css', 'features/timeline/activity-timeline.css'],
      scripts: ['features/timeline/activity-timeline.js', 'features/worklogs/worklog.ui.js', 'features/repairs/repairs.ui.js', 'features/repairs/repairs.ui-forms.js', 'features/repairs/repairs.controller.js']
    },
    machines: {
      styles: ['features/machines/machines.css'],
      scripts: ['features/machines/machines.ui.js', 'features/machines/machines.controller.js']
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
    sops: {
      styles: ['features/sops/sops.css'],
      scripts: ['features/sops/sops.ui.js', 'features/sops/sops.controller.js']
    },
    analytics: {
      styles: ['features/analytics/analytics.css'],
      scripts: ['features/analytics/analytics.ui.js', 'features/analytics/analytics.controller.js']
    },
    phase3: {
      styles: ['features/quick-create/quick-create.css'],
      scripts: ['features/quick-create/quick-create.js']
    },
    weekly: {
      styles: ['features/weekly/weekly.css'],
      scripts: ['features/weekly/weekly.ui.js', 'features/weekly/weekly.controller.js']
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

    // CSS 之間沒有相依性，並行載入可節省累積等待時間（P2-1）
    const styles = Array.isArray(m.styles) ? m.styles : [];
    await Promise.all(styles.map(href => _loadStyle(href)));

    // JS 維持依序載入，確保執行順序（model → service → ui → controller）
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
