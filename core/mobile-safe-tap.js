/* =========================================================
   Phase 4.3 – 全系統 Mobile Safe Tap（不影響桌機）
   - 僅在手機 / 平板等觸控主導情境啟用
   - 只有「短按」才主動觸發 click，避免滑動/拖曳誤判
   - 抑制 touch 後的 ghost click，避免穿透到下層案例/按鈕
   - 不做全域 stopPropagation，避免破壞既有 click 流程
   ========================================================= */
(function () {
  'use strict';

  function isMobileLike() {
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
      if (navigator && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) {
        if (window.matchMedia && window.matchMedia('(hover: none)').matches) return true;
        if (typeof window.innerWidth === 'number' && window.innerWidth <= 1024) return true;
      }
    } catch (e) {}
    return false;
  }

  if (!isMobileLike()) {
    window.MobileSafeTap = window.MobileSafeTap || { enabled: false };
    return;
  }

  var MOVE_THRESHOLD = 12;
  var GHOST_CLICK_MS = 700;
  var GHOST_CLICK_DISTANCE = 28;

  var state = {
    lastTouchTs: 0,
    lastTouchEl: null,
    lastTouchX: 0,
    lastTouchY: 0,
    touchStartX: 0,
    touchStartY: 0,
    touchMoved: false,
    touchActive: false,
    synthesizing: false
  };

  function getPoint(evt) {
    var point = (evt && evt.changedTouches && evt.changedTouches[0])
      || (evt && evt.touches && evt.touches[0])
      || evt
      || {};
    return {
      x: Number(point.clientX) || 0,
      y: Number(point.clientY) || 0
    };
  }

  function resetGestureState() {
    state.touchActive = false;
    state.touchMoved = false;
    state.touchStartX = 0;
    state.touchStartY = 0;
  }

  function clearGhostState() {
    state.lastTouchTs = 0;
    state.lastTouchEl = null;
    state.lastTouchX = 0;
    state.lastTouchY = 0;
  }

  function isEditableEl(el) {
    if (!el || !el.tagName) return false;
    var tag = String(el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'option') return true;
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return true;
    return false;
  }

  function closestActionEl(target) {
    if (!target || !target.closest) return null;
    return target.closest('button, a, .btn, .action-btn, [role="button"], [data-action]');
  }

  document.addEventListener('touchstart', function (e) {
    try {
      if (e.touches && e.touches.length > 1) {
        resetGestureState();
        return;
      }
      var p = getPoint(e);
      state.touchActive = true;
      state.touchMoved = false;
      state.touchStartX = p.x;
      state.touchStartY = p.y;
    } catch (_) {}
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    try {
      if (!state.touchActive) return;
      var p = getPoint(e);
      if (Math.abs(p.x - state.touchStartX) > MOVE_THRESHOLD || Math.abs(p.y - state.touchStartY) > MOVE_THRESHOLD) {
        state.touchMoved = true;
      }
    } catch (_) {}
  }, { passive: true });

  document.addEventListener('touchcancel', function () {
    resetGestureState();
    clearGhostState();
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    var p = getPoint(e);
    var actionEl = null;

    try {
      actionEl = closestActionEl(e.target);

      if (!actionEl && !state.touchMoved) return;

      // 無論是否合成 click，都先記錄本次 touch 位置，用來擋掉後續 ghost click。
      state.lastTouchTs = Date.now();
      state.lastTouchEl = actionEl || e.target || null;
      state.lastTouchX = p.x;
      state.lastTouchY = p.y;

      // 滑動 / 拖曳後放開，不應視為點擊。
      if (state.touchMoved) return;
      if (!actionEl) return;

      if (actionEl.disabled || actionEl.getAttribute('aria-disabled') === 'true') return;
      if (isEditableEl(e.target) || isEditableEl(actionEl)) return;
      if (typeof actionEl.isConnected !== 'undefined' && !actionEl.isConnected) return;

      e.preventDefault();
      state.synthesizing = true;
      actionEl.click();
    } finally {
      state.synthesizing = false;
      resetGestureState();
    }
  }, { passive: false });

  document.addEventListener('click', function (e) {
    if (state.synthesizing) return;

    var now = Date.now();
    if (!state.lastTouchTs || (now - state.lastTouchTs) > GHOST_CLICK_MS) return;

    var p = getPoint(e);
    var nearTouch = Math.abs(p.x - state.lastTouchX) <= GHOST_CLICK_DISTANCE
      && Math.abs(p.y - state.lastTouchY) <= GHOST_CLICK_DISTANCE;

    if (!nearTouch) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    clearGhostState();
  }, true);

  window.MobileSafeTap = {
    enabled: true,
    moveThreshold: MOVE_THRESHOLD,
    ghostClickMs: GHOST_CLICK_MS,
    ghostClickDistance: GHOST_CLICK_DISTANCE
  };
})();
