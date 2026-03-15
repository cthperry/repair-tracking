/**
 * 零件管理 - UI
 * V161 - Parts Module - UI Layer
 */

class PartsUI {
  constructor() {
    this.view = 'tracker'; // tracker | catalog
    this.searchText = '';
    this.searchDraft = '';
    this.filterStatus = '';
    this.filterStatusDraft = '';
    this.filterOverdue = false;
    this.filterOverdueDraft = false;
    this.filterOpenOnly = false;
    this.filterOpenOnlyDraft = false;
    this.catalogQuick = '';
    this.catalogQuickDraft = ''; // '' | ACTIVE | INACTIVE | ZERO | LOW
    this.sortKey = 'updatedAt_desc';
    this.sortKeyDraft = 'updatedAt_desc';
    this.contextRepairId = '';
    this.contextRepairIdDraft = '';
    this.searchDebounce = null;

    // tracker：批次編輯（以維修單為依據）
    this._batchState = { repairId: '', deletedIds: [] };

    // P3：可摺疊篩選面板（各列表頁面一致的互動）
    this.filtersPanelOpen = this._loadFiltersPanelOpen();


    // Phase 4：列表降載（避免一次性渲染大量卡片造成卡頓）
    this.pageSize = (window.ListPaging && typeof window.ListPaging.getDefaultPageSize === 'function')
      ? window.ListPaging.getDefaultPageSize({ mobileSize: 40, desktopSize: 60 })
      : 60;
    this.visibleCount = this.pageSize;
    this._renderToken = 0;
    this._querySig = '';
    this._domBound = false;
    this._containerId = '';
    this._boundContainerId = '';
  }

  // Phase 1：統一 Service 存取走 _svc（registry-first），避免直接 window.XxxService
  _svc(name) {
    try { return (typeof window._svc === 'function') ? window._svc(name) : null; } catch (_) { return null; }
  }

  _getFiltersOpenStorageKey(view = '') {
    const v = (view || this.view || 'tracker').toString().trim() || 'tracker';
    const prefix = (window.AppConfig && window.AppConfig.system && window.AppConfig.system.storage && window.AppConfig.system.storage.prefix)
      ? window.AppConfig.system.storage.prefix
      : 'repair_tracking_v161_';
    return `${prefix}ui_parts_filters_open_${v}`;
  }

  _loadFiltersPanelOpen(view = '') {
    try {
      const raw = localStorage.getItem(this._getFiltersOpenStorageKey(view));
      // 兼容：若沒有值，預設為展開（避免新版升級後使用者覺得「篩選消失」）
      if (raw === null || raw === undefined) return true;
      return raw === '1' || raw === 'true';
    } catch (_) {
      return true;
    }
  }

  _saveFiltersPanelOpen(view = '') {
    try {
      localStorage.setItem(this._getFiltersOpenStorageKey(view), this.filtersPanelOpen ? '1' : '0');
    } catch (_) {}
  }

  _activeFiltersCount() {
    // 僅計入「篩選面板」相關狀態（不包含搜尋）
    if (this.view === 'catalog') {
      return (this.catalogQuick ? 1 : 0);
    }
    // tracker
    let n = 0;
    if ((this.filterStatus || '').toString().trim()) n += 1;
    if (this.filterOverdue) n += 1;
    if (this.filterOpenOnly) n += 1;
    return n;
  }

  _updateFiltersToggleButton() {
    const btn = document.getElementById('parts-toggle-filters-btn');
    if (!btn) return;
    const c = this._activeFiltersCount();
    const base = this.filtersPanelOpen ? '▾ 收合篩選' : '▸ 開啟篩選';
    btn.textContent = `🔍 ${base}${c ? ` (${c})` : ''}`;
  }

  _applyFiltersPanelVisibility() {
    const panel = document.getElementById('parts-filters-panel');
    if (panel) panel.hidden = !this.filtersPanelOpen;
    this._updateFiltersToggleButton();
  }

  toggleFiltersPanel() {
    this.filtersPanelOpen = !this.filtersPanelOpen;
    this._saveFiltersPanelOpen();
    this._applyFiltersPanelVisibility();
  }

  _todayTaipei() {
    try {
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return fmt.format(new Date());
    } catch (_) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  _isOverdueRepairPart(item, today = '') {
    const it = item || {};
    const st = (it.status || '').toString().trim();
    try {
      if (window.AppConfig && typeof window.AppConfig.isTerminalBusinessStatus === 'function' && window.AppConfig.isTerminalBusinessStatus('part', st)) {
        return false;
      }
    } catch (_) {}
    const expected = (it.expectedDate || '').toString().trim();
    if (!expected) return false;
    const t = today || this._todayTaipei();
    return expected < t;
  }

  _accentForPartStatus(status) {
    try {
      if (window.AppConfig && typeof window.AppConfig.getStatusAccent === 'function') {
        return window.AppConfig.getStatusAccent('part', status);
      }
    } catch (_) {}
    return { accent: 'var(--module-accent)', soft: 'var(--module-accent-soft)' };
  }

  _accentForStock(part) {
    const p = part || {};
    const active = (p.isActive !== false);
    const qty = Number(p.stockQty);
    if (!active) return { accent: '#64748b', soft: 'rgba(100,116,139,.12)' };
    if (Number.isFinite(qty) && qty <= 0) return { accent: '#dc2626', soft: 'rgba(220,38,38,.12)' };
    if (Number.isFinite(qty) && qty <= 2) return { accent: '#b45309', soft: 'rgba(217,119,6,.15)' };
    return { accent: 'var(--module-accent)', soft: 'var(--module-accent-soft)' };
  }

  _escapeHtml(input) {
    const s = (input === null || input === undefined) ? '' : String(input);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  _escapeAttr(input) {
    return this._escapeHtml(input).split('\n').join(' ').split('\r').join(' ');
  }

  _sectionHeaderHtml(title, desc = '', options = {}) {
    const opts = options || {};
    const eyebrow = (opts.eyebrow || '').toString().trim();
    const actionsHtml = (opts.actionsHtml || '').toString();
    try {
      if (window.UI && typeof window.UI.enterpriseSectionHeaderHTML === 'function') {
        return window.UI.enterpriseSectionHeaderHTML({
          eyebrow,
          title,
          desc,
          actionsHtml,
          className: ['parts-enterprise-section-head', (opts.className || '').toString().trim()].filter(Boolean).join(' ')
        });
      }
    } catch (_) {}
    return `
      <div class="parts-form-section-head">
        <div>
          ${eyebrow ? `<div class="enterprise-section-eyebrow">${this._escapeHtml(eyebrow)}</div>` : ''}
          <h4 class="form-section-title">${this._escapeHtml(title)}</h4>
          ${desc ? `<div class="muted">${this._escapeHtml(desc)}</div>` : ''}
        </div>
        ${actionsHtml ? `<div class="enterprise-section-actions">${actionsHtml}</div>` : ''}
      </div>
    `;
  }

  _chipHtml(label, options = {}) {
    try {
      if (window.UI && typeof window.UI.chipHTML === 'function') {
        return window.UI.chipHTML(label, options);
      }
    } catch (_) {}
    const tone = (options.tone || '').toString().trim();
    const className = ['chip', options.static ? 'static' : '', options.active ? 'active' : '', tone ? `tone-${tone}` : '', (options.className || '').toString().trim()].filter(Boolean).join(' ');
    const tagName = (options.tagName || 'button').toString().toLowerCase() === 'span' ? 'span' : 'button';
    const attrs = (options.attrs || '').toString().trim();
    const typeAttr = tagName === 'button' && !/\btype=/.test(attrs) ? 'type="button"' : '';
    return `<${tagName} class="${className}"${[typeAttr, attrs].filter(Boolean).join(' ') ? ` ${[typeAttr, attrs].filter(Boolean).join(' ')}` : ''}>${options.allowHtml ? String(label || '—') : this._escapeHtml(label || '—')}</${tagName}>`;
  }

  _toneForCatalogQuick(key = '') {
    const value = (key || '').toString().trim().toUpperCase();
    if (value === 'ACTIVE') return 'success';
    if (value === 'INACTIVE') return 'neutral';
    if (value === 'ZERO') return 'danger';
    if (value === 'LOW') return 'warning';
    return 'primary';
  }

  _toneForPartStatus(status = '') {
    const value = (status || '').toString().trim();
    if (value === '已更換') return 'success';
    if (value === '已到貨') return 'info';
    if (value === '已下單') return 'secondary';
    if (value === '已報價' || value === '待報價' || value === '待下單') return 'warning';
    if (value === '已取消') return 'neutral';
    return 'primary';
  }

  _statsToneClass(key = '') {
    const value = (key || '').toString().trim().toUpperCase();
    if (value === 'ACTIVE' || value === '已更換') return 'tone-success';
    if (value === 'INACTIVE') return 'tone-neutral';
    if (value === 'ZERO') return 'tone-danger';
    if (value === 'LOW' || value === 'OVERDUE' || value === 'OPEN') return value === 'OPEN' ? 'tone-accent' : 'tone-warning';
    if (value === '已報價') return 'tone-primary';
    if (value === '已下單') return 'tone-info';
    if (value === '已到貨') return 'tone-warning';
    return '';
  }

  render(containerId) {
    const mountId = (containerId || '').toString().trim();
    const el = mountId ? document.getElementById(mountId) : null;
    if (!el) return;

    if (this._containerId !== mountId) {
      this._containerId = mountId;
      if (this._boundContainerId !== mountId) this._domBound = false;
    }

    const searchPlaceholder = (this.view === 'catalog')
      ? '搜尋：零件 / MPN / 廠商'
      : '搜尋：零件 / MPN / 狀態 / 維修單';

    el.innerHTML = `
      <div class="parts-module ops-module-shell">
        <div class="module-toolbar parts-toolbar-surface">
          <div class="module-toolbar-left ops-toolbar-title">
            <div class="page-title">
              <h2>🧩 零件管理</h2>
              <span class="muted ops-toolbar-summary" id="parts-subtitle">載入中...</span>
            </div>
          </div>
          <div class="module-toolbar-right ops-actions">
            <div class="segmented" role="tablist" aria-label="Parts Views">
              <button class="seg-btn" id="tab-tracker" data-action="setView" data-view="tracker">用料追蹤</button>
              <button class="seg-btn" id="tab-catalog" data-action="setView" data-view="catalog">零件主檔</button>
            </div>

            <div class="parts-search">
              <input class="input" id="parts-search-input" type="text" placeholder="${this._escapeAttr(searchPlaceholder)}" value="${this._escapeAttr(this.searchDraft)}" />
            </div>

            <button class="btn primary" data-action="applyAll">搜尋</button>
            <button class="btn" data-action="clearAll">清除</button>

            <button class="btn" id="parts-toggle-filters-btn" data-action="toggleFilters">🔍 ${this.filtersPanelOpen ? '▾ 收合篩選' : '▸ 開啟篩選'}${this._activeFiltersCount() ? ` (${this._activeFiltersCount()})` : ''}</button>

            <button class="btn primary" data-action="openCreate">➕ 新增</button>
          </div>
        </div>

        <div class="parts-summary" id="parts-summary"></div>
        <div class="parts-filters-panel panel compact ops-filter-panel" id="parts-filters-panel" ${this.filtersPanelOpen ? '' : 'hidden'}>
          <div class="panel-row">
            <div class="panel-left">
              <div class="panel-title"><strong>篩選</strong><span class="muted parts-panel-note">可多條件組合</span></div>
            </div>
            <div class="panel-right">
              <button class="btn primary" data-action="applyAll">搜尋</button>
              <button class="btn" data-action="clearAll">清除</button>
            </div>
          </div>
          <div class="parts-filters-body" id="parts-filters"></div>
        </div>
        <div class="parts-list" id="parts-list">${this._renderLoading()}</div>
      </div>

      <div id="parts-modal" class="modal" hidden>
        <div class="modal-backdrop" data-action="closeModal"></div>
        <div class="modal-content" id="parts-modal-content"></div>
      </div>
    `;

    this._ensureDomHandlers();
    this._applyViewButtons();

    // 同步搜尋框 placeholder（切換 tab 時不會重建 DOM）
    try {
      const input = document.querySelector('.parts-search input');
      if (input) {
        input.placeholder = (this.view === 'catalog') ? '搜尋：零件 / MPN / 廠商' : '搜尋：零件 / MPN / 狀態 / 維修單';
        if (input.value !== this.searchText) input.value = this.searchText;
      }
    } catch (_) {}
    this.update();
  }

  _ensureDomHandlers() {
    const mountId = (this._containerId || '').toString().trim();
    if (!mountId) return false;
    this._bindDomHandlers(mountId);
    return true;
  }

  _bindDomHandlers(containerId) {
    const mountId = (containerId || '').toString().trim();
    const root = mountId ? document.getElementById(mountId) : null;
    if (!root) return;
    if (this._domBound && this._boundContainerId === mountId) return;
    this._domBound = true;
    this._boundContainerId = mountId;

    root.addEventListener('click', (e) => {
      const actionEl = e.target?.closest?.('[data-action]');
      if (!actionEl) return;
      const action = (actionEl.getAttribute('data-action') || '').toString();
      switch (action) {
        case 'setView': PartsUI.setView(actionEl.getAttribute('data-view') || 'tracker'); return;
        case 'applyAll': PartsUI.applyAll(); return;
        case 'clearAll': PartsUI.clearAll(); return;
        case 'toggleFilters': PartsUI.toggleFilters(); return;
        case 'openCreate': PartsUI.openCreate(); return;
        case 'closeModal': PartsUI.closeModal(); return;
        case 'quickFilter': PartsUI.setQuickFilter(actionEl.getAttribute('data-filter') || ''); return;
        case 'clearRepairFilter': PartsUI.clearRepairFilter(); PartsUI.applyAll(); return;
        case 'loadMore': PartsUI.loadMore(); return;
        case 'addBatchRow': PartsUI.addBatchRow(); return;
        case 'removeBatchRow': PartsUI.removeBatchRow(actionEl); return;
        default: return;
      }
    });

    root.addEventListener('input', (e) => {
      const t = e.target;
      if (t && t.id === 'parts-search-input') PartsUI.onSearchDraft(e);
    });

    root.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t && t.id === 'parts-search-input') PartsUI.onSearchKeydown(e);
    });

    root.addEventListener('change', (e) => {
      const t = e.target;
      if (!t) return;
      const role = (t.getAttribute('data-filter-role') || '').toString();
      if (role === 'status') return PartsUI.setStatusFilter(e);
      if (role === 'catalogStatus') return PartsUI.setCatalogStatusFilter(e);
      if (role === 'sort') return PartsUI.setSort(e);
      if (role === 'repair') return PartsUI.setRepairFilter(e);
      if (role === 'batchRepair') return PartsUI.onBatchRepairChange(e);
    });

    root.addEventListener('submit', (e) => {
      try { e.preventDefault(); } catch (_) {}
      try { e.stopPropagation(); } catch (_) {}
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      const submitAction = (form.getAttribute('data-submit-action') || '').toString();
      if (submitAction === 'handleCreate') return PartsUI.handleCreate(e);
      if (submitAction === 'handleBatchSave') return PartsUI.handleBatchSave(e);
      return undefined;
    });
  }

  _renderLoading() {
    return `<div class="muted" style="padding:16px;">載入中...</div>`;
  }

  _applyViewButtons() {
    const t1 = document.getElementById('tab-tracker');
    const t2 = document.getElementById('tab-catalog');
    if (!t1 || !t2) return;
    t1.classList.toggle('active', this.view === 'tracker');
    t2.classList.toggle('active', this.view === 'catalog');
  }

  applyAll() {
    this.searchText = (this.searchDraft || '').toString().trim();
    this.sortKey = (this.sortKeyDraft || this.sortKey || 'updatedAt_desc').toString().trim() || 'updatedAt_desc';
    this.contextRepairId = (this.contextRepairIdDraft || '').toString().trim();

    if (this.view === 'catalog') {
      this.catalogQuick = (this.catalogQuickDraft || '').toString().trim();
    } else {
      this.filterStatus = (this.filterStatusDraft || '').toString().trim();
      this.filterOverdue = !!this.filterOverdueDraft;
      this.filterOpenOnly = !!this.filterOpenOnlyDraft;
    }
    this.update();
  }

  clearAll() {
    this.searchDraft = '';
    this.searchText = '';
    this.sortKeyDraft = 'updatedAt_desc';
    this.sortKey = 'updatedAt_desc';

    this.contextRepairIdDraft = '';
    this.contextRepairId = '';

    this.catalogQuickDraft = '';
    this.catalogQuick = '';
    this.filterStatusDraft = '';
    this.filterStatus = '';
    this.filterOverdueDraft = false;
    this.filterOverdue = false;
    this.filterOpenOnlyDraft = false;
    this.filterOpenOnly = false;

    try { this._updateFiltersToggleButton?.(); } catch (_) {}
    this.update();
  }

  async update() {
    // Phase 1：集中化 service ready
    try {
      if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
        await window.AppRegistry.ensureReady(['PartService', 'RepairPartsService'], { loadAll: false });
      } else {
        const PartService = this._svc('PartService');
        const RepairPartsService = this._svc('RepairPartsService');
        if (PartService && !PartService.isInitialized) await PartService.init();
        if (RepairPartsService && !RepairPartsService.isInitialized) await RepairPartsService.init();
      }
    } catch (e) {
      console.warn('PartsUI ensureReady failed:', e);
    }

    const PartService = this._svc('PartService');
    const RepairPartsService = this._svc('RepairPartsService');

    this._ensureDomHandlers();
    this._applyViewButtons();

    // 切換 Tab 時更新 placeholder（不重建整頁）
    try {
      const input = document.querySelector('.parts-search input');
      if (input) {
        input.placeholder = (this.view === 'catalog') ? '搜尋：零件 / MPN / 廠商' : '搜尋：零件 / MPN / 狀態 / 維修單';
      }
    } catch (_) {}

    const subtitle = document.getElementById('parts-subtitle');
    if (subtitle) {
      const itemsCount = RepairPartsService ? RepairPartsService.getAllItems().length : 0;
      const caseCount = (() => {
        try {
          if (!RepairPartsService) return 0;
          const byRepair = RepairPartsService.byRepair || {};
          return Object.keys(byRepair).filter(rid => {
            try { return (RepairPartsService.getForRepair(rid) || []).length > 0; } catch (_) { return false; }
          }).length;
        } catch (_) {
          return 0;
        }
      })();
      const allParts = PartService ? PartService.getAll() : [];
      const activeParts = (allParts || []).filter(p => p && p.isActive !== false);
      const inactive = Math.max(0, (allParts || []).length - activeParts.length);
      subtitle.textContent = `用料 ${itemsCount} 筆（${caseCount} 案例） · 主檔 ${activeParts.length} 筆（停用 ${inactive}）`;
    }

    const baseRows = (this.view === 'catalog') ? this._getCatalogBaseRows() : this._getTrackerBaseRows();
    this._renderSummary(baseRows);
    this._renderFilters();
    this._renderList();
    this._updateFiltersToggleButton();
  }

  _getTrackerBaseRows() {
    // 以「維修單/案例」為單位：同一 repairId 下的多筆用料合併為一張卡
    const q = (this.searchText || '').toString().trim().toLowerCase();
    const cases = this._getTrackerCaseRows();
    if (!q) return cases;

    const RepairService = this._svc('RepairService');

    return (cases || []).filter(c => {
      const rid = (c?.repairId || '').toString();
      const repair = (RepairService && typeof RepairService.get === 'function') ? RepairService.get(rid) : null;
      const repairNo = (repair?.repairNo || rid || '').toString();
      const customer = (repair?.customer || '').toString();
      const machine = (repair?.machine || '').toString();
      const items = Array.isArray(c?.items) ? c.items : [];
      const itemHay = items.map(it => `${it.partName || ''} ${it.mpn || ''} ${it.vendor || ''} ${it.status || ''}`).join(' ');
      const hay = `${repairNo} ${customer} ${machine} ${rid} ${c?.status || ''} ${itemHay}`.toLowerCase();
      return hay.includes(q);
    });
  }

  _getTrackerCaseRows() {
    const RepairPartsService = this._svc('RepairPartsService');
    if (!RepairPartsService) return [];

    const byRepair = RepairPartsService.byRepair || {};
    const rids = this.contextRepairId
      ? [this.contextRepairId]
      : Object.keys(byRepair);

    const out = [];
    for (const rid of rids) {
      const items = RepairPartsService.getForRepair(rid);
      if (!items || !items.length) continue;
      out.push(this._buildTrackerCaseRow(rid, items));
    }
    return out;
  }

  _buildTrackerCaseRow(repairId, items) {
    const rid = (repairId || '').toString().trim();
    const rows = Array.isArray(items) ? items.slice() : [];

    const today = this._todayTaipei();
    const stage = {
      '需求提出': 1,
      '待處理': 1,
      '已報價': 2,
      '已下單': 3,
      '已到貨': 4,
      '已更換': 5,
      '取消': 6
    };
    const norm = (s) => (s || '需求提出').toString().trim();
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const safe = (v) => (v === undefined || v === null) ? '' : String(v);
    const dateAsc = (v) => {
      const s = safe(v).slice(0, 10);
      return s ? s : '9999-99-99';
    };

    // 計算統計
    let updatedAt = '';
    let totalQty = 0;
    let totalAmount = 0;
    let expectedMin = '9999-99-99';
    let openItems = 0;
    let isOverdue = false;
    const statusCounts = {};
    const quoteIds = new Set();
    const orderIds = new Set();

    for (const it of rows) {
      const st = norm(it?.status);
      statusCounts[st] = (statusCounts[st] || 0) + 1;
      if (safe(it?.updatedAt) > updatedAt) updatedAt = safe(it?.updatedAt);
      totalQty += Math.max(0, toNum(it?.qty || 1));
      const lineTotal = (window.RepairPartModel && typeof window.RepairPartModel.lineTotal === 'function')
        ? window.RepairPartModel.lineTotal(it)
        : (toNum(it?.qty || 1) * toNum(it?.unitPrice));
      totalAmount += Math.max(0, toNum(lineTotal));

      const isOpen = (st !== '已更換' && st !== '取消');
      if (isOpen) openItems += 1;
      if (isOpen) {
        const d = dateAsc(it?.expectedDate);
        if (d < expectedMin) expectedMin = d;
      }

      if (!isOverdue && this._isOverdueRepairPart(it, today)) isOverdue = true;

      const qid = (it?.quoteId || '').toString().trim();
      const oid = (it?.orderId || '').toString().trim();
      if (qid) quoteIds.add(qid);
      if (oid) orderIds.add(oid);
    }

    const isOpenCase = openItems > 0;

    // 案例狀態：以「最早階段」代表整體進度（只要還有一筆未完成，就以未完成中最早階段為準）
    let caseStatus = '需求提出';
    if (!isOpenCase) {
      const hasReplaced = rows.some(it => norm(it?.status) === '已更換');
      const allCanceled = rows.length ? rows.every(it => norm(it?.status) === '取消') : false;
      caseStatus = hasReplaced ? '已更換' : (allCanceled ? '取消' : '已更換');
    } else {
      let minRank = 999;
      for (const it of rows) {
        const st = norm(it?.status);
        if (st === '已更換' || st === '取消') continue;
        const r = (window.AppConfig && typeof window.AppConfig.getBusinessStatusRank === 'function')
          ? window.AppConfig.getBusinessStatusRank('part', st)
          : 1;
        if (r < minRank) { minRank = r; caseStatus = st; }
      }
    }

    const expectedDate = (expectedMin === '9999-99-99') ? '' : expectedMin;

    return {
      kind: 'repair_case',
      repairId: rid,
      items: rows,
      status: caseStatus,
      isOpen: isOpenCase,
      isOverdue,
      openItems,
      totalItems: rows.length,
      totalQty,
      totalAmount,
      expectedDate,
      updatedAt,
      statusCounts,
      quoteIds: Array.from(quoteIds),
      orderIds: Array.from(orderIds)
    };
  }

  _getCatalogBaseRows() {
    const q = (this.searchText || '').toString().trim().toLowerCase();
    const PartService = this._svc('PartService');
    const rows = PartService ? PartService.getAll() : [];
    if (!q) return rows;
    return (rows || []).filter(p => {
      const hay = `${p.name || ''} ${p.mpn || ''} ${p.vendor || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  _renderSummary(baseRows) {
    const host = document.getElementById('parts-summary');
    if (!host) return;

    if (this.view === 'catalog') {
      const rows = Array.isArray(baseRows) ? baseRows : [];
      const activeCount = rows.filter(p => p && p.isActive !== false).length;
      const inactiveCount = rows.filter(p => p && p.isActive === false).length;
      const zeroCount = rows.filter(p => p && p.isActive !== false && Number(p.stockQty) <= 0).length;
      const lowCount = rows.filter(p => p && p.isActive !== false && Number(p.stockQty) > 0 && Number(p.stockQty) <= 2).length;

      host.innerHTML = `
        <div class="stats-grid parts-stats parts-stats-surface">
          <div class="stat-card clickable" data-action="quickFilter" data-filter="" title="顯示全部">
            <div class="stat-value">${rows.length}</div>
            <div class="stat-label">全部</div>
          </div>
          <div class="stat-card clickable tone-success" data-action="quickFilter" data-filter="ACTIVE" title="僅顯示啟用">
            <div class="stat-value">${activeCount}</div>
            <div class="stat-label">啟用</div>
          </div>
          <div class="stat-card clickable tone-neutral" data-action="quickFilter" data-filter="INACTIVE" title="僅顯示停用">
            <div class="stat-value">${inactiveCount}</div>
            <div class="stat-label">停用</div>
          </div>
          <div class="stat-card clickable tone-danger" data-action="quickFilter" data-filter="ZERO" title="庫存為 0（啟用）">
            <div class="stat-value">${zeroCount}</div>
            <div class="stat-label">缺料</div>
          </div>
          <div class="stat-card clickable tone-warning" data-action="quickFilter" data-filter="LOW" title="低庫存（≤ 2，啟用）">
            <div class="stat-value">${lowCount}</div>
            <div class="stat-label">低庫存</div>
          </div>
        </div>
      `;
      return;
    }

    // tracker
    const rows = Array.isArray(baseRows) ? baseRows : [];
    const countBy = (st) => rows.filter(c => (c?.status || '').toString().trim() === st).length;
    const openCount = rows.filter(c => !!c?.isOpen).length;
    const overdueCount = rows.filter(c => !!c?.isOverdue).length;

    host.innerHTML = `
      <div class="stats-grid parts-stats parts-stats-surface">
        <div class="stat-card clickable" data-action="quickFilter" data-filter="" title="顯示全部">
          <div class="stat-value">${rows.length}</div>
          <div class="stat-label">全部</div>
        </div>
        <div class="stat-card clickable tone-accent" data-action="quickFilter" data-filter="OPEN" title="未完成/未取消">
          <div class="stat-value">${openCount}</div>
          <div class="stat-label">待處理</div>
        </div>
        <div class="stat-card clickable tone-primary" data-action="quickFilter" data-filter="已報價">
          <div class="stat-value">${countBy('已報價')}</div>
          <div class="stat-label">已報價</div>
        </div>
        <div class="stat-card clickable tone-info" data-action="quickFilter" data-filter="已下單">
          <div class="stat-value">${countBy('已下單')}</div>
          <div class="stat-label">已下單</div>
        </div>
        <div class="stat-card clickable tone-warning" data-action="quickFilter" data-filter="已到貨">
          <div class="stat-value">${countBy('已到貨')}</div>
          <div class="stat-label">已到貨</div>
        </div>
        <div class="stat-card clickable tone-success" data-action="quickFilter" data-filter="已更換">
          <div class="stat-value">${countBy('已更換')}</div>
          <div class="stat-label">已更換</div>
        </div>
        <div class="stat-card clickable tone-warning" data-action="quickFilter" data-filter="OVERDUE" title="預計日早於今日且未到貨/未更換">
          <div class="stat-value">${overdueCount}</div>
          <div class="stat-label">逾期</div>
        </div>
      </div>
    `;
  }

  _renderFilters() {
    const host = document.getElementById('parts-filters');
    if (!host) return;

    if (this.view === 'catalog') {
      const allActive = (!this.catalogQuick);
      const isActive = (k) => (this.catalogQuick === k);

      host.innerHTML = `
        <div class="parts-filters-inner">
          <div class="chip-row" aria-label="快速篩選">
            ${this._chipHtml('全部', { active: allActive, tone: 'primary', attrs: 'data-action="quickFilter" data-filter=""' })}
            ${this._chipHtml('啟用', { active: isActive('ACTIVE'), tone: 'success', attrs: 'data-action="quickFilter" data-filter="ACTIVE"' })}
            ${this._chipHtml('停用', { active: isActive('INACTIVE'), tone: 'neutral', attrs: 'data-action="quickFilter" data-filter="INACTIVE"' })}
            ${this._chipHtml('缺料', { active: isActive('ZERO'), tone: 'danger', attrs: 'data-action="quickFilter" data-filter="ZERO"' })}
            ${this._chipHtml('低庫存', { active: isActive('LOW'), tone: 'warning', attrs: 'data-action="quickFilter" data-filter="LOW"' })}
          </div>

          <div class="filter-row">
            <div class="filter-group">
              <label class="form-label">狀態</label>
              <select class="input" data-filter-role="catalogStatus">
                <option value="" ${this.catalogQuick ? '' : 'selected'}>全部</option>
                <option value="ACTIVE" ${this.catalogQuick === 'ACTIVE' ? 'selected' : ''}>啟用</option>
                <option value="INACTIVE" ${this.catalogQuick === 'INACTIVE' ? 'selected' : ''}>停用</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="form-label">排序</label>
              <select class="input" data-filter-role="sort">
                <option value="updatedAt_desc" ${this.sortKey === 'updatedAt_desc' ? 'selected' : ''}>最近更新</option>
                <option value="stockQty_asc" ${this.sortKey === 'stockQty_asc' ? 'selected' : ''}>庫存（少→多）</option>
                <option value="stockQty_desc" ${this.sortKey === 'stockQty_desc' ? 'selected' : ''}>庫存（多→少）</option>
                <option value="unitPrice_desc" ${this.sortKey === 'unitPrice_desc' ? 'selected' : ''}>單價（高→低）</option>
                <option value="name_asc" ${this.sortKey === 'name_asc' ? 'selected' : ''}>名稱（A→Z）</option>
              </select>
            </div>
          </div>

          <div class="muted parts-filters-hint">提示：低庫存門檻為 ≤ 2（僅針對「啟用」零件）。</div>
        </div>
      `;
      return;
    }

    // tracker
    const statuses = (AppConfig?.business?.partStatus || []).map(s => s.value);
    const isAll = (!this.filterStatus && !this.filterOverdue && !this.filterOpenOnly);
    const isStatus = (v) => (this.filterStatus === v && !this.filterOverdue && !this.filterOpenOnly);

    host.innerHTML = `
      <div class="parts-filters-inner">
        <div class="chip-row" aria-label="快速篩選">
          ${this._chipHtml('全部', { active: isAll, tone: 'primary', attrs: 'data-action="quickFilter" data-filter=""' })}
          ${this._chipHtml('待處理', { active: this.filterOpenOnly, tone: 'accent', attrs: 'data-action="quickFilter" data-filter="OPEN"' })}
          ${statuses.map(v => {
            const active = isStatus(v);
            return this._chipHtml(v, { active, tone: this._toneForPartStatus(v), attrs: `data-action="quickFilter" data-filter="${this._escapeAttr(v)}"` });
          }).join('')}
          ${this._chipHtml('逾期', { active: this.filterOverdue, tone: 'warning', attrs: 'data-action="quickFilter" data-filter="OVERDUE"' })}
        </div>

        <div class="filter-row">
          <div class="filter-group">
            <label class="form-label">狀態（詳細）</label>
            <select class="input" data-filter-role="status">
              <option value="" ${this.filterStatus ? '' : 'selected'}>全部</option>
              ${statuses.map(v => `<option value="${this._escapeAttr(v)}" ${this.filterStatus === v ? 'selected' : ''}>${this._escapeHtml(v)}</option>`).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label class="form-label">關聯維修單</label>
            <select class="input" data-filter-role="repair">
              ${this._renderRepairFilterOptions()}
            </select>
          </div>

          <div class="filter-group">
            <label class="form-label">排序</label>
            <select class="input" data-filter-role="sort">
              <option value="updatedAt_desc" ${this.sortKey === 'updatedAt_desc' ? 'selected' : ''}>最近更新</option>
              <option value="expectedDate_asc" ${this.sortKey === 'expectedDate_asc' ? 'selected' : ''}>預計（近→遠）</option>
              <option value="status_asc" ${this.sortKey === 'status_asc' ? 'selected' : ''}>狀態（A→Z）</option>
              <option value="amount_desc" ${this.sortKey === 'amount_desc' ? 'selected' : ''}>金額（高→低）</option>
            </select>
          </div>

          <div class="filter-group" style="align-self:end;">
            ${this.contextRepairId ? `<button class="btn" data-action="clearRepairFilter">清除維修單篩選</button>` : ''}
          </div>
        </div>

        <div class="muted parts-filters-hint">提示：可用「待處理 / 逾期 / 狀態」chips 快速切換；再用排序縮小範圍。</div>
      </div>
    `;
  }

  _renderRepairFilterOptions() {
    const RepairService = this._svc('RepairService');
    const repairs = (RepairService && typeof RepairService.getAll === 'function')
      ? RepairService.getAll().filter(r => r && !r.isDeleted)
      : [];

    const options = [`<option value="" ${this.contextRepairId ? '' : 'selected'}>全部</option>`];
    repairs.slice(0, 400).forEach(r => {
      const label = `${r.repairNo || r.id} · ${(r.customer || '').toString()} · ${(r.machine || '').toString()}`;
      options.push(`<option value="${this._escapeAttr(r.id)}" ${this.contextRepairId === r.id ? 'selected' : ''}>${this._escapeHtml(label)}</option>`);
    });
    return options.join('');
  }

  _renderList() {
    const host = document.getElementById('parts-list');
    if (!host) return;
    if (this.view === 'catalog') {
      host.innerHTML = this._renderCatalog();
    } else {
      host.innerHTML = this._renderTracker();
    }
  }


  _renderTracker() {
    const baseRows = this._getTrackerBaseRows();
    let rows = (baseRows || []).slice();
    // 已改為「案例」維度（repairId）
    if (this.filterOverdue) rows = rows.filter(c => !!c?.isOverdue);
    if (this.filterOpenOnly) rows = rows.filter(c => !!c?.isOpen);
    if (this.filterStatus) rows = rows.filter(c => (c?.status || '').toString().trim() === this.filterStatus);

    rows = this._sortTrackerRows(rows);

    if (!rows.length) return this._renderEmptyState('目前沒有符合條件的零件主檔資料。', '🧰');

    // 若查詢條件改變，重置分頁顯示數量
    const sig = `${this.view}|${this.filterStatus}|${this.filterOverdue ? '1' : '0'}|${this.filterOpenOnly ? '1' : '0'}|${this.sortKey}|${this.contextRepairId || ''}`;
    if (sig !== this._querySig) {
      this._querySig = sig;
      this.visibleCount = (window.ListPaging && typeof window.ListPaging.resetVisibleCount === 'function')
        ? window.ListPaging.resetVisibleCount(this.pageSize)
        : (this.pageSize || 60);
    }

    const total = rows.length;
    const visible = rows.slice(0, Math.min(this.visibleCount || this.pageSize || 60, total));
    const hasMore = visible.length < total;

    const token = ++this._renderToken;

    // Shell：先出骨架，再增量塞卡片
    const shell = `
      <div class="parts-tracker-shell">
        <div class="card-list parts-tracker-cards is-rendering" id="parts-tracker-cards">${this._renderLoadingCards()}</div>
        <div class="parts-list-footer">
          <div class="muted">已顯示 <span class="mono">${visible.length}</span> / <span class="mono">${total}</span></div>
          <div>
            ${hasMore ? `<button class="btn" data-action="loadMore">顯示更多</button>` : `<span class="muted">已顯示全部</span>`}
          </div>
        </div>
      </div>
    `;

    // 延後真正渲染（避免同步 return 大量字串）
    try {
      requestAnimationFrame(() => {
        const cardsEl = document.getElementById('parts-tracker-cards');
        if (!cardsEl) return;
        this.renderCardsIncrementally(visible, cardsEl, token);
      });
    } catch (_) {}

    return shell;
  }

  _renderLoadingCards() {
    const isMobile = (window.AppConfig && window.AppConfig.device && typeof window.AppConfig.device.isMobile === 'function')
      ? window.AppConfig.device.isMobile()
      : (window.innerWidth <= 640);
    const n = isMobile ? 6 : 8;
    return Array.from({ length: n }).map(() => `
      <div class="card accent-left placeholder" style="--module-accent:rgba(148,163,184,0.7);--module-accent-soft:rgba(148,163,184,0.12);--accent-opacity:.45;">
        <div class="card-head">
          <div style="min-width:0;flex:1">
            <div class="ph ph-line w-40"></div>
            <div class="ph ph-line w-70" style="margin-top:10px;"></div>
          </div>
          <div class="ph ph-badges" style="margin-left:12px;"></div>
        </div>
        <div class="card-body">
          <div class="ph ph-line w-90"></div>
          <div class="ph ph-line w-60" style="margin-top:10px;"></div>
        </div>
      </div>
    `).join('');
  }

  renderCardsIncrementally(rows, cardsEl, token) {
    if (!cardsEl) return;
    const list = Array.isArray(rows) ? rows : [];

    // 若 token 已變更（新的渲染請求），直接停止
    const isValid = () => token === this._renderToken;

    const total = list.length;
    const batchSize = Number(AppConfig?.system?.performance?.incrementalRenderBatchSize || 50);
    const frameBudgetMs = 10;

    let i = 0;
    let cleared = false; // Phase 4 Fix: first frame must clear placeholder skeletons
    const step = () => {
      if (!isValid()) return;

      // 清空骨架（placeholder）只做一次；避免出現「一堆空白卡」
      if (!cleared) {
        cardsEl.innerHTML = '';
        cleared = true;
      }

      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      let html = '';

      for (let c = 0; c < batchSize && i < total; c++, i++) {
        html += this._renderTrackerCard(list[i]);
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if ((now - t0) >= frameBudgetMs) break;
      }

      if (!isValid()) return;

      if (html) cardsEl.insertAdjacentHTML('beforeend', html);

      if (i < total) {
        requestAnimationFrame(step);
      } else {
        cardsEl.classList.remove('is-rendering');
      }
    };

    cardsEl.classList.add('is-rendering');
    requestAnimationFrame(step);
  }

  async loadMore() {
    const y = (typeof window !== 'undefined') ? (window.scrollY || 0) : 0;
    this.visibleCount = (window.ListPaging && typeof window.ListPaging.nextVisibleCount === 'function')
      ? window.ListPaging.nextVisibleCount(this.visibleCount, this.pageSize)
      : ((this.visibleCount || this.pageSize || 60) + (this.pageSize || 60));
    this._renderList();
    try {
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'auto' }));
    } catch (_) {}
  }

  _renderTrackerCard(c) {
    const rid = (c?.repairId || '').toString().trim();
    const RepairService = this._svc('RepairService');
    const repair = RepairService?.get?.(rid) || null;
    const repairNo = (repair?.repairNo || rid || '').toString();
    const customer = (repair?.customer || '').toString();
    const machine = (repair?.machine || '').toString();
    const labelTop = `${customer || '-'}${machine ? ' · ' + machine : ''}`;

    const safeRid = this._escapeAttr(rid);

    const isOverdue = !!c?.isOverdue;
    const accent = isOverdue ? { accent: '#b45309', soft: 'rgba(217,119,6,.15)' } : this._accentForPartStatus(c?.status);

    const items = Array.isArray(c?.items) ? c.items : [];
    const preview = (() => {
      const max = 4;
      const list = items.slice(0, max).map(it => {
        const name = (it?.partName || '(未命名零件)').toString();
        const qty = (it?.qty || 1);
        const unit = (it?.unit || 'pcs');
        const st = (it?.status || '').toString().trim();
        return `${name} ×${qty} ${unit}${st ? `（${st}）` : ''}`;
      });
      if (items.length > max) list.push(`...（+${items.length - max}）`);
      return list.join(' / ');
    })();

    const qids = Array.isArray(c?.quoteIds) ? c.quoteIds.filter(Boolean) : [];
    const oids = Array.isArray(c?.orderIds) ? c.orderIds.filter(Boolean) : [];
    const qidOne = (qids.length === 1) ? qids[0] : '';
    const oidOne = (oids.length === 1) ? oids[0] : '';

    const updated = (c?.updatedAt || '').toString().slice(0, 10);

    return `
      <div class="card accent-left" style="--module-accent:${this._escapeAttr(accent.accent)};--module-accent-soft:${this._escapeAttr(accent.soft)};${isOverdue ? '--accent-opacity:.95;' : '--accent-opacity:.70;'}">
        <div class="card-head">
          <div style="min-width:0;">
            <div class="card-title">${this._escapeHtml(repairNo || rid)}</div>
            <div class="muted parts-card-sub">${this._escapeHtml(labelTop)}</div>
          </div>
          <div class="card-head-right">
            ${isOverdue ? `<span class="badge custom" style="--badge-color:#b45309;">逾期</span>` : ''}
            <span class="badge custom" style="--badge-color:${this._escapeAttr(accent.accent)};">${this._escapeHtml((c?.status || '需求提出'))}</span>
            <span class="badge">${this._escapeHtml(c?.totalItems || 0)} 項</span>
            <span class="badge">${this._escapeHtml(c?.totalQty || 0)} pcs</span>
            <span class="badge">$ ${this._escapeHtml(Math.round(Number(c?.totalAmount || 0) * 100) / 100)}</span>
          </div>
        </div>

        <div class="card-body">
          <div class="meta-grid">
            <div class="meta-item"><div class="meta-k">待處理</div><div class="meta-v">${this._escapeHtml(c?.openItems || 0)} 項</div></div>
            <div class="meta-item"><div class="meta-k">預計最早</div><div class="meta-v">${this._escapeHtml(c?.expectedDate || '-')}</div></div>
            <div class="meta-item"><div class="meta-k">最後更新</div><div class="meta-v">${this._escapeHtml(updated || '-')}</div></div>
            ${qids.length ? `<div class="meta-item"><div class="meta-k">報價</div><div class="meta-v">${this._escapeHtml(qidOne || ('多筆（' + qids.length + '）'))}</div></div>` : ''}
            ${oids.length ? `<div class="meta-item"><div class="meta-k">訂單</div><div class="meta-v">${this._escapeHtml(oidOne || ('多筆（' + oids.length + '）'))}</div></div>` : ''}
          </div>
          ${preview ? `<div class="muted" style="margin-top:8px;white-space:normal;line-height:1.4;">${this._escapeHtml(preview)}</div>` : ''}
        </div>

        <div class="card-foot">
          <button class="btn sm" onclick="PartsUI.openRepairPartsEditor('${safeRid}')">編輯用料/更換</button>
          ${qidOne ? `<button class="btn sm" onclick="PartsUI.openQuote('${this._escapeAttr(qidOne)}')">開啟報價</button>` : ''}
          ${oidOne ? `<button class="btn sm" onclick="PartsUI.openOrder('${this._escapeAttr(oidOne)}')">開啟訂單</button>` : ''}
          <button class="btn sm" onclick="PartsUI.openRepair('${safeRid}')">開啟維修單</button>
          <button class="btn sm danger" onclick="PartsUI.confirmRemoveRepairCase('${safeRid}')">刪除案例</button>
        </div>
      </div>
    `;
  }

  _sortTrackerRows(rows) {
    const out = Array.isArray(rows) ? rows.slice() : [];
    const key = (this.sortKey || 'updatedAt_desc').toString();
    const safe = (v) => (v === undefined || v === null) ? '' : String(v);
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const dateAsc = (v) => {
      const s = safe(v).slice(0, 10);
      return s ? s : '9999-99-99';
    };

    out.sort((a, b) => {
      if (key === 'expectedDate_asc') {
        const da = dateAsc(a?.expectedDate);
        const db = dateAsc(b?.expectedDate);
        const c = da.localeCompare(db);
        if (c !== 0) return c;
      }
      if (key === 'status_asc') {
        const sa = safe(a?.status);
        const sb = safe(b?.status);
        const c = sa.localeCompare(sb);
        if (c !== 0) return c;
      }
      if (key === 'amount_desc') {
        // 案例總金額（repair_case）
        const ta = num(a?.totalAmount);
        const tb = num(b?.totalAmount);
        if (tb !== ta) return tb - ta;
      }
      // default: updatedAt desc
      return safe(b?.updatedAt).localeCompare(safe(a?.updatedAt));
    });

    return out;
  }

  _renderCatalog() {
    const baseRows = this._getCatalogBaseRows();
    let rows = (baseRows || []).slice();
    const active = (p) => (p && p.isActive !== false);
    const qty = (p) => {
      const n = Number(p?.stockQty);
      return Number.isFinite(n) ? n : 0;
    };

    if (this.catalogQuick === 'ACTIVE') rows = rows.filter(p => active(p));
    if (this.catalogQuick === 'INACTIVE') rows = rows.filter(p => p && p.isActive === false);
    if (this.catalogQuick === 'ZERO') rows = rows.filter(p => active(p) && qty(p) <= 0);
    if (this.catalogQuick === 'LOW') rows = rows.filter(p => active(p) && qty(p) > 0 && qty(p) <= 2);

    rows = this._sortCatalogRows(rows);

    if (!rows.length) return this._renderEmptyState('目前沒有符合條件的用料追蹤案件。', '📦');

    return `
      <div class="card-list">
        ${rows.map(p => {
          const safeId = this._escapeAttr(p.id);
          const acc = this._accentForStock(p);
          const isActive = (p.isActive !== false);
          const stock = qty(p);
          const note = (p.note || '').toString().trim();
          const updated = (p.updatedAt || '').toString().slice(0, 10);

          return `
            <div class="card accent-left" style="--module-accent:${this._escapeAttr(acc.accent)};--module-accent-soft:${this._escapeAttr(acc.soft)};--accent-opacity:.75;">
              <div class="card-head">
                <div style="min-width:0;">
                  <div class="card-title">${this._escapeHtml(p.name || '(未命名零件)')}</div>
                  <div class="muted parts-card-sub">${this._escapeHtml(p.mpn || '')}${p.vendor ? ' · ' + this._escapeHtml(p.vendor) : ''}</div>
                </div>
                <div class="card-head-right">
                  ${!isActive ? `<span class="badge custom" style="--badge-color:#64748b;">停用</span>` : ''}
                  <span class="badge custom" style="--badge-color:${this._escapeAttr(acc.accent)};">庫存 ${this._escapeHtml(stock)}</span>
                  <span class="badge">$ ${this._escapeHtml(p.unitPrice || 0)}</span>
                </div>
              </div>
              <div class="card-body">
                <div class="meta-grid">
                  <div class="meta-item"><div class="meta-k">單位</div><div class="meta-v">${this._escapeHtml(p.unit || 'pcs')}</div></div>
                  <div class="meta-item"><div class="meta-k">更新</div><div class="meta-v">${this._escapeHtml(updated || '-')}</div></div>
                </div>
                ${note ? `<div class="muted" style="margin-top:8px;white-space:normal;line-height:1.4;">備註：${this._escapeHtml(note)}</div>` : ''}
              </div>
              <div class="card-foot">
                <button class="btn sm" onclick="PartsUI.openEditPart('${safeId}')">編輯</button>
                ${isActive ? `<button class="btn sm danger" onclick="PartsUI.confirmDeactivate('${safeId}')">停用</button>` : `<button class="btn sm" disabled>已停用</button>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  _sortCatalogRows(rows) {
    const out = Array.isArray(rows) ? rows.slice() : [];
    const key = (this.sortKey || 'updatedAt_desc').toString();
    const safe = (v) => (v === undefined || v === null) ? '' : String(v);
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    out.sort((a, b) => {
      if (key === 'stockQty_asc') {
        const d = num(a?.stockQty) - num(b?.stockQty);
        if (d !== 0) return d;
      }
      if (key === 'stockQty_desc') {
        const d = num(b?.stockQty) - num(a?.stockQty);
        if (d !== 0) return d;
      }
      if (key === 'unitPrice_desc') {
        const d = num(b?.unitPrice) - num(a?.unitPrice);
        if (d !== 0) return d;
      }
      if (key === 'name_asc') {
        const d = safe(a?.name).localeCompare(safe(b?.name));
        if (d !== 0) return d;
      }
      return safe(b?.updatedAt).localeCompare(safe(a?.updatedAt));
    });
    return out;
  }

  openModal(html) {
    const modal = document.getElementById('parts-modal');
    const content = document.getElementById('parts-modal-content');
    if (!modal || !content) return;
    content.innerHTML = html;
    modal.hidden = false;
    try { content.scrollTop = 0; } catch (_) {}

    // P3：必填欄位即時驗證（modal 開啟時綁定一次，並清除舊的 invalid 狀態）
    try {
      const form = content.querySelector('form');
      if (form && window.FormValidate) {
        window.FormValidate.bindForm(form);
        window.FormValidate.resetForm(form);
      }
    } catch (e) {
      console.warn('FormValidate bind failed:', e);
    }
  }

  closeModal() {
    const modal = document.getElementById('parts-modal');
    const content = document.getElementById('parts-modal-content');
    if (content) content.innerHTML = '';
    if (modal) modal.hidden = true;
  }

  _renderFormDialog({ title = '', contextHtml = '', bodyHtml = '', submitLabel = '儲存', width = '960px', submitAction = 'PartsUI.handleCreate(event)' } = {}) {
    return `
      <div class="modal-dialog parts-editor-dialog" style="max-width:${this._escapeAttr(width)};">
        <div class="modal-header">
          <h3>${this._escapeHtml(title)}</h3>
          <button class="modal-close" data-action="closeModal">✕</button>
        </div>
        <form class="modal-body modal-body-has-sticky-footer parts-editor-form" data-submit-action="handleCreate">
          ${contextHtml}
          <div class="parts-editor-sections">${bodyHtml}</div>
          <div class="modal-footer sticky">
            <button class="btn" type="button" data-action="closeModal">取消</button>
            <button class="btn primary" type="submit">${this._escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </div>
    `;
  }

  _renderCatalogEditorContext(part = null, mode = 'create') {
    const p = part ? PartModel.normalize(part) : PartModel.normalize({});
    const qty = Number(p.stockQty);
    const stockState = p.isActive === false
      ? '已停用'
      : (!Number.isFinite(qty) ? '待建檔' : (qty <= 0 ? '缺料' : (qty <= 2 ? '低庫存' : '正常')));
    const vendor = String(p.vendor || '').trim() || '未指定廠商';
    const unit = String(p.unit || '').trim() || '未指定單位';
    return `
      <div class="form-context-bar parts-editor-context" aria-label="零件主檔摘要">
        <div class="context-item"><span class="context-label">模式</span><strong class="context-value">${mode === 'edit' ? '編輯零件主檔' : '新增零件主檔'}</strong></div>
        <div class="context-item"><span class="context-label">庫存狀態</span><strong class="context-value">${this._escapeHtml(stockState)}</strong></div>
        <div class="context-item"><span class="context-label">廠商</span><strong class="context-value">${this._escapeHtml(vendor)}</strong></div>
        <div class="context-item"><span class="context-label">單位</span><strong class="context-value">${this._escapeHtml(unit)}</strong></div>
      </div>
    `;
  }

  _renderTrackerEditorContext(item = null, mode = 'create') {
    const it = item ? RepairPartModel.normalize(item.repairId, item) : RepairPartModel.normalize(this.contextRepairId || '', {});
    const repairLabel = String(it.repairId || this.contextRepairId || '').trim() || '尚未指定維修單';
    const statusMeta = (window.AppConfig && typeof window.AppConfig.getBusinessStatusMeta === 'function')
      ? window.AppConfig.getBusinessStatusMeta('part', it.status)
      : null;
    const statusLabel = statusMeta?.label || it.status || '待確認';
    const expected = String(it.expectedDate || '').trim() || '未設定';
    return `
      <div class="form-context-bar parts-editor-context" aria-label="用料追蹤摘要">
        <div class="context-item"><span class="context-label">模式</span><strong class="context-value">${mode === 'edit' ? '編輯用料追蹤' : '新增用料追蹤'}</strong></div>
        <div class="context-item"><span class="context-label">維修單</span><strong class="context-value">${this._escapeHtml(repairLabel)}</strong></div>
        <div class="context-item"><span class="context-label">狀態</span><strong class="context-value">${this._escapeHtml(statusLabel)}</strong></div>
        <div class="context-item"><span class="context-label">預計節點</span><strong class="context-value">${this._escapeHtml(expected)}</strong></div>
      </div>
    `;
  }

  _renderBatchEditorContext(repairId = '') {
    const rid = String(repairId || '').trim() || '尚未指定';
    return `
      <div class="form-context-bar parts-editor-context" aria-label="批次編輯摘要">
        <div class="context-item"><span class="context-label">模式</span><strong class="context-value">批次編輯用料 / 更換</strong></div>
        <div class="context-item"><span class="context-label">維修單</span><strong class="context-value">${this._escapeHtml(rid)}</strong></div>
        <div class="context-item"><span class="context-label">儲存策略</span><strong class="context-value">空白列自動忽略</strong></div>
        <div class="context-item"><span class="context-label">用途</span><strong class="context-value">需求 → 報價 → 下單 → 到貨 → 更換</strong></div>
      </div>
    `;
  }

  renderCreateModal() {
    const isCatalog = this.view === 'catalog';
    const title = isCatalog ? '新增零件主檔' : '新增用料 / 更換追蹤';
    const contextHtml = isCatalog
      ? this._renderCatalogEditorContext(null, 'create')
      : this._renderTrackerEditorContext(null, 'create');
    const bodyHtml = isCatalog ? this._renderPartForm() : this._renderRepairPartForm();
    return this._renderFormDialog({
      title,
      contextHtml,
      bodyHtml,
      width: isCatalog ? '980px' : '1040px'
    });
  }

  // tracker：批次新增/編輯（同一維修單可多筆）
  _renderRepairPartsBatchModal(repairId = '', focusItemId = '') {
    const escape = (x) => this._escapeAttr(x || '');
    const RepairService = this._svc('RepairService');
    const repairs = (RepairService && typeof RepairService.getAll === 'function')
      ? RepairService.getAll().filter(r => r && !r.isDeleted)
      : [];

    const rid = (repairId || this.contextRepairId || '').toString().trim();
    const repairOptions = repairs.slice(0, 600).map(r => {
      const label = `${r.repairNo || r.id} · ${(r.customer || '').toString()} · ${(r.machine || '').toString()}`;
      return `<option value="${escape(r.id)}" ${rid === r.id ? 'selected' : ''}>${this._escapeHtml(label)}</option>`;
    }).join('');

    // 初始化批次 state
    this._batchState = { repairId: rid, deletedIds: [] };

    return `
      <div class="modal-dialog parts-editor-dialog" style="max-width:1180px;">
        <div class="modal-header">
          <h3>編輯用料 / 更換（多筆）</h3>
          <button class="modal-close" data-action="closeModal">✕</button>
        </div>

        <form class="modal-body modal-body-has-sticky-footer parts-editor-form" data-submit-action="handleBatchSave">
          ${this._renderBatchEditorContext(rid)}

          <div class="parts-editor-sections">
            <div class="form-section parts-form-section">
              ${this._sectionHeaderHtml('關聯維修單', '批次編輯以單一維修單為單位，避免多案例交叉覆寫。', { eyebrow: 'Batch Scope' })}
              <div class="form-grid">
                <div class="form-group" style="grid-column:1/-1;">
                  <label class="form-label required">維修單</label>
                  <select class="input" id="parts-batch-repair" name="repairId" required data-filter-role="batchRepair">
                    <option value="">請選擇</option>
                    ${repairOptions}
                  </select>
                  <div class="muted parts-inline-help">同一張維修單可同時新增、修改與刪除多筆用料追蹤；空白列會自動忽略。</div>
                </div>
              </div>
            </div>

            <div class="form-section parts-form-section">
              ${this._sectionHeaderHtml('用料 / 更換清單', '狀態、日期與備註集中在同一張批次表單維護，避免單筆進出多次 modal。', { eyebrow: 'Batch Detail', className: 'has-actions', actionsHtml: '<div class="rparts-batch-actions"><button class="btn" type="button" data-action="addBatchRow">＋ 新增一項</button></div>' })}

              <div id="parts-batch-rows" class="rparts-batch-rows"></div>
            </div>
          </div>

          <input type="hidden" id="parts-batch-focus" value="${escape(focusItemId)}" />

          <div class="modal-footer sticky">
            <button class="btn" type="button" data-action="closeModal">取消</button>
            <button class="btn primary" type="submit">儲存</button>
          </div>
        </form>
      </div>
    `;
  }

  _renderBatchRow(item = null, opts = {}) {
    const it = item ? RepairPartModel.normalize(item.repairId, item) : RepairPartModel.normalize(this._batchState?.repairId || '', {});
    const escape = (x) => this._escapeAttr(x || '');
    const statuses = (AppConfig?.business?.partStatus || []).map(s => s.value);
    const isFocus = !!opts.focus;

    const domId = item ? (it.id || '') : '';
    return `
      <div class="rparts-line ${isFocus ? 'focus' : ''}" data-id="${escape(domId)}" data-existing="${item ? '1' : '0'}" data-deleted="0">
        <div class="rparts-line-head">
          <div class="rparts-line-title">${this._escapeHtml(it.partName || (item ? '(未命名零件)' : '新零件'))}</div>
          <div class="rparts-line-actions">
            <button class="btn sm danger" type="button" data-action="removeBatchRow">刪除</button>
          </div>
        </div>

        <div class="rparts-line-grid">
          <div class="form-group col-6">
            <label class="form-label required">零件名稱</label>
            <input class="input" data-field="partName" value="${escape(it.partName)}" placeholder="例如：Chamber Oring" />
          </div>
          <div class="form-group col-4">
            <label class="form-label">MPN / P/N</label>
            <input class="input" data-field="mpn" value="${escape(it.mpn)}" />
          </div>
          <div class="form-group col-2">
            <label class="form-label">數量</label>
            <input class="input" data-field="qty" type="number" step="1" min="0" inputmode="numeric" value="${escape(it.qty)}" />
          </div>

          <div class="form-group col-4">
            <label class="form-label">廠商</label>
            <input class="input" data-field="vendor" value="${escape(it.vendor)}" />
          </div>
          <div class="form-group col-2">
            <label class="form-label">單位</label>
            <input class="input" data-field="unit" value="${escape(it.unit)}" placeholder="pcs" />
          </div>
          <div class="form-group col-3">
            <label class="form-label">狀態</label>
            <select class="input" data-field="status">
              ${statuses.map(v => `<option value="${escape(v)}" ${String(it.status || '') === v ? 'selected' : ''}>${this._escapeHtml(v)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group col-3">
            <label class="form-label">預計</label>
            <input class="input" data-field="expectedDate" value="${escape(it.expectedDate)}" placeholder="YYYY-MM-DD" />
          </div>
          <div class="form-group col-3">
            <label class="form-label">到貨</label>
            <input class="input" data-field="arrivedDate" value="${escape(it.arrivedDate)}" placeholder="YYYY-MM-DD" />
          </div>
          <div class="form-group col-3">
            <label class="form-label">更換</label>
            <input class="input" data-field="replacedDate" value="${escape(it.replacedDate)}" placeholder="YYYY-MM-DD" />
          </div>
          <div class="form-group col-12">
            <label class="form-label">備註</label>
            <textarea class="input" data-field="note" rows="2">${this._escapeHtml(it.note || '')}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  _mountBatchRows(repairId = '', focusItemId = '') {
    const rid = (repairId || '').toString().trim();
    const host = document.getElementById('parts-batch-rows');
    if (!host) return;

    this._batchState = this._batchState || { repairId: '', deletedIds: [] };
    this._batchState.repairId = rid;

    const RepairPartsService = this._svc('RepairPartsService');
    const items = (RepairPartsService && typeof RepairPartsService.getForRepair === 'function' && rid)
      ? RepairPartsService.getForRepair(rid)
      : [];

    const focus = (focusItemId || '').toString().trim();
    const html = [];
    if (items.length) {
      items
        .slice()
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        .forEach(it => html.push(this._renderBatchRow(it, { focus: focus && it.id === focus })));
    } else {
      html.push(this._renderBatchRow(null, { focus: false }));
    }
    host.innerHTML = html.join('');

    // 若有 focus，捲動至該列
    if (focus) {
      setTimeout(() => {
        try {
          const el = host.querySelector(`.rparts-line[data-id="${this._escapeAttr(focus)}"]`);
          if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch (_) {}
      }, 0);
    }
  }

  _renderPartForm(part = null) {
    const p = part ? PartModel.normalize(part) : PartModel.normalize({});
    const escape = (x) => this._escapeAttr(x || '');
    return `
      <input type="hidden" name="kind" value="catalog" />
      <input type="hidden" name="id" value="${escape(p.id)}" />
      <div class="form-section parts-form-section">
        ${this._sectionHeaderHtml('基本資料', '建立零件主檔時先確認名稱、MPN 與廠商，後續庫存與報價才不會分裂成多筆名稱相近資料。', { eyebrow: 'Catalog Base' })}
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1;">
            <label class="form-label required">零件名稱</label>
            <input class="input" name="name" value="${escape(p.name)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">MPN / P/N</label>
            <input class="input" name="mpn" value="${escape(p.mpn)}" />
          </div>
          <div class="form-group">
            <label class="form-label">廠商</label>
            <input class="input" name="vendor" value="${escape(p.vendor)}" />
          </div>
          <div class="form-group">
            <label class="form-label">單位</label>
            <input class="input" name="unit" value="${escape(p.unit)}" placeholder="pcs" />
          </div>
        </div>
      </div>

      <div class="form-section parts-form-section">
        ${this._sectionHeaderHtml('庫存與價格', '庫存與單價作為後續零件追蹤與採購估算的基底資料。', { eyebrow: 'Inventory' })}
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">單價</label>
            <input class="input" name="unitPrice" type="number" step="1" min="0" inputmode="numeric" value="${escape(p.unitPrice)}" />
          </div>
          <div class="form-group">
            <label class="form-label">庫存</label>
            <input class="input" name="stockQty" type="number" step="1" value="${escape(p.stockQty)}" />
          </div>
        </div>
      </div>

      <div class="form-section parts-form-section">
        ${this._sectionHeaderHtml('備註', '可記錄採購來源、替代料號或安裝注意事項。', { eyebrow: 'Note' })}
        <div class="form-group">
          <label class="form-label">備註</label>
          <textarea class="input" name="note" rows="3">${this._escapeHtml(p.note || '')}</textarea>
        </div>
      </div>
    `;
  }

  _renderRepairPartForm(item = null) {
    const it = item ? RepairPartModel.normalize(item.repairId, item) : RepairPartModel.normalize(this.contextRepairId || '', {});
    const statuses = (AppConfig?.business?.partStatus || []).map(s => s.value);
    const escape = (x) => this._escapeAttr(x || '');

    // repair select
    const RepairService = this._svc('RepairService');
    const repairs = (RepairService && typeof RepairService.getAll === 'function')
      ? RepairService.getAll().filter(r => r && !r.isDeleted)
      : [];
    const repairOptions = repairs.slice(0, 400).map(r => {
      const label = `${r.repairNo || r.id} · ${(r.customer || '').toString()} · ${(r.machine || '').toString()}`;
      return `<option value="${escape(r.id)}" ${it.repairId === r.id ? 'selected' : ''}>${this._escapeHtml(label)}</option>`;
    }).join('');

    return `
      <input type="hidden" name="kind" value="tracker" />
      <input type="hidden" name="id" value="${escape(it.id)}" />
      <div class="form-section parts-form-section">
        ${this._sectionHeaderHtml('關聯維修單', '先確認對應維修單，再填寫零件、交期與更換節點，避免同一零件掛錯案件。', { eyebrow: 'Repair Scope' })}
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1;">
            <label class="form-label required">維修單</label>
            <select class="input" name="repairId" required>
              <option value="">請選擇</option>
              ${repairOptions}
            </select>
          </div>
        </div>
      </div>

      <div class="form-section parts-form-section">
        ${this._sectionHeaderHtml('零件與流程節點', '零件名稱、狀態與日期放在同一區塊，讓需求 → 到貨 → 更換可在首屏直接追蹤。', { eyebrow: 'Workflow' })}
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1;">
            <label class="form-label required">零件名稱</label>
            <input class="input" name="partName" value="${escape(it.partName)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">MPN / P/N</label>
            <input class="input" name="mpn" value="${escape(it.mpn)}" />
          </div>
          <div class="form-group">
            <label class="form-label">廠商</label>
            <input class="input" name="vendor" value="${escape(it.vendor)}" />
          </div>
          <div class="form-group">
            <label class="form-label">數量</label>
            <input class="input" name="qty" type="number" step="1" value="${escape(it.qty)}" />
          </div>
          <div class="form-group">
            <label class="form-label">單位</label>
            <input class="input" name="unit" value="${escape(it.unit)}" placeholder="pcs" />
          </div>
          <div class="form-group">
            <label class="form-label">狀態</label>
            <select class="input" name="status">
              ${statuses.map(v => `<option value="${escape(v)}" ${it.status === v ? 'selected' : ''}>${this._escapeHtml(v)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">預計</label>
            <input class="input" name="expectedDate" value="${escape(it.expectedDate)}" placeholder="YYYY-MM-DD" />
          </div>
          <div class="form-group">
            <label class="form-label">到貨</label>
            <input class="input" name="arrivedDate" value="${escape(it.arrivedDate)}" placeholder="YYYY-MM-DD" />
          </div>
          <div class="form-group">
            <label class="form-label">更換</label>
            <input class="input" name="replacedDate" value="${escape(it.replacedDate)}" placeholder="YYYY-MM-DD" />
          </div>
        </div>
      </div>

      <div class="form-section parts-form-section">
        <div class="parts-form-section-head">
          <h4 class="form-section-title">備註</h4>
          <div class="muted">可補充替代料、採購限制或現場安裝狀況。</div>
        </div>
        <div class="form-group">
          <label class="form-label">備註</label>
          <textarea class="input" name="note" rows="3">${this._escapeHtml(it.note || '')}</textarea>
        </div>
      </div>
    `;
  }
}

const partsUI = new PartsUI();
if (typeof window !== 'undefined') {
  window.partsUI = partsUI;
}

Object.assign(PartsUI, {
  // P3：篩選面板（可摺疊 + 多條件）
  toggleFilters() {
    if (!window.partsUI) return;
    window.partsUI.toggleFiltersPanel();
  },

  clearFilters() {
    // 已改為方案2：清除立即套用
    PartsUI.clearAll();
  },

  setView(view) {
    if (!window.partsUI) return;
    const ui = window.partsUI;
    ui.view = view;
    ui.filtersPanelOpen = ui._loadFiltersPanelOpen(view);
    ui._applyFiltersPanelVisibility();
    // 切換分頁時重置「另一個分頁」的快速篩選，避免視覺/資料混淆
    if (view === 'catalog') {
      ui.filterStatus = ''; ui.filterStatusDraft = ''; 
      ui.filterOverdue = false;
      ui.filterOpenOnly = false;
      // catalog 預設排序
      if (!ui.sortKey || !['updatedAt_desc','stockQty_asc','stockQty_desc','unitPrice_desc','name_asc'].includes(ui.sortKey)) {
        ui.sortKey = 'updatedAt_desc';
      }
    } else {
      ui.catalogQuick = '';
      if (!ui.sortKey || !['updatedAt_desc','expectedDate_asc','status_asc','amount_desc'].includes(ui.sortKey)) {
        ui.sortKey = 'updatedAt_desc';
      }
    }
    ui.update();
  },

  onSearch(event) {
    // 已改為方案2：保留相容舊呼叫但不再即時套用
    const v = (event?.target?.value || '').toString();
    window.partsUI.searchDraft = v;
  },

  setStatusFilter(event) {
    if (!window.partsUI) return;
    const ui = window.partsUI;
    ui.filterStatusDraft = (event?.target?.value || '').toString().trim();
    ui.filterOverdueDraft = false;
    ui.filterOpenOnlyDraft = false;
  },

  setCatalogStatusFilter(event) {
    if (!window.partsUI) return;
    const ui = window.partsUI;
    ui.catalogQuickDraft = (event?.target?.value || '').toString().trim();
  },

  setQuickFilter(key) {
    if (!window.partsUI) return;
    const ui = window.partsUI;
    const k = (key || '').toString().trim();
    if (ui.view === 'catalog') {
      ui.catalogQuick = k;
      ui.catalogQuickDraft = k;
      ui.update();
      return;
    }

    // tracker
    if (!k) {
      ui.filterStatus = ''; ui.filterStatusDraft = ''; 
      ui.filterOverdue = false;
      ui.filterOpenOnly = false;
    } else if (k === 'OPEN') {
      ui.filterStatus = ''; ui.filterStatusDraft = ''; 
      ui.filterOverdue = false;
      ui.filterOpenOnly = true; ui.filterOpenOnlyDraft = true;
    } else if (k === 'OVERDUE') {
      ui.filterStatus = ''; ui.filterStatusDraft = ''; 
      ui.filterOverdue = true; ui.filterOverdueDraft = true;
      ui.filterOpenOnly = false;
    } else {
      ui.filterStatus = k; ui.filterStatusDraft = k;
      ui.filterOverdue = false;
      ui.filterOpenOnly = false;
    }
    ui.update();
  },

  setSort(event) {
    if (!window.partsUI) return;
    window.partsUI.sortKeyDraft = (event?.target?.value || '').toString().trim() || 'updatedAt_desc';
  },

  setRepairFilter(event) {
    if (!window.partsUI) return;
    window.partsUI.contextRepairIdDraft = (event?.target?.value || '').toString().trim();
  },

  clearRepairFilter() {
    if (!window.partsUI) return;
    window.partsUI.contextRepairIdDraft = '';
  },

  openCreate() {
    if (!window.partsUI) return;
    const ui = window.partsUI;
    if (ui.view !== 'catalog') {
      // tracker：以維修單為依據的多筆編輯/新增
      PartsUI.openRepairPartsEditor(ui.contextRepairId || '');
      return;
    }
    ui.openModal(ui.renderCreateModal());
  },

  // tracker：開啟批次編輯（同一維修單可多筆）
  openRepairPartsEditor(repairId = '', focusItemId = '') {
    if (!window.partsUI) return;
    const ui = window.partsUI;
    ui.view = 'tracker';
    ui.openModal(ui._renderRepairPartsBatchModal(repairId, focusItemId));

    // mount rows after modal inserted
    setTimeout(() => {
      try {
        const sel = document.getElementById('parts-batch-repair');
        const rid = (sel?.value || repairId || ui.contextRepairId || '').toString().trim();
        const focus = (focusItemId || document.getElementById('parts-batch-focus')?.value || '').toString().trim();
        ui._mountBatchRows(rid, focus);

        // title sync (partName → header)
        const host = document.getElementById('parts-batch-rows');
        if (host) {
          host.oninput = (e) => {
            const t = e?.target;
            if (!t || t.getAttribute('data-field') !== 'partName') return;
            const line = t.closest('.rparts-line');
            const title = line?.querySelector('.rparts-line-title');
            if (title) title.textContent = (t.value || '').trim() || '新零件';
          };
        }
      } catch (e) {
        console.warn('parts batch editor init failed:', e);
      }
    }, 0);
  },

  onBatchRepairChange(event) {
    if (!window.partsUI) return;
    const ui = window.partsUI;
    const rid = (event?.target?.value || '').toString().trim();
    ui._batchState = { repairId: rid, deletedIds: [] };
    ui._mountBatchRows(rid, '');
  },

  addBatchRow() {
    if (!window.partsUI) return;
    const ui = window.partsUI;
    const rid = (document.getElementById('parts-batch-repair')?.value || ui._batchState?.repairId || '').toString().trim();
    if (!rid) {
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('請先選擇維修單', { type: 'warning' });
      else alert('請先選擇維修單');
      return;
    }

    const host = document.getElementById('parts-batch-rows');
    if (!host) return;
    ui._batchState = ui._batchState || { repairId: rid, deletedIds: [] };
    ui._batchState.repairId = rid;

    host.insertAdjacentHTML('beforeend', ui._renderBatchRow(null, { focus: false }));
    const last = host.querySelector('.rparts-line:last-child');
    if (last && typeof last.scrollIntoView === 'function') last.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },

  removeBatchRow(btn) {
    if (!window.partsUI) return;
    const ui = window.partsUI;
    const line = btn?.closest?.('.rparts-line');
    if (!line) return;

    const isExisting = line.getAttribute('data-existing') === '1';
    const id = (line.getAttribute('data-id') || '').toString().trim();

    if (isExisting && id) {
      ui._batchState = ui._batchState || { repairId: '', deletedIds: [] };
      if (!ui._batchState.deletedIds.includes(id)) ui._batchState.deletedIds.push(id);
      line.setAttribute('data-deleted', '1');
      line.style.display = 'none';
    } else {
      try { line.remove(); } catch (_) { line.style.display = 'none'; }
    }
  },

  async handleBatchSave(event) {
    event.preventDefault();
    if (!window.partsUI) return;
    const ui = window.partsUI;
    const form = event.target;

    const rid = (document.getElementById('parts-batch-repair')?.value || ui._batchState?.repairId || '').toString().trim();
    if (!rid) {
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('請選擇維修單', { type: 'warning' });
      else alert('請選擇維修單');
      return;
    }

    const host = document.getElementById('parts-batch-rows');
    const lines = host ? Array.from(host.querySelectorAll('.rparts-line')) : [];

    const readField = (line, key) => {
      const el = line.querySelector(`[data-field="${key}"]`);
      return (el?.value ?? '').toString();
    };

    const isRowEmpty = (row) => {
      const keys = ['partName','mpn','vendor','qty','unit','status','expectedDate','arrivedDate','replacedDate','note'];
      return keys.every(k => {
        const v = readField(row, k);
        return !String(v || '').trim();
      });
    };

    // collect rows
    const errors = [];
    const payloads = [];
    lines.forEach((row, idx) => {
      if (row.getAttribute('data-deleted') === '1') return;
      if (isRowEmpty(row)) return;

      const partName = readField(row, 'partName').trim();
      if (!partName) {
        errors.push(`第 ${idx + 1} 筆：零件名稱必填`);
        return;
      }

      const qtyRaw = readField(row, 'qty');
      const qtyNum = Number(qtyRaw);
      const qty = Number.isFinite(qtyNum) ? qtyNum : 1;

      const status = readField(row, 'status').trim() || '需求提出';

      payloads.push({
        isExisting: row.getAttribute('data-existing') === '1',
        id: (row.getAttribute('data-id') || '').toString().trim(),
        data: {
          partName,
          mpn: readField(row, 'mpn').trim(),
          vendor: readField(row, 'vendor').trim(),
          qty,
          unit: readField(row, 'unit').trim(),
          status,
          expectedDate: readField(row, 'expectedDate').trim(),
          arrivedDate: readField(row, 'arrivedDate').trim(),
          replacedDate: readField(row, 'replacedDate').trim(),
          note: readField(row, 'note')
        }
      });
    });

    if (errors.length) {
      const msg = errors.slice(0, 4).join('\n') + (errors.length > 4 ? `\n...（共 ${errors.length} 項）` : '');
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'warning', duration: 5000 });
      else alert(msg);
      return;
    }

    try {
      const RepairPartsService = ui?._svc?.('RepairPartsService') || (typeof window._svc === 'function' ? window._svc('RepairPartsService') : null);

      // delete first
      const deleted = (ui._batchState?.deletedIds || []).slice();
      for (const id of deleted) {
        try { await RepairPartsService?.remove?.(rid, id); } catch (_) {}
      }

      // upsert
      for (const p of payloads) {
        if (p.isExisting && p.id) await RepairPartsService?.update?.(rid, p.id, p.data);
        else await RepairPartsService?.add?.(rid, p.data);
      }

      PartsUI.closeModal();
      await ui.update();
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('已儲存用料追蹤', { type: 'success' });
    } catch (e) {
      console.error(e);
      const msg = '儲存失敗：' + (e?.message || e);
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
      else alert(msg);
    }
  },

  closeModal() {
    window.partsUI?.closeModal();
  },

  async handleCreate(event) {
    event.preventDefault();
    const form = event.target;

    // P3：必填欄位即時驗證（僅針對既有 required 欄位）
    try {
      if (form && window.FormValidate) {
        window.FormValidate.bindForm(form);
        const ok = window.FormValidate.validateForm(form);
        if (!ok) {
          if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('請補齊必填欄位', { type: 'warning' });
          return;
        }
      } else if (form && typeof form.reportValidity === 'function') {
        if (!form.reportValidity()) return;
      }
    } catch (e) {
      console.warn('parts form validate failed:', e);
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const kind = data.kind;

    try {
      if (kind === 'catalog') {
        const PartService = window.partsUI?._svc?.('PartService') || (typeof window._svc === 'function' ? window._svc('PartService') : null);
        if (!PartService || typeof PartService.upsert !== 'function') throw new Error('PartService.upsert 未就緒');
        await PartService.upsert({
          id: (data.id || '').trim(),
          name: (data.name || '').trim(),
          mpn: (data.mpn || '').trim(),
          vendor: (data.vendor || '').trim(),
          unit: (data.unit || '').trim(),
          unitPrice: Number(data.unitPrice || 0),
          stockQty: Number(data.stockQty || 0),
          note: (data.note || '').toString()
        });
      } else {
        const payload = {
          id: (data.id || '').trim(),
          partName: (data.partName || '').trim(),
          mpn: (data.mpn || '').trim(),
          vendor: (data.vendor || '').trim(),
          qty: Number(data.qty || 1),
          unit: (data.unit || '').trim(),
          status: (data.status || '').trim(),
          expectedDate: (data.expectedDate || '').trim(),
          arrivedDate: (data.arrivedDate || '').trim(),
          replacedDate: (data.replacedDate || '').trim(),
          note: (data.note || '').toString()
        };
        const rid = (data.repairId || '').trim();
        if (!rid) throw new Error('請選擇維修單');

        const RepairPartsService = window.partsUI?._svc?.('RepairPartsService') || (typeof window._svc === 'function' ? window._svc('RepairPartsService') : null);

        // id 存在：視為 update
        if (payload.id && RepairPartsService?.getForRepair?.(rid)?.some(x => x.id === payload.id)) {
          await RepairPartsService?.update?.(rid, payload.id, payload);
        } else {
          delete payload.id;
          await RepairPartsService?.add?.(rid, payload);
        }
      }

      PartsUI.closeModal();
      await window.partsUI.update();
    } catch (e) {
      console.error(e);
      const msg = '儲存失敗：' + (e?.message || e);
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
      else alert(msg);
    }
  },

  openEditPart(partId) {
    const PartService = window.partsUI?._svc?.('PartService') || (typeof window._svc === 'function' ? window._svc('PartService') : null);
    const p = PartService?.get?.(partId);
    if (!p) return;
    window.partsUI.view = 'catalog';
    window.partsUI.openModal(window.partsUI._renderFormDialog({
      title: '編輯零件主檔',
      contextHtml: window.partsUI._renderCatalogEditorContext(p, 'edit'),
      bodyHtml: window.partsUI._renderPartForm(p),
      width: '980px'
    }));
  },

  async confirmDeactivate(partId) {
    {
      const msg = '確定停用此零件？';
      const ok = (window.UI && typeof window.UI.confirm === 'function')
        ? await window.UI.confirm({ title: '確認停用', message: msg, okText: '停用', cancelText: '取消', tone: 'danger' })
        : confirm(msg);
      if (!ok) return;
    }
    const PartService = window.partsUI?._svc?.('PartService') || (typeof window._svc === 'function' ? window._svc('PartService') : null);
    if (!PartService || typeof PartService.deactivate !== 'function') throw new Error('PartService.deactivate 未就緒');
    await PartService.deactivate(partId);
    await window.partsUI.update();
  },

  openEditRepairPart(repairId, itemId) {
    // 以維修單為依據：開啟同維修單多筆編輯，並聚焦指定 item
    PartsUI.openRepairPartsEditor(repairId, itemId);
  },

  async confirmRemoveRepairCase(repairId) {
    {
      const msg = '確定刪除此維修案例的用料/更換追蹤？\n\n（同一案例下所有項目將一併標記為刪除，可追溯）';
      const ok = (window.UI && typeof window.UI.confirm === 'function')
        ? await window.UI.confirm({ title: '確認刪除案例', message: msg, okText: '刪除', cancelText: '取消', tone: 'danger' })
        : confirm(msg);
      if (!ok) return;
    }
    const RepairPartsService = window.partsUI?._svc?.('RepairPartsService') || (typeof window._svc === 'function' ? window._svc('RepairPartsService') : null);
    if (!RepairPartsService || typeof RepairPartsService.removeAllForRepair !== 'function') throw new Error('RepairPartsService.removeAllForRepair 未就緒');
    await RepairPartsService.removeAllForRepair(repairId);
    await window.partsUI.update();
  },

  async confirmRemoveRepairPart(repairId, itemId) {
    {
      const msg = '確定刪除此筆用料追蹤？\n\n（可追溯，將標記為刪除）';
      const ok = (window.UI && typeof window.UI.confirm === 'function')
        ? await window.UI.confirm({ title: '確認刪除', message: msg, okText: '刪除', cancelText: '取消', tone: 'danger' })
        : confirm(msg);
      if (!ok) return;
    }
    const RepairPartsService = window.partsUI?._svc?.('RepairPartsService') || (typeof window._svc === 'function' ? window._svc('RepairPartsService') : null);
    if (!RepairPartsService || typeof RepairPartsService.remove !== 'function') throw new Error('RepairPartsService.remove 未就緒');
    await RepairPartsService.remove(repairId, itemId);
    await window.partsUI.update();
  },

  async changeStatus(repairId, itemId, event) {
    const status = (event?.target?.value || '').trim();
    const patch = { status };
    const RepairPartsService = window.partsUI?._svc?.('RepairPartsService') || (typeof window._svc === 'function' ? window._svc('RepairPartsService') : null);
    if (status === '已到貨' && !RepairPartsService?.getForRepair?.(repairId)?.find(x => x.id === itemId)?.arrivedDate) {
      patch.arrivedDate = new Date().toISOString().slice(0, 10);
    }
    if (status === '已更換' && !RepairPartsService?.getForRepair?.(repairId)?.find(x => x.id === itemId)?.replacedDate) {
      patch.replacedDate = new Date().toISOString().slice(0, 10);
    }
    if (!RepairPartsService || typeof RepairPartsService.update !== 'function') throw new Error('RepairPartsService.update 未就緒');
    await RepairPartsService.update(repairId, itemId, patch);
    await window.partsUI.update();
  },
  async openRepair(repairId) {
    const rid = (repairId || '').toString().trim();
    if (!rid) return;

    try {
      if (window.RepairUI && typeof window.RepairUI.openDetail === 'function') {
        window.RepairUI.openDetail(rid);
        return;
      }
    } catch (_) {}

    if (window.ModuleLoader?.ensure) {
      try { await window.ModuleLoader.ensure('repairs'); } catch (_) {}
    }
    if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
      try { await window.AppRouter.navigate('repairs'); } catch (_) {}
      try { window.RepairUI?.openDetail?.(rid); } catch (_) {}
    }
  },
  async openQuote(quoteId) {
    const qid = (quoteId || '').toString().trim();
    if (!qid) return;

    try {
      if (window.QuotesUI && typeof window.QuotesUI.openDetail === 'function') {
        window.QuotesUI.openDetail(qid);
        return;
      }
    } catch (_) {}

    if (window.ModuleLoader?.ensure) {
      try { await window.ModuleLoader.ensure('quotes'); } catch (_) {}
    }
    if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
      try { await window.AppRouter.navigate('quotes'); } catch (_) {}
      try { window.QuotesUI?.openDetail?.(qid); } catch (_) {}
    }
  },
  async openOrder(orderId) {
    const oid = (orderId || '').toString().trim();
    if (!oid) return;

    try {
      if (window.OrdersUI && typeof window.OrdersUI.openDetail === 'function') {
        window.OrdersUI.openDetail(oid);
        return;
      }
    } catch (_) {}

    if (window.ModuleLoader?.ensure) {
      try { await window.ModuleLoader.ensure('orders'); } catch (_) {}
    }
    if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
      try { await window.AppRouter.navigate('orders'); } catch (_) {}
      try { window.OrdersUI?.openDetail?.(oid); } catch (_) {}
    }
  }
});

console.log('✅ PartsUI loaded');
