/**
 * AppRegistry（P2-3）
 * 目的：降低跨模組對 window.* 的耦合，減少載入時序風險。
 * 原則：不改功能行為；registry 只提供更穩定的取得入口（並保留 window fallback）。
 */
(function () {
  'use strict';

  const _map = new Map();
  const _norm = (n) => (n || '').toString().trim();

  function register(name, obj) {
    const key = _norm(name);
    if (!key) return;
    _map.set(key, obj);
  }

  function get(name) {
    const key = _norm(name);
    if (!key) return null;
    if (_map.has(key)) return _map.get(key);
    try { if (typeof window !== 'undefined' && window[key]) return window[key]; } catch (_) {}
    return null;
  }

  function has(name) {
    const key = _norm(name);
    if (!key) return false;
    if (_map.has(key)) return true;
    try { return typeof window !== 'undefined' && !!window[key]; } catch (_) { return false; }
  }

  function list() {
    return Array.from(_map.keys());
  }

  if (typeof window !== 'undefined') {
    window.AppRegistry = { register, get, has, list };
    if (typeof window.getService !== 'function') {
      window.getService = function (name) { return get(name); };
    }
    if (typeof window._svc !== 'function') {
      // registry-first 取得服務；保留 window fallback 以維持相容性
      window._svc = function (name) { return get(name); };
    }
  }

  try { console.log('✅ AppRegistry loaded'); } catch (_) {}
})();