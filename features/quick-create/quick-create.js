/**
 * Quick Create（維修單範本快速建單）
 * 
 * 功能：
 * - 在任何模組頁面顯示浮動按鈕（FAB）
 * - 點擊後展開已啟用的範本列表
 * - 選擇範本 → 自動帶入欄位 → 開啟維修單表單
 * - 支援「空白建單」（不套用範本）
 *
 * 依賴：
 * - RepairTemplatesService（已存在，features/templates/）
 * - RepairUI.openForm() + RepairUI.applyTemplateToForm()
 * - AppRouter.navigate('repairs')
 * - ModuleLoader.ensure('repairs')
 *
 * 不新增 Firebase 節點。
 */
(function () {
  'use strict';

  let _isOpen = false;
  let _fabEl = null;
  let _panelEl = null;
  let _backdropEl = null;
  let _routeName = '';
  let _observer = null;
  let _rafId = 0;

  // ─── Helpers ───
  const esc = (s) => {
    const t = (s === null || s === undefined) ? '' : String(s);
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };


  function _isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function _isNearViewportBottom() {
    const scrollEl = document.scrollingElement || document.documentElement;
    const remain = Math.max(0, scrollEl.scrollHeight - (window.scrollY + window.innerHeight));
    return remain < 140;
  }

  function _isModalLikeOpen() {
    const selectors = [
      '.modal',
      '.tpl-modal-backdrop.show',
      '.qc-backdrop.qc-open'
    ];
    return selectors.some((selector) => Array.from(document.querySelectorAll(selector)).some((el) => {
      if (!_isVisible(el)) return false;
      if (el === _backdropEl || el === _panelEl || el === _fabEl) return false;
      return true;
    }));
  }

  function _findBottomObstruction() {
    const selectors = [
      '.settings-savebar',
      '.modal-footer.sticky',
      '.quote-detail-modal .modal-footer',
      '.order-detail-modal .modal-footer',
      '.repair-mobile-actions',
      '.btn-back-top',
      '[data-fab-obstruction="true"]'
    ];
    let maxLift = 0;
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (!_isVisible(el)) return;
        const rect = el.getBoundingClientRect();
        const overlapsBottom = rect.bottom > window.innerHeight - 220;
        const overlapsRight = rect.right > window.innerWidth - 420;
        if (!overlapsBottom || !overlapsRight) return;
        const needed = Math.max(0, window.innerHeight - rect.top + 16);
        maxLift = Math.max(maxLift, needed);
      });
    });
    return maxLift;
  }

  function _shouldHideForRoute(route) {
    return ['settings', 'sops'].includes(route);
  }

  function _queueUpdatePosition() {
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(() => {
      _rafId = 0;
      _updatePosition();
    });
  }

  function _updatePosition() {
    if (!_fabEl || !_panelEl) return;

    const hideByRoute = _shouldHideForRoute(_routeName);
    const hideByModal = _isModalLikeOpen();
    const hideByBottom = _isNearViewportBottom() && !_isOpen;
    const lift = _findBottomObstruction();
    const mobile = window.innerWidth <= 768;
    const baseBottom = mobile ? 76 : 24;
    const baseRight = mobile ? 16 : 24;
    const bottom = baseBottom + lift;

    document.documentElement.style.setProperty('--qc-fab-bottom', `${bottom}px`);
    document.documentElement.style.setProperty('--qc-fab-right', `${baseRight}px`);

    const shouldHide = hideByRoute || hideByModal || hideByBottom;
    _fabEl.classList.toggle('qc-hidden', shouldHide);
    _panelEl.classList.toggle('qc-hidden', shouldHide);
    if (shouldHide && _isOpen) close();
  }

  function _getTemplates() {
    try {
      const svc = (typeof window._svc === 'function') ? window._svc('RepairTemplatesService') : null;
      if (svc && typeof svc.getEnabled === 'function') return svc.getEnabled();
    } catch (_) {}
    return [];
  }

  // ─── DOM Creation ───
  function _ensureDOM() {
    if (_fabEl) return;

    // Backdrop
    _backdropEl = document.createElement('div');
    _backdropEl.className = 'qc-backdrop';
    _backdropEl.addEventListener('click', close);

    // Panel
    _panelEl = document.createElement('div');
    _panelEl.className = 'qc-panel';
    _panelEl.setAttribute('role', 'menu');

    // FAB
    _fabEl = document.createElement('button');
    _fabEl.className = 'qc-fab';
    _fabEl.setAttribute('type', 'button');
    _fabEl.setAttribute('aria-label', '快速建單');
    _fabEl.setAttribute('title', '快速建單');
    _fabEl.innerHTML = '<span class="qc-fab-icon">＋</span>';
    _fabEl.addEventListener('click', toggle);

    document.body.appendChild(_backdropEl);
    document.body.appendChild(_panelEl);
    document.body.appendChild(_fabEl);
  }

  function _renderPanel() {
    const templates = _getTemplates();

    const items = templates.map(t => {
      const name = esc(t.name || '未命名');
      const machine = esc(t.machine || '');
      const status = esc(t.status || '');
      const sub = [machine, status].filter(Boolean).join(' · ');
      return `
        <button class="qc-item" type="button" data-tpl-id="${esc(t.id)}">
          <span class="qc-item-name">${name}</span>
          ${sub ? `<span class="qc-item-sub">${sub}</span>` : ''}
        </button>
      `;
    }).join('');

    _panelEl.innerHTML = `
      <div class="qc-header">快速建單</div>
      <div class="qc-list">
        <button class="qc-item qc-item-blank" type="button" data-tpl-id="">
          <span class="qc-item-name">📋 空白維修單</span>
          <span class="qc-item-sub">不套用範本</span>
        </button>
        ${items.length ? items : '<div class="qc-empty">尚無已啟用的範本<br><span class="muted">可到「設定 → 維修範本」新增</span></div>'}
      </div>
    `;

    // Bind clicks
    _panelEl.querySelectorAll('.qc-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tplId = btn.getAttribute('data-tpl-id') || '';
        _handleSelect(tplId);
      });
    });
  }

  // ─── Actions ───
  async function _handleSelect(tplId) {
    close();

    try {
      // Ensure repairs module is loaded
      if (window.ModuleLoader && typeof window.ModuleLoader.ensure === 'function') {
        await window.ModuleLoader.ensure('repairs');
      }

      // Navigate to repairs
      if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
        await window.AppRouter.navigate('repairs');
      }

      // Small delay to ensure module is rendered
      await new Promise(r => setTimeout(r, 400));

      // Open blank form
      const ui = window.repairUI || window.RepairUI;
      if (ui && typeof ui.openForm === 'function') {
        await ui.openForm();
      } else if (window.RepairUI && typeof window.RepairUI.openForm === 'function') {
        await window.RepairUI.openForm();
      }

      // Apply template if selected
      if (tplId) {
        await new Promise(r => setTimeout(r, 200));
        const svc = (typeof window._svc === 'function') ? window._svc('RepairTemplatesService') : null;
        const tpl = svc ? svc.getById(tplId) : null;
        if (tpl) {
          const instance = window.repairUI;
          if (instance && typeof instance.applyTemplateToForm === 'function') {
            instance.applyTemplateToForm(tpl);
          }
        }
      }
    } catch (e) {
      console.error('QuickCreate: failed to open form', e);
      try { window.UI?.toast?.('快速建單失敗：' + (e.message || ''), { type: 'error' }); } catch (_) {}
    }
  }

  // ─── Toggle / Open / Close ───
  function toggle() {
    _isOpen ? close() : open();
  }

  function open() {
    _ensureDOM();
    _renderPanel();
    _isOpen = true;
    _panelEl.classList.add('qc-open');
    _backdropEl.classList.add('qc-open');
    _fabEl.classList.add('qc-open');
  }

  function close() {
    _isOpen = false;
    if (_panelEl) _panelEl.classList.remove('qc-open');
    if (_backdropEl) _backdropEl.classList.remove('qc-open');
    if (_fabEl) _fabEl.classList.remove('qc-open');
  }

  // ─── Init ───
  function init() {
    // Don't show on login page
    if (!window.currentUser && !window.AppState?.getCurrentUser?.()) {
      window.addEventListener('auth:login', () => setTimeout(init, 500), { once: true });
      return;
    }
    _ensureDOM();

    // Hide on settings page (where templates are managed)
    _routeName = String(window.AppRouter?.getCurrentRoute?.() || window.location.hash.replace(/^#\/?/, '') || '').trim();

    window.addEventListener('route:changed', (e) => {
      try {
        _routeName = e?.detail?.route || '';
        _queueUpdatePosition();
      } catch (_) {}
    });

    window.addEventListener('resize', _queueUpdatePosition, { passive: true });
    window.addEventListener('scroll', _queueUpdatePosition, { passive: true });

    if (!_observer) {
      _observer = new MutationObserver(_queueUpdatePosition);
      _observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class', 'style']
      });
    }

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _isOpen) close();
    });

    _queueUpdatePosition();
  }

  window.QuickCreate = { init, open, close, toggle };
  try { console.log('✅ QuickCreate loaded'); } catch (_) {}
})();
