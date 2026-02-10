/*
 * Core UI Helpers (Toast / Confirm)
 * V161.079
 * 目標：
 * - 取代原生 alert/confirm（較醜、阻塞、在 Mobile 體感不佳）
 * - 不改流程邏輯，只改善視覺與互動一致性
 */

(function () {
  'use strict';

  const UI = (window.UI = window.UI || {});

  const escapeHtml = (window.StringUtils && typeof window.StringUtils.escapeHTML === 'function')
    ? window.StringUtils.escapeHTML
    : function escapeHtmlFallback(input) {
        const s = (input === undefined || input === null) ? '' : String(input);
        return s
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };

  function nl2br(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function getToastPosition() {
    try {
      return (window.AppConfig && window.AppConfig.ui && window.AppConfig.ui.toast && window.AppConfig.ui.toast.position)
        ? window.AppConfig.ui.toast.position
        : 'top-right';
    } catch (_) {
      return 'top-right';
    }
  }

  function ensureToastContainer() {
    let el = document.getElementById('ui-toast-container');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'ui-toast-container';
    el.className = 'toast-container';
    el.setAttribute('data-pos', getToastPosition());
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');

    document.body.appendChild(el);
    return el;
  }

  /**
   * UI.toast(message, {type, duration})
   * type: info | success | warning | error
   */
  UI.toast = function toast(message, options) {
    const opts = options || {};
    const type = (opts.type || 'info').toString();

    const duration = Number.isFinite(+opts.duration)
      ? Math.max(800, +opts.duration)
      : (window.AppConfig && window.AppConfig.ui && window.AppConfig.ui.toast ? window.AppConfig.ui.toast.duration : 3000);

    try {
      const container = ensureToastContainer();
      // position 可能在設定中被修改，動態更新
      container.setAttribute('data-pos', getToastPosition());

      const toastEl = document.createElement('div');
      toastEl.className = `toast toast--${type}`;

      const icon = (type === 'success') ? '✅' :
                   (type === 'warning') ? '⚠️' :
                   (type === 'error') ? '⛔' : 'ℹ️';

      toastEl.innerHTML = `
        <div class="toast__icon" aria-hidden="true">${icon}</div>
        <div class="toast__msg">${nl2br(message)}</div>
        <button class="toast__close" type="button" aria-label="關閉">×</button>
      `.trim();

      const closeBtn = toastEl.querySelector('.toast__close');
      const remove = () => {
        try {
          toastEl.classList.add('toast--out');
          setTimeout(() => toastEl.remove(), 180);
        } catch (_) {
          try { toastEl.remove(); } catch (_) {}
        }
      };

      if (closeBtn) closeBtn.addEventListener('click', remove);

      container.appendChild(toastEl);
      // 自動移除
      const t = window.setTimeout(remove, duration);
      // 使用者 hover 時稍微延長，避免讀不到
      toastEl.addEventListener('mouseenter', () => { try { clearTimeout(t); } catch (_) {} });
      toastEl.addEventListener('mouseleave', () => { try { window.setTimeout(remove, 900); } catch (_) {} });
      return;
    } catch (e) {
      // 最後備援：避免 UI.toast 本身出錯造成流程中斷
      try { window.alert(message); } catch (_) {}
    }
  };

  /**
   * UI.confirm({title, message, okText, cancelText, tone}) -> Promise<boolean>
   * tone: default | danger
   */
  UI.confirm = function confirmModal(options) {
    const opts = options || {};
    const title = (opts.title || '確認').toString();
    const message = (opts.message || '').toString();
    const okText = (opts.okText || '確定').toString();
    const cancelText = (opts.cancelText || '取消').toString();
    const tone = (opts.tone || 'default').toString();

    // 若環境不支援（極少），回退原生 confirm
    if (!document || !document.body) {
      return Promise.resolve(!!window.confirm(message));
    }

    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.id = 'ui-confirm-modal';
      wrap.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
          <div class="modal-header">
            <div>
              <h3>${escapeHtml(title)}</h3>
              <div class="muted" style="margin-top:6px;">請確認後再繼續</div>
            </div>
            <button class="modal-close" type="button" aria-label="關閉">×</button>
          </div>
          <div class="modal-body">
            <div class="confirm-text">${nl2br(message)}</div>
          </div>
          <div class="modal-footer">
            <button class="btn ghost" type="button" data-act="cancel">${escapeHtml(cancelText)}</button>
            <button class="btn ${tone === 'danger' ? 'danger' : 'primary'}" type="button" data-act="ok">${escapeHtml(okText)}</button>
          </div>
        </div>
      `.trim();

      const close = (result) => {
        try { wrap.remove(); } catch (_) {}
        resolve(!!result);
      };

      const okBtn = wrap.querySelector('[data-act="ok"]');
      const cancelBtn = wrap.querySelector('[data-act="cancel"]');
      const closeBtn = wrap.querySelector('.modal-close');
      const backdrop = wrap.querySelector('.modal-backdrop');

      if (okBtn) okBtn.addEventListener('click', () => close(true));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(false));
      if (closeBtn) closeBtn.addEventListener('click', () => close(false));

      // backdrop / escape
      const closeOnBackdrop = !!(window.AppConfig && window.AppConfig.ui && window.AppConfig.ui.modal && window.AppConfig.ui.modal.closeOnBackdrop);
      if (backdrop && closeOnBackdrop) backdrop.addEventListener('click', () => close(false));

      const onKey = (e) => {
        try {
          if (e.key === 'Escape') {
            const closeOnEscape = !!(window.AppConfig && window.AppConfig.ui && window.AppConfig.ui.modal && window.AppConfig.ui.modal.closeOnEscape);
            if (closeOnEscape) close(false);
          }
          if (e.key === 'Enter') {
            // 避免在 textarea 也觸發：confirm 本身沒有 textarea，這裡直接 ok
            close(true);
          }
        } catch (_) {}
      };

      document.addEventListener('keydown', onKey, { once: true });
      document.body.appendChild(wrap);

      // Focus
      try { (okBtn || cancelBtn || closeBtn).focus(); } catch (_) {}
    });
  };

  /**
   * UI.prompt({
   *   title, message,
   *   label, placeholder, defaultValue,
   *   okText, cancelText,
   *   tone
   * }) -> Promise<string|null>
   *
   * - 回傳 trimmed 字串
   * - 取消/關閉回傳 null
   */
  UI.prompt = function promptModal(options) {
    const opts = options || {};
    const title = (opts.title || '輸入').toString();
    const message = (opts.message || '').toString();
    const label = (opts.label || '內容').toString();
    const placeholder = (opts.placeholder || '').toString();
    const defaultValue = (opts.defaultValue || '').toString();
    const okText = (opts.okText || '確定').toString();
    const cancelText = (opts.cancelText || '取消').toString();
    const tone = (opts.tone || 'default').toString();

    if (!document || !document.body) {
      try {
        const v = window.prompt(message || title, defaultValue);
        if (v === null || v === undefined) return Promise.resolve(null);
        const s = String(v).trim();
        return Promise.resolve(s);
      } catch (_) {
        return Promise.resolve(null);
      }
    }

    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.id = 'ui-prompt-modal';
      wrap.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
          <div class="modal-header">
            <div>
              <h3>${escapeHtml(title)}</h3>
              ${message ? `<div class="muted" style="margin-top:6px;">${nl2br(message)}</div>` : ''}
            </div>
            <button class="modal-close" type="button" aria-label="關閉">×</button>
          </div>
          <div class="modal-body">
            <div class="prompt-row">
              <label class="prompt-label">${escapeHtml(label)}</label>
              <input class="input prompt-input" type="text" autocomplete="off" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn ghost" type="button" data-act="cancel">${escapeHtml(cancelText)}</button>
            <button class="btn ${tone === 'danger' ? 'danger' : 'primary'}" type="button" data-act="ok">${escapeHtml(okText)}</button>
          </div>
        </div>
      `.trim();

      const close = (valueOrNull) => {
        try { wrap.remove(); } catch (_) {}
        resolve(valueOrNull);
      };

      const okBtn = wrap.querySelector('[data-act="ok"]');
      const cancelBtn = wrap.querySelector('[data-act="cancel"]');
      const closeBtn = wrap.querySelector('.modal-close');
      const backdrop = wrap.querySelector('.modal-backdrop');
      const input = wrap.querySelector('.prompt-input');

      const doOk = () => {
        const v = (input && typeof input.value === 'string') ? input.value.trim() : '';
        close(v);
      };

      if (okBtn) okBtn.addEventListener('click', doOk);
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
      if (closeBtn) closeBtn.addEventListener('click', () => close(null));

      const closeOnBackdrop = !!(window.AppConfig && window.AppConfig.ui && window.AppConfig.ui.modal && window.AppConfig.ui.modal.closeOnBackdrop);
      if (backdrop && closeOnBackdrop) backdrop.addEventListener('click', () => close(null));

      const onKey = (e) => {
        try {
          if (e.key === 'Escape') {
            const closeOnEscape = !!(window.AppConfig && window.AppConfig.ui && window.AppConfig.ui.modal && window.AppConfig.ui.modal.closeOnEscape);
            if (closeOnEscape) close(null);
          }
          if (e.key === 'Enter') {
            doOk();
          }
        } catch (_) {}
      };

      document.addEventListener('keydown', onKey, { once: true });
      document.body.appendChild(wrap);
      try { (input || okBtn || cancelBtn || closeBtn).focus(); } catch (_) {}
      try { if (input) input.select(); } catch (_) {}
    });
  };

  /**
   * UI.openModal({id, title, html, wideClass}) -> { close() }
   * - 用於自訂內容 modal（非 confirm/prompt）
   */
  UI.openModal = function openModal(options) {
    const opts = options || {};
    const id = (opts.id || 'ui-generic-modal').toString();
    const title = (opts.title || '視窗').toString();
    const html = (opts.html || '').toString();
    const wideClass = (opts.wideClass || '').toString();

    // 清理同 id 舊 modal
    try {
      const old = document.getElementById(id);
      if (old) old.remove();
    } catch (_) {}

    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.id = id;
    wrap.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content ${wideClass}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="modal-header">
          <div>
            <h3>${escapeHtml(title)}</h3>
          </div>
          <button class="modal-close" type="button" aria-label="關閉">×</button>
        </div>
        <div class="modal-body">${html}</div>
      </div>
    `.trim();

    const close = () => {
      try { wrap.remove(); } catch (_) {}
    };

    const closeBtn = wrap.querySelector('.modal-close');
    const backdrop = wrap.querySelector('.modal-backdrop');
    if (closeBtn) closeBtn.addEventListener('click', close);

    const closeOnBackdrop = !!(window.AppConfig && window.AppConfig.ui && window.AppConfig.ui.modal && window.AppConfig.ui.modal.closeOnBackdrop);
    if (backdrop && closeOnBackdrop) backdrop.addEventListener('click', close);

    const onKey = (e) => {
      try {
        if (e.key === 'Escape') {
          const closeOnEscape = !!(window.AppConfig && window.AppConfig.ui && window.AppConfig.ui.modal && window.AppConfig.ui.modal.closeOnEscape);
          if (closeOnEscape) close();
        }
      } catch (_) {}
    };

    document.addEventListener('keydown', onKey, { once: true });
    document.body.appendChild(wrap);
    try { (wrap.querySelector('button, [tabindex]') || closeBtn).focus(); } catch (_) {}
    return { close };
  };



  /* ----------------------------------------
     Table Enhancer
     - 讓所有 .table-wrap 自動具備「上方水平滑桿」
     - 不需要改動各模組 HTML
  ---------------------------------------- */
  UI._tableEnhancer = UI._tableEnhancer || { started: false, items: new Map(), mo: null };

  function enhanceTableWrap(wrap) {
    try {
      if (!wrap || wrap.nodeType !== 1) return;
      if (wrap.classList.contains('table-enhanced')) return;

      // 僅處理包含 table 的 table-wrap
      const hasTable = !!wrap.querySelector('table');
      if (!hasTable) return;

      wrap.classList.add('table-enhanced');

      const top = document.createElement('div');
      top.className = 'table-scroll-top';
      const topInner = document.createElement('div');
      topInner.className = 'table-scroll-top-inner';
      top.appendChild(topInner);

      const body = document.createElement('div');
      body.className = 'table-scroll-body';

      // move children into body
      while (wrap.firstChild) {
        body.appendChild(wrap.firstChild);
      }
      wrap.appendChild(top);
      wrap.appendChild(body);

      let rafId = 0;
      const sync = () => {
        try {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            try {
              const sw = body.scrollWidth;
              const cw = body.clientWidth;
              topInner.style.width = sw + 'px';
              // 有 overflow 才顯示 top scrollbar
              top.style.display = (sw > cw + 2) ? 'block' : 'none';
            } catch (_) {}
          });
        } catch (_) {}
      };

      const onTopScroll = () => {
        try { body.scrollLeft = top.scrollLeft; } catch (_) {}
      };
      const onBodyScroll = () => {
        try { top.scrollLeft = body.scrollLeft; } catch (_) {}
      };

      top.addEventListener('scroll', onTopScroll, { passive: true });
      body.addEventListener('scroll', onBodyScroll, { passive: true });

      // 監聽內容變化（表格列增減、字串長度等）
      const mo = new MutationObserver(() => sync());
      mo.observe(body, { childList: true, subtree: true, characterData: true });

      // 初次同步
      sync();

      UI._tableEnhancer.items.set(wrap, { wrap, top, body, sync, mo });
    } catch (_) {}
  }

  UI.refreshTables = function refreshTables(rootEl) {
    try {
      const root = rootEl || document;
      const wraps = Array.from(root.querySelectorAll('.table-wrap'));
      wraps.forEach(enhanceTableWrap);
      // 全量 sync
      UI._tableEnhancer.items.forEach((it) => { try { it.sync(); } catch (_) {} });
    } catch (_) {}
  };

  UI.initTableEnhancer = function initTableEnhancer() {
    try {
      if (UI._tableEnhancer.started) return;
      UI._tableEnhancer.started = true;

      const start = () => {
        UI.refreshTables(document);
        // 觀察後續動態渲染（模組切換、modal 開啟）
        const mo = new MutationObserver((mutations) => {
          try {
            for (const m of mutations) {
              for (const n of (m.addedNodes || [])) {
                if (!n || n.nodeType !== 1) continue;
                if (n.matches && n.matches('.table-wrap')) {
                  enhanceTableWrap(n);
                }
                const wraps = n.querySelectorAll ? n.querySelectorAll('.table-wrap') : [];
                if (wraps && wraps.length) wraps.forEach(enhanceTableWrap);
              }
            }
          } catch (_) {}
        });
        mo.observe(document.body, { childList: true, subtree: true });
        UI._tableEnhancer.mo = mo;

        window.addEventListener('resize', () => {
          try { UI._tableEnhancer.items.forEach((it) => it.sync()); } catch (_) {}
        }, { passive: true });
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
      } else {
        start();
      }
    } catch (_) {}
  };

  // 自動啟用（不影響舊流程）
  try { UI.initTableEnhancer(); } catch (_) {}
  // 與舊程式相容：提供 UI.alert 取代原生 alert（預設 info toast）
  UI.alert = function (message, type) {
    UI.toast(message, { type: type || 'info' });
  };

  // =========================================================
  // Date input mask: YYYY-MM-DD（自動帶入 -）
  // - 適用於 placeholder 含 YYYY-MM-DD 的文字輸入欄位
  // - 不影響 <input type="date">
  // - 支援貼上 20260109 / 2026/01/09 / 2026-01-09
  // =========================================================

  UI.bindDateInputMask = function bindDateInputMask() {
    try {
      if (UI._dateMaskBound) return;
      UI._dateMaskBound = true;

      const isTarget = (el) => {
        try {
          if (!el || el.nodeType !== 1) return false;
          if (!el.matches || !el.matches('input')) return false;
          const type = String(el.type || '').toLowerCase();
          if (type === 'date') return false;
          if (el.readOnly || el.disabled) return false;

          const ph = String(el.getAttribute('placeholder') || '');
          if (/YYYY\s*[-\/]\s*MM\s*[-\/]\s*DD/i.test(ph)) return true;
          const dm = String(el.getAttribute('data-date-mask') || '').toLowerCase();
          if (dm === 'ymd') return true;

          // 兜底：常見欄位名稱（避免漏掉未設 placeholder 的欄位）
          const name = String(el.getAttribute('name') || el.getAttribute('data-field') || '').toLowerCase();
          if (!name) return false;
          return /(date)$/.test(name) || /(expecteddate|arriveddate|replaceddate)$/.test(name);
        } catch (_) {
          return false;
        }
      };

      const formatYMD = (raw) => {
        const digits = String(raw || '').replace(/[^0-9]/g, '').slice(0, 8);
        if (digits.length <= 4) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
        return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
      };

      const caretFromDigits = (digitCount) => {
        const n = Math.max(0, Math.min(8, digitCount));
        if (n <= 4) return n;
        if (n <= 6) return n + 1;
        return n + 2;
      };

      const onFocusIn = (e) => {
        const el = e && e.target;
        if (!isTarget(el)) return;
        try {
          // Mobile 鍵盤體感：數字鍵盤
          if (!el.getAttribute('inputmode')) el.setAttribute('inputmode', 'numeric');
          // 10 = YYYY-MM-DD
          if (!el.getAttribute('maxlength')) el.setAttribute('maxlength', '10');
        } catch (_) {}
      };

      const onInput = (e) => {
        const el = e && e.target;
        if (!isTarget(el)) return;

        try {
          const before = String(el.value || '');
          const start = (typeof el.selectionStart === 'number') ? el.selectionStart : null;

          let digitsBefore = null;
          if (start !== null) {
            digitsBefore = before.slice(0, start).replace(/[^0-9]/g, '').length;
          }

          const after = formatYMD(before);
          if (after === before) return;

          el.value = after;

          if (digitsBefore !== null) {
            const pos = caretFromDigits(digitsBefore);
            try { el.setSelectionRange(pos, pos); } catch (_) {}
          }
        } catch (_) {}
      };

      const onBlur = (e) => {
        const el = e && e.target;
        if (!isTarget(el)) return;
        try {
          const v = String(el.value || '');
          const digits = v.replace(/[^0-9]/g, '');
          if (digits.length === 8) {
            const after = formatYMD(digits);
            if (after !== v) el.value = after;
          }
        } catch (_) {}
      };

      // Capture phase：避免模組本身 input handler 先吃到
      document.addEventListener('focusin', onFocusIn, true);
      document.addEventListener('input', onInput, true);
      document.addEventListener('blur', onBlur, true);
    } catch (_) {}
  };

  // 自動啟用（不影響舊流程）
  try { UI.bindDateInputMask(); } catch (_) {}

})();
