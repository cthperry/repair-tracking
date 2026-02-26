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
    return el.closest('.form-group,.field') || el.parentElement;
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
    } catch (_) {}
  };

  const showMsg = (msgEl, show) => {
    if (!msgEl) return;
    msgEl.style.display = show ? '' : 'none';
  };

  const validateControl = (control) => {
    const empty = isEmptyValue(control);
    const invalid = empty;
    const msgEl = ensureMsgEl(control);

    setInvalid(control, invalid);
    showMsg(msgEl, invalid);

    return !invalid;
  };

  const focusFirstInvalid = (form) => {
    try {
      const el = form.querySelector('.is-invalid');
      if (el && typeof el.focus === 'function') el.focus();
    } catch (_) {}
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

      const onLive = () => { validateControl(control); };
      control.addEventListener('input', onLive);
      control.addEventListener('change', onLive);
      control.addEventListener('blur', onLive);
    });

    if (form.dataset) form.dataset.fvBound = '1';
  };

  const validateForm = (form) => {
    if (!form) return true;

    const controls = getRequiredControls(form);
    let ok = true;

    for (const c of controls) {
      const oneOk = validateControl(c);
      if (!oneOk) ok = false;
    }

    if (!ok) focusFirstInvalid(form);
    return ok;
  };

  const resetForm = (form) => {
    if (!form) return;
    const controls = getRequiredControls(form);
    controls.forEach((c) => {
      setInvalid(c, false);
      const msgEl = ensureMsgEl(c);
      showMsg(msgEl, false);
    });
  };

  window.FormValidate = {
    bindForm,
    validateForm,
    resetForm,
    _validateControl: validateControl
  };
})();
