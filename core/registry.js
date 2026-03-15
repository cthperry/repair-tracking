/**
 * AppRegistry（P2-3）
 * 目的：降低跨模組對 window.* 的耦合，減少載入時序風險。
 * 原則：不改功能行為；Phase 1：Service 存取統一走 AppRegistry（禁止直接依賴 window.*Service）。
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
    return null;
  }

  function has(name) {
    const key = _norm(name);
    if (!key) return false;
    if (_map.has(key)) return true;
    return false;
  }

  function list() {
    return Array.from(_map.keys());
  }

  // Phase 1：集中化 Service 初始化（避免各 Controller 重複手動 init/loadAll）
  // - names 可為字串或陣列
  // - 預設會：init（若存在且尚未 isInitialized）+ loadAll（若存在且尚未 __loadedOnce）
  const _readyFlags = Object.create(null);

  // 並行去重：相同 key 的進行中 Promise。避免兩個 Controller 同時 ensureReady
  // 同一個 Service 造成 init()/loadAll() 被呼叫兩次（競態 double-init）。
  const _pendingReady = Object.create(null);

  async function ensureReady(names, opts = {}) {
    const arr = Array.isArray(names) ? names : [names];
    const loadAll = (opts && Object.prototype.hasOwnProperty.call(opts, 'loadAll')) ? !!opts.loadAll : true;

    for (const n of arr) {
      const name = _norm(n);
      if (!name) continue;
      const key = `${name}::ready`;

      // 已完成 → 跳過
      if (_readyFlags[key]) continue;

      // 正在進行中 → 等待同一個 Promise（避免重複初始化）
      if (_pendingReady[key]) {
        await _pendingReady[key];
        continue;
      }

      const svc = get(name);
      if (!svc) continue;

      // 建立並儲存這次初始化的 Promise（並行呼叫方可直接 await）
      _pendingReady[key] = (async () => {
        try {
          if (typeof svc.init === 'function' && !svc.isInitialized) {
            await svc.init();
          }
          if (loadAll && typeof svc.loadAll === 'function') {
            if (!svc.__loadedOnce) {
              await svc.loadAll();
              svc.__loadedOnce = true;
            }
          }
          _readyFlags[key] = true;
        } catch (e) {
          try { console.warn(`AppRegistry.ensureReady(${name}) failed`, e); } catch (_) {}
        } finally {
          // 無論成功或失敗都清除進行中旗標，讓下次重試可重新進入
          delete _pendingReady[key];
        }
      })();

      await _pendingReady[key];
    }

    return true;
  }

  if (typeof window !== 'undefined') {
    window.AppRegistry = { register, get, has, list, ensureReady };
    if (typeof window._svc !== 'function') {
      // Phase 1：Service 取得統一走 AppRegistry（禁止直接依賴 window.*Service）
      window._svc = function (name) { return get(name); };
    }
  }

  try { console.log('✅ AppRegistry loaded'); } catch (_) {}
})();