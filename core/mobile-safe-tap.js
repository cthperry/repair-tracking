/* =========================================================
   Phase 4.3 – 全系統 Mobile Safe Tap（不影響桌機）
   - 僅在行動裝置（coarse pointer / touch）啟用
   - touchend 時主動觸發 element.click() 以支援事件委派
   - 抑制後續 ghost click，避免重複觸發
   - 不做全域 stopPropagation，避免破壞既有 click 流程
   ========================================================= */
(function () {
  'use strict';

  function isMobileLike() {
    try {
      // coarse pointer：大多數手機/平板（觸控為主）
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
      // 避免影響桌機（含觸控筆電）：只有在「觸控 + 小螢幕」時才啟用
      if (navigator && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) {
        const w = (typeof window !== 'undefined') ? (window.innerWidth || 0) : 0;
        if (w && w <= 1024) return true;
        if (window.matchMedia && window.matchMedia('(max-width: 1024px)').matches) return true;
      }
    } catch (e) {}
    return false;
  }

  function isEditableTarget(target) {
    try {
      if (!target) return false;
      // 任何可輸入/可編輯的元件都不可攔截
      if (target.closest) {
        if (target.closest('input, textarea, select')) return true;
        if (target.closest('[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]')) return true;
      }
      const tag = (target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (target.isContentEditable) return true;
    } catch (_) {}
    return false;
  }

  if (!isMobileLike()) {
    // 桌機完全不做任何事，避免影響既有 click 事件模型
    window.MobileSafeTap = window.MobileSafeTap || { enabled: false };
    return;
  }

  var state = {
    lastTouchTs: 0,
    lastTouchEl: null,
    synthesizing: false
  };

  function closestActionEl(target) {
    if (!target || !target.closest) return null;
    // 覆蓋常見可點元素：button / a / .btn / .action-btn / [role=button]
    return target.closest('button, a, .btn, .action-btn, [role="button"], [data-action]');
  }

  // touchend → 主動觸發 click（會 bubble，能打到事件委派）
  document.addEventListener('touchend', function (e) {
    try {
      // ✅ 重要：輸入欄位 / 可編輯區塊不可攔截，否則會造成行動裝置無法輸入
      if (isEditableTarget(e.target)) return;

      var el = closestActionEl(e.target);
      if (!el) return;

      // 記錄本次 touch
      state.lastTouchTs = Date.now();
      state.lastTouchEl = el;

      // 若是 disabled / aria-disabled，就不觸發
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;

      // 避免把 click 合成到輸入元件（或其可編輯容器）
      if (isEditableTarget(el)) return;

      // 觸控情境下，阻止瀏覽器產生的 ghost click
      // 但不阻斷 bubble（我們改用合成 click 來走既有流程）
      e.preventDefault();

      state.synthesizing = true;
      // 走原生 click 流程（可觸發 addEventListener / onclick / delegation）
      el.click();
    } finally {
      state.synthesizing = false;
    }
  }, { passive: false });

  // 抑制 ghost click（只抑制 touch 後短時間內的「第二次 click」，不影響合成 click）
  document.addEventListener('click', function (e) {
    if (state.synthesizing) return; // 放行我們自己觸發的 click

    // ✅ 重要：輸入欄位 / 可編輯區塊不可做 ghost click 抑制
    if (isEditableTarget(e.target)) return;

    var now = Date.now();
    if (!state.lastTouchTs || (now - state.lastTouchTs) > 600) return;

    var el = closestActionEl(e.target);
    if (!el) return;

    // 同一元素在 touch 後又來一個 click → 視為 ghost click，抑制
    if (el === state.lastTouchEl) {
      e.preventDefault();
      // 這裡要用 stopImmediatePropagation，否則會讓同一次 click 走到既有 handler 造成雙觸發
      e.stopImmediatePropagation();
      state.lastTouchTs = 0;
      state.lastTouchEl = null;
    }
  }, true); // capture：優先攔截 ghost click

  window.MobileSafeTap = {
    enabled: true
  };
})();
