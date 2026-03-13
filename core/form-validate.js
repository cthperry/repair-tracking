/**
 * FormValidate - 輕量表單即時驗證（P3）
 *
 * 設計原則：
 * - 不更動既有資料結構
 * - 不強制新增 required（僅針對已標示 required 或 data-required 的欄位）
 * - Desktop/Mobile 共用
 * - 低耦合：不依賴外部框架
 *
 * 用法：
 *   FormValidate.bindForm(formEl)
 *   FormValidate.validateForm(formEl) -> boolean
 */
(function () {
  'use strict';

  const DEFAULT_MSG = '必填欄位';
  const DEFAULT_SUMMARY_MSG = '請修正表單欄位後再儲存';

  const toStr = (v) => (v === null || v === undefined) ? '' : String(v);

  const isEmptyValue = (el) => {
    if (!el) return true;

    const type = toStr(el.type).toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      return !el.checked;
    }

    const tag = toStr(el.tagName).toLowerCase();
    if (tag === 'select') {
      return !toStr(el.value).trim();
    }

    // date/text/textarea
    return !toStr(el.value).trim();
  };

  const getRequiredControls = (form) => {
    if (!form || !form.querySelectorAll) return [];
    const nodes = form.querySelectorAll('[required], [data-required="1"], [data-required="true"]');
    return Array.from(nodes).filter((el) => {
      // 不處理 hidden
      if (toStr(el.type).toLowerCase() === 'hidden') return false;
      // 必須要有 name 才能追蹤
      const name = toStr(el.getAttribute('name')).trim();
      return !!name;
    });
  };

  const findFieldWrap = (el) => {
    if (!el || !el.closest) return el?.parentElement || null;
    return el.closest('.form-group,.field,.form-field,.worklog-form-row,td,th') || el.parentElement;
  };

  const ensureMsgEl = (control) => {
    const wrap = findFieldWrap(control);
    if (!wrap) return null;

    const name = toStr(control.getAttribute('name')).trim();
    if (!name) return null;

    let msg = wrap.querySelector(`.error-text[data-valmsg-for="${name}"]`);
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'error-text';
      msg.setAttribute('data-valmsg-for', name);
      msg.style.display = 'none';

      const customMsg = toStr(control.getAttribute('data-required-msg')).trim();
      msg.textContent = customMsg || DEFAULT_MSG;
      wrap.appendChild(msg);
    }
    return msg;
  };

  const setInvalid = (control, invalid) => {
    try {
      if (!control || !control.classList) return;
      // input / textarea / select 都沿用同一個 class
      if (invalid) control.classList.add('is-invalid');
      else control.classList.remove('is-invalid');

      const wrap = findFieldWrap(control);
      if (wrap && wrap.classList) {
        if (invalid) wrap.classList.add('has-error');
        else wrap.classList.remove('has-error');
      }
    } catch (_) {}
  };

  const showMsg = (msgEl, show, text) => {
    if (!msgEl) return;
    if (typeof text === 'string' && text.trim()) msgEl.textContent = text.trim();
    msgEl.style.display = show ? '' : 'none';
  };

  const ensureSummaryEl = (form) => {
    if (!form || !form.querySelector) return null;
    let summary = form.querySelector(':scope > .form-summary[data-role="form-summary"]');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'form-summary';
      summary.setAttribute('data-role', 'form-summary');
      summary.setAttribute('aria-live', 'polite');
      summary.style.display = 'none';
      form.prepend(summary);
    }
    return summary;
  };

  const clearSummary = (form) => {
    const summary = ensureSummaryEl(form);
    if (!summary) return;
    summary.textContent = '';
    summary.style.display = 'none';
    summary.classList.remove('is-visible');
  };

  const showSummary = (form, message, options) => {
    const summary = ensureSummaryEl(form);
    if (!summary) return;
    const tone = toStr(options?.tone || '').trim();
    summary.className = 'form-summary';
    if (tone) summary.classList.add(`tone-${tone}`);
    summary.textContent = toStr(message).trim() || DEFAULT_SUMMARY_MSG;
    summary.style.display = '';
    summary.classList.add('is-visible');
  };

  const validateControl = (control) => {
    const empty = isEmptyValue(control);
    const invalid = empty;
    const msgEl = ensureMsgEl(control);

    setInvalid(control, invalid);
    showMsg(msgEl, invalid);

    return !invalid;
  };

  const setControlError = (control, message) => {
    if (!control) return false;
    const msgEl = ensureMsgEl(control);
    setInvalid(control, true);
    showMsg(msgEl, true, message || DEFAULT_MSG);
    try {
      const wrap = findFieldWrap(control);
      if (wrap?.classList) wrap.classList.add('has-error');
    } catch (_) {}
    return false;
  };

  const clearControlError = (control) => {
    if (!control) return;
    const msgEl = ensureMsgEl(control);
    setInvalid(control, false);
    showMsg(msgEl, false);
  };

  const focusFirstInvalid = (form) => {
    try {
      const el = form.querySelector('.is-invalid');
      if (el && typeof el.focus === 'function') el.focus();
    } catch (_) {}
  };

  const clearCustomErrors = (form) => {
    if (!form || !form.querySelectorAll) return;
    const invalids = form.querySelectorAll('.is-invalid');
    invalids.forEach((el) => clearControlError(el));
    const wraps = form.querySelectorAll('.has-error');
    wraps.forEach((el) => {
      try { el.classList.remove('has-error'); } catch (_) {}
    });
    clearSummary(form);
  };

  const bindForm = (form) => {
    if (!form || form.dataset?.fvBound) return;

    const controls = getRequiredControls(form);
    if (controls.length === 0) {
      if (form.dataset) form.dataset.fvBound = '1';
      return;
    }

    controls.forEach((control) => {
      // 建立 msg 容器（若尚未存在）
      ensureMsgEl(control);

      const onLive = () => {
        validateControl(control);
        const hasInvalid = !!form.querySelector('.is-invalid');
        if (!hasInvalid) clearSummary(form);
      };
      control.addEventListener('input', onLive);
      control.addEventListener('change', onLive);
      control.addEventListener('blur', onLive);
    });

    if (form.dataset) form.dataset.fvBound = '1';
  };

  const validateForm = (form, options) => {
    if (!form) return true;

    const controls = getRequiredControls(form);
    let ok = true;

    controls.forEach((c) => clearControlError(c));
    if (!(options && options.keepSummary)) clearSummary(form);

    for (const c of controls) {
      const oneOk = validateControl(c);
      if (!oneOk) ok = false;
    }

    if (!ok) {
      showSummary(form, options?.summaryMessage || '請補齊必填欄位');
      focusFirstInvalid(form);
    }
    return ok;
  };

  const resetForm = (form) => {
    if (!form) return;
    const controls = getRequiredControls(form);
    controls.forEach((c) => {
      clearControlError(c);
    });
    clearSummary(form);
  };

  window.FormValidate = {
    bindForm,
    validateForm,
    resetForm,
    clearCustomErrors,
    clearSummary,
    showSummary,
    setControlError,
    clearControlError,
    focusFirstInvalid,
    _validateControl: validateControl
  };
})();
