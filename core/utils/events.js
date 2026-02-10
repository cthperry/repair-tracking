/**
 * utils/events.js
 * 事件綁定共用工具（可選 AbortController）
 *
 * 目標：
 * - 減少重複綁定造成的記憶體/效能問題
 * - 讓「重新 render / 重新開啟 modal」時能可靠清理舊事件
 *
 * 使用方式：
 *   const ac = EventUtils.createController();
 *   EventUtils.on(el, 'click', handler, { capture: true }, ac);
 *   // 清理
 *   EventUtils.abort(ac);
 */
(function () {
  'use strict';

  let _supportsSignal = null;

  function supportsSignal() {
    if (_supportsSignal !== null) return _supportsSignal;
    try {
      if (typeof AbortController !== 'function') {
        _supportsSignal = false;
        return _supportsSignal;
      }
      const ac = new AbortController();
      const el = document.createElement('div');
      el.addEventListener('x', () => {}, { signal: ac.signal });
      ac.abort();
      _supportsSignal = true;
      return _supportsSignal;
    } catch (_) {
      _supportsSignal = false;
      return _supportsSignal;
    }
  }

  function createController() {
    try {
      if (typeof AbortController === 'function') return new AbortController();
    } catch (_) {}
    return null;
  }

  function abort(controller) {
    try {
      if (controller && typeof controller.abort === 'function') controller.abort();
    } catch (_) {}
  }

  /**
   * 綁定事件（可選 AbortController）。
   * @param {EventTarget} el
   * @param {string} event
   * @param {Function} handler
   * @param {object} opts
   * @param {AbortController|null} controller
   */
  function on(el, event, handler, opts, controller) {
    if (!el || !event || typeof handler !== 'function') return;

    // 優先用 signal（若環境支援）
    try {
      if (controller && controller.signal && supportsSignal()) {
        const o = Object.assign({}, (opts || {}), { signal: controller.signal });
        el.addEventListener(event, handler, o);
        return;
      }
    } catch (_) {
      // fallback below
    }

    try {
      el.addEventListener(event, handler, opts || false);
    } catch (_) {}
  }

  // 以 (element,event,key) 去重綁定：避免重複 render / init 時累積 listener
  const _uniqueMap = typeof WeakMap === 'function' ? new WeakMap() : null;

  function onUnique(el, event, key, handler, opts, controller) {
    if (!el || !event || typeof handler !== 'function') return;
    const k = String(key || '') || (event + ':' + (handler.name || 'handler'));

    try {
      if (_uniqueMap) {
        let rec = _uniqueMap.get(el);
        if (!rec) { rec = {}; _uniqueMap.set(el, rec); }
        const ek = event + '::' + k;
        if (rec[ek]) return;
        rec[ek] = true;
      } else {
        // fallback：在 element 上掛載最小標記
        const prop = '__evtUnique__';
        const rec = el[prop] || (el[prop] = {});
        const ek = event + '::' + k;
        if (rec[ek]) return;
        rec[ek] = true;
      }
    } catch (_) {}

    on(el, event, handler, opts, controller);
  }

  window.EventUtils = Object.assign(window.EventUtils || {}, {
    supportsSignal,
    createController,
    abort,
    on,
    onUnique,
  });
})();
