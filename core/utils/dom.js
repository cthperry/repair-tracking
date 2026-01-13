/**
 * utils/dom.js
 * DOM 操作共用工具（集中 query / 事件委派，減少重複 DOM query）
 */
(function () {
  'use strict';

  function qs(sel, root = document) {
    return root ? root.querySelector(sel) : null;
  }

  function qsa(sel, root = document) {
    return root ? Array.from(root.querySelectorAll(sel)) : [];
  }

  function on(el, event, handler, opts) {
    if (!el) return;
    el.addEventListener(event, handler, opts);
  }

  /**
   * 常用：依欄位 name 取表單元素（含 select/textarea/input）
   */
  function byName(formEl, name) {
    if (!formEl || !name) return null;
    try {
      return formEl.querySelector(`[name="${CSS.escape(String(name))}"]`);
    } catch (_) {
      // 舊瀏覽器/環境沒有 CSS.escape
      return formEl.querySelector(`[name="${String(name).replace(/"/g, '\\"')}"]`);
    }
  }

  /**
   * 以 selector map 建立簡易快取：避免同一 render/流程內重複 query
   * cacheSelectors(root, { foo: '.a', bar: '#b' }) => { foo: Element|null, bar: Element|null }
   */
  function cacheSelectors(root, map) {
    const out = {};
    if (!root || !map) return out;
    for (const [k, sel] of Object.entries(map)) {
      out[k] = qs(sel, root);
    }
    return out;
  }

  /**
   * 事件委派：在 container 上監聽，透過 selector 找到最近的 target
   */
  function delegate(container, event, selector, handler, opts) {
    if (!container) return;
    container.addEventListener(event, (e) => {
      const target = e.target && e.target.closest ? e.target.closest(selector) : null;
      if (target && container.contains(target)) handler(e, target);
    }, opts);
  }

  window.DomUtils = Object.assign(window.DomUtils || {}, {
    qs,
    qsa,
    on,
    delegate,
    byName,
    cacheSelectors,
  });
})();
