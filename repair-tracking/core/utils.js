/**
 * core/utils.js
 * 共用工具（輕量、可重用、避免重複實作）
 *
 * 設計原則：
 * - 不引入外部依賴
 * - 以「可漸進導入」方式提供（舊程式碼不必一次全改）
 * - 對 UI/service 常見的重複邏輯做集中：日期、時間、service readiness
 */

(function () {
  'use strict';

  const TZ = 'Asia/Taipei';

  // ==========================
  // Date/Time
  // ==========================
  let _fmtDateKey = null;

  function _getFmtDateKey() {
    if (_fmtDateKey) return _fmtDateKey;
    try {
      _fmtDateKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (_) {
      _fmtDateKey = null;
    }
    return _fmtDateKey;
  }

  /**
   * 將 ISO/number/Date 轉為 epoch(ms)。無效回傳 0。
   * 優先使用 TimeUtils.toEpoch / window.toEpoch（若存在）。
   */
  function toMs(value) {
    try {
      if (window.TimeUtils && typeof window.TimeUtils.toEpoch === 'function') {
        return window.TimeUtils.toEpoch(value, 0);
      }
      if (typeof window.toEpoch === 'function') {
        return window.toEpoch(value, 0);
      }
      if (value instanceof Date) return value.getTime();
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const t = Date.parse(String(value ?? ''));
      return Number.isFinite(t) ? t : 0;
    } catch (_) {
      return 0;
    }
  }

  /**
   * 取得 Asia/Taipei 的日期 Key（YYYYMMDD）
   */
  function getTaipeiDateKey(date = new Date()) {
    try {
      const fmt = _getFmtDateKey();
      if (fmt && typeof fmt.formatToParts === 'function') {
        const parts = fmt.formatToParts(date);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const d = parts.find(p => p.type === 'day')?.value;
        if (y && m && d) return `${y}${m}${d}`;
      }
    } catch (_) {}

    // fallback: UTC ISO date (避免丟例外)
    try {
      const d = (date instanceof Date) ? date : new Date();
      return d.toISOString().slice(0, 10).replace(/-/g, '');
    } catch (_) {
      return '19700101';
    }
  }

  // ==========================
  // Array helpers
  // ==========================
  function pickLatest(list, getTime) {
    try {
      const arr = Array.isArray(list) ? list : [];
      if (!arr.length) return null;

      const timeFn = (typeof getTime === 'function')
        ? getTime
        : (x => toMs(x?.updatedAt ?? x?.createdAt));

      let best = null;
      let bestT = -1;
      for (const x of arr) {
        if (!x) continue;
        const t = timeFn(x);
        if (t > bestT) { bestT = t; best = x; }
      }
      return best;
    } catch (_) {
      return null;
    }
  }

  // ==========================
  // Service readiness（避免重複 init/loadAll）
  // ==========================
  const _readyFlags = Object.create(null);

  async function ensureServiceReady(serviceName, opts = {}) {
    const name = (serviceName || '').toString();
    if (!name) return false;

    const key = `${name}::ready`;
    if (_readyFlags[key]) return true;

    const svc = (typeof window._svc === 'function')
      ? window._svc(name)
      : window[name];

    if (!svc) return false;

    try {
      if (typeof svc.init === 'function' && !svc.isInitialized) {
        await svc.init();
      }
      const shouldLoadAll = (opts && 'loadAll' in opts) ? !!opts.loadAll : true;
      if (shouldLoadAll && typeof svc.loadAll === 'function') {
        if (!svc.__loadedOnce) {
          await svc.loadAll();
          svc.__loadedOnce = true;
        }
      }
      _readyFlags[key] = true;
      return true;
    } catch (e) {
      console.warn(`Utils.ensureServiceReady(${name}) failed`, e);
      return false;
    }
  }

  window.Utils = Object.assign(window.Utils || {}, {
    getTaipeiDateKey,
    pickLatest,
    ensureServiceReady,
  });

  // ==========================
  // Compatibility aliases (P2)
  // ==========================
  if (window.StringUtils) {
    window.Utils.escapeHTML = window.StringUtils.escapeHTML;
    window.Utils.escapeAttr = window.StringUtils.escapeAttr;
  }
  if (window.TimeUtils) {
    window.Utils.toEpoch = window.TimeUtils.toEpoch;
  }
})();
