/**
 * 維修管理 - UI 層
 * V160 - Repairs Module - UI Layer
 * 
 * 職責：
 * 1. 渲染維修列表
 * 2. 渲染維修表單
 * 3. 渲染搜尋/篩選介面
 * 4. 渲染統計資訊
 * 5. 事件處理
 */


// Phase 1：registry-first 取得 Service（避免直接 window.XxxService）
// 注意：本專案為非 module script（同一 global scope），避免宣告可重複載入時會衝突的 top-level const。
// ------------------------------------------------------------
// HTML 轉義（避免 XSS / 屬性注入）
// 注意：專案內多數模組使用 escapeHtml（camelCase），但此檔案部分程式碼
// 使用 escapeHTML（全大寫）。為避免在 quote/order mini summary 等處出現
// 「escapeHTML is not defined」，此處提供一致且自足的 helper。
// ------------------------------------------------------------

const escapeHTML = (window.StringUtils && typeof window.StringUtils.escapeHTML === 'function')
  ? window.StringUtils.escapeHTML
  : function escapeHTMLFallback(input) {
      const s = (input === undefined || input === null) ? '' : String(input);
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

class RepairUI {
  constructor() {
    this.currentView = 'list'; // list, form, detail
    this.currentRepair = null;
    this.filters = {};
    this.sortBy = 'updatedAt';
    this.sortOrder = 'desc';
    this.searchDebounce = null;

    // 表單：公司選擇/輸入 debounce（避免每個鍵入都觸發聯絡人清單重算）
    this._customerPickTimer = null;

    // 功能優化：列表關鍵字搜尋（記住上一次輸入）
    const kw = this.loadKeyword();
    if (kw) this.filters.keyword = kw;
    // 關鍵字草稿（輸入不立即觸發搜尋；按「搜尋」才套用）
    this._draftKeyword = (kw || '').toString();

    // 列表分頁（顯示更多）
    this.pageSize = this.getDefaultPageSize();
    this.visibleCount = this.pageSize;
    this._lastQueryKey = '';

    // 列表顯示密度（標準/緊湊）
    this.listDensity = this.loadListDensity();

    // 進行中 / 歷史（已完成）
    this.scope = this.loadScope();
    this.applyScopeDefaults();

    // P3：篩選面板開關（記住上次狀態）
    this.filtersPanelOpen = this.loadFiltersPanelOpen();

    // P3-3：自訂檢視（Saved Views）
    this._savedViewsModule = 'repairs';
    this._activeViewId = this.loadLastSavedViewId();
    this._autoViewApplied = false;

    // 增量渲染 / 變更合併（效能）
    this._renderToken = 0;
    this._updateScheduled = false;

    // 表單 DOM 快取（效能/穩定）：避免重複 querySelector
    this._formEl = null;
    this._formEls = null;

    // 事件委派（P2-2）：列表/詳情按鈕統一由單一 click handler 處理
    this._delegatedClickHandler = null;

    // CodeOpt：事件清理控制（避免重複綁定/記憶體殘留）
    this._formAC = null;
    this._companyDropdownAC = null;
    this._contactDropdownAC = null;

    // 事件綁定控管（避免重複綁定造成資源耗用）
    this._eventsBound = false;
    this._unsubRepairChange = null;
    this._shortcutNewRepairHandler = null;
    this._settingsUpdatedHandler = null;
    this._logoutCleanupBound = false;

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
    return `<${tagName} class="${className}"${[typeAttr, attrs].filter(Boolean).join(' ') ? ` ${[typeAttr, attrs].filter(Boolean).join(' ')}` : ''}>${options.allowHtml ? String(label || '—') : escapeHTML(label || '—')}</${tagName}>`;
  }

  _toneForRepairStatusChip(status = '') {
    const value = (status || '').toString().trim();
    if (value === '需要零件') return 'warning';
    if (value === '已完成') return 'success';
    return 'primary';
  }

  _getRepairStatusMeta(status = '') {
    const normalized = (status || '').toString().trim();
    const fallbackLabel = normalized || '未設定';
    const fallbackColor = '#6b7280';
    try {
      const resolved = (window.AppConfig && typeof window.AppConfig.getStatusByValue === 'function')
        ? window.AppConfig.getStatusByValue(normalized)
        : null;
      return {
        value: normalized,
        label: (resolved && resolved.label) ? resolved.label : fallbackLabel,
        color: (resolved && resolved.color) ? resolved.color : fallbackColor
      };
    } catch (_) {
      return { value: normalized, label: fallbackLabel, color: fallbackColor };
    }
  }

  _getRepairPriorityMeta(priority = '') {
    const normalized = (priority || '').toString().trim();
    const fallbackLabel = normalized || '一般';
    const fallbackColor = '#6b7280';
    try {
      const source = (window.AppConfig && window.AppConfig.business && Array.isArray(window.AppConfig.business.priority))
        ? window.AppConfig.business.priority
        : [];
      const resolved = source.find(p => String(p && p.value || '').trim() === normalized);
      return {
        value: normalized,
        label: (resolved && resolved.label) ? resolved.label : fallbackLabel,
        color: (resolved && resolved.color) ? resolved.color : fallbackColor
      };
    } catch (_) {
      return { value: normalized, label: fallbackLabel, color: fallbackColor };
    }
  }

  _toRepairCardViewModel(repair) {
    const raw = (repair && typeof repair === 'object') ? repair : {};
    const display = (window.RepairModel && typeof window.RepairModel.toDisplay === 'function')
      ? window.RepairModel.toDisplay(raw)
      : raw;
    const statusMeta = this._getRepairStatusMeta(raw.status || display.statusLabel || '');
    const priorityMeta = this._getRepairPriorityMeta(raw.priority || display.priorityLabel || '');
    const createdDateText = (raw.createdDate || '').toString().trim() || ((display.createdAtFormatted || '').toString().slice(0, 10));
    const completedDateText = (display.completedAtFormatted || '').toString().trim() || createdDateText;
    const ageInDays = Number(display && display.ageInDays);
    const normalizedAge = Number.isFinite(ageInDays) ? ageInDays : 0;
    const progressValue = Number(raw.progress);
    const normalizedProgress = Number.isFinite(progressValue)
      ? Math.max(0, Math.min(100, progressValue))
      : (statusMeta.value === '已完成' ? 100 : (statusMeta.value === '需要零件' ? 50 : 10));

    return {
      repair: raw,
      display,
      statusMeta,
      priorityMeta,
      id: raw.id || '',
      customer: raw.customer || '',
      machine: raw.machine || '',
      issue: raw.issue || '',
      ownerName: raw.ownerName || '',
      needParts: !!raw.needParts,
      createdDateText,
      completedDateText,
      ageInDays: normalizedAge,
      progress: normalizedProgress
    };
  }

  _renderRepairCardError(repair, error) {
    const safeId = escapeHTML((repair && repair.id) || '未知案件');
    const safeMsg = escapeHTML((error && error.message) || '卡片渲染失敗');
    return `
      <div class="repair-card-shell repair-card-shell--error" data-repair-id="${safeId}">
        <div class="card repair-card repair-card-error accent-left" style="--accent-opacity:.35">
          <div class="card-head">
            <div>
              <div class="repair-card-id">${safeId}</div>
              <div class="muted repair-card-sub">此案件卡片渲染失敗，請檢查狀態或優先級資料。</div>
            </div>
            <span class="badge badge-warning">資料需校正</span>
          </div>
          <div class="card-body">
            <div class="repair-card-issue">${safeMsg}</div>
          </div>
        </div>
      </div>
    `;
  }


  // ========================================
  // Saved Views（自訂檢視）
  // ========================================

  _getLastViewKey() {
    try {
      if (window.SavedViews && typeof window.SavedViews.prefKey === 'function') {
        return window.SavedViews.prefKey('ui_repairs_last_view');
      }
    } catch (_) {}
    return this.getStorageKey('ui_repairs_last_view');
  }

  loadLastSavedViewId() {
    try {
      const key = this._getLastViewKey();
      const v = (localStorage.getItem(key) || '').toString().trim();
      return v;
    } catch (_) {
      return '';
    }
  }

  saveLastSavedViewId(id) {
    try {
      const key = this._getLastViewKey();
      const v = (id || '').toString();
      if (v) localStorage.setItem(key, v);
      else localStorage.removeItem(key);
    } catch (_) {
      // ignore
    }
  }

  listSavedViews() {
    try {
      if (window.SavedViews && typeof window.SavedViews.list === 'function') {
        return window.SavedViews.list(this._savedViewsModule) || [];
      }
    } catch (_) {}
    return [];
  }

  _buildCurrentViewPayload() {
    const f = { ...(this.getEffectiveFilters() || {}) };
    delete f.scope; // scope 另存
    return {
      scope: this.scope,
      filters: f,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      listDensity: this.listDensity
    };
  }

  _applyViewPayload(payload, opts) {
    const p = (payload && typeof payload === 'object') ? payload : {};
    const silent = !!(opts && opts.silent);

    // scope
    const scope = (p.scope === 'history') ? 'history' : 'active';
    this.scope = scope;
    this.saveScope(scope);
    this.applyScopeDefaults();

    // filters
    this.filters = (p.filters && typeof p.filters === 'object') ? { ...p.filters } : {};

    // sort
    if (p.sortBy) this.sortBy = String(p.sortBy);
    if (p.sortOrder) this.sortOrder = (String(p.sortOrder) === 'asc') ? 'asc' : 'desc';

    // density
    // 已由「設定 → 顯示偏好 → 列表密度」統一控管，不從 Saved View 套用

    // keyword preference（與 keyword bar 同步）
    try {
      const kw = (this.filters.keyword || '').toString().trim();
      this.saveKeyword(kw);
      this._draftKeyword = kw;
    } catch (_) {}

    // 同步 UI
    try { this.refreshFiltersPanel(); } catch (_) {}
    try { this.applyDensityClass(); } catch (_) {}

    // 同步 keyword bar（repairs-keyword）
    try {
      const kwEl = document.getElementById('repairs-keyword');
      if (kwEl) kwEl.value = (this._draftKeyword || '').toString();
    } catch (_) {}

    if (!silent) {
      try {
        if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('已套用檢視', { type: 'success' });
      } catch (_) {}
    }
  }

  _autoApplySavedViewIfNeeded() {
    if (this._autoViewApplied) return;
    this._autoViewApplied = true;
    const id = (this._activeViewId || '').toString().trim();
    if (!id) return;
    const views = this.listSavedViews();
    const v = views.find(x => x && x.id === id);
    if (!v || !v.payload) {
      this._activeViewId = '';
      try { this.saveLastSavedViewId(''); } catch (_) {}
      return;
    }
    this._applyViewPayload(v.payload, { silent: true });
  }

  renderSavedViewsToolbar() {
    const views = this.listSavedViews();
    const cur = (this._activeViewId || '').toString();
    return `
      <div class="toolbar-group saved-views" data-stop-prop="1">
        <select class="input sm sv-select" id="repairs-view-select" data-action="repairs.applySavedView">
          <option value="">檢視：預設</option>
          ${views.map(v => `<option value="${escapeHTML(v.id)}" ${v.id === cur ? 'selected' : ''}>${escapeHTML(v.name || '未命名')}</option>`).join('')}
        </select>
        <button class="btn sm sv-btn" type="button" data-action="repairs.saveCurrentView">⭐ 儲存檢視</button>
        <button class="btn sm ghost sv-btn" type="button" data-action="repairs.manageViews">⚙ 管理檢視</button>
      </div>
    `;
  }

  refreshSavedViewsSelect() {
    const sel = document.getElementById('repairs-view-select');
    if (!sel) return;
    const views = this.listSavedViews();
    const cur = (this._activeViewId || '').toString();
    sel.innerHTML = `<option value="">檢視：預設</option>` + views.map(v => {
      const id = escapeHTML(v.id);
      const name = escapeHTML(v.name || '未命名');
      const selected = (v.id === cur) ? 'selected' : '';
      return `<option value="${id}" ${selected}>${name}</option>`;
    }).join('');
    try { sel.value = cur; } catch (_) {}
  }

  async saveCurrentViewInteractive() {
    const UI = window.UI;
    if (!UI || typeof UI.prompt !== 'function') {
      try { window.alert('系統 UI 元件尚未就緒，請稍後再試'); } catch (_) {}
      return;
    }

    const name = await UI.prompt({
      title: '儲存檢視',
      message: '將目前的篩選條件保存為一個可快速切換的檢視',
      label: '檢視名稱',
      placeholder: '例如：本週未結案 / 只看我的',
      defaultValue: ''
    });

    const n = (name || '').toString().trim();
    if (!n) return;

    const views = this.listSavedViews();
    const existed = views.find(v => (v && (v.name || '').toString().trim() === n));

    let id = '';
    if (existed && existed.id) {
      const ok = (UI && typeof UI.confirm === 'function')
        ? await UI.confirm({ title: '檢視已存在', message: `「${n}」已存在，是否覆寫？`, okText: '覆寫', cancelText: '取消', tone: 'danger' })
        : window.confirm(`「${n}」已存在，是否覆寫？`);
      if (!ok) return;
      id = existed.id;
    }

    const payload = this._buildCurrentViewPayload();
    const view = {
      id: id,
      name: n,
      module: this._savedViewsModule,
      payload
    };

    const saved = (window.SavedViews && typeof window.SavedViews.upsert === 'function')
      ? window.SavedViews.upsert(this._savedViewsModule, view)
      : view;

    this._activeViewId = saved.id;
    this.saveLastSavedViewId(saved.id);
    this.refreshSavedViewsSelect();
    try { if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('已儲存檢視', { type: 'success' }); } catch (_) {}
  }

  applySavedViewById(id) {
    const vid = (id || '').toString().trim();
    this._activeViewId = vid;
    this.saveLastSavedViewId(vid);

    if (!vid) {
      // 使用者選擇「預設」：僅清除檢視選取，不強制改變目前篩選（避免誤觸造成資料視圖跳動）
      try { this.refreshSavedViewsSelect(); } catch (_) {}
      return;
    }

    const views = this.listSavedViews();
    const v = views.find(x => x && x.id === vid);
    if (!v || !v.payload) {
      try { if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('找不到檢視，可能已被刪除', { type: 'warning' }); } catch (_) {}
      this._activeViewId = '';
      this.saveLastSavedViewId('');
      this.refreshSavedViewsSelect();
      return;
    }

    this._applyViewPayload(v.payload);
    this.visibleCount = this.pageSize;
    this.updateList();
    this.refreshSavedViewsSelect();
  }

  _renderManageViewsHtml() {
    const views = this.listSavedViews();
    if (!views.length) {
      return `
        <div class="muted">目前沒有任何檢視。你可以回到列表後按「⭐ 儲存」建立第一個檢視。</div>
      `;
    }

    return `
      <div class="saved-views-manage">
        <div class="muted" style="margin-bottom:10px;">共 ${views.length} 個檢視</div>
        <div class="sv-list">
          ${views.map(v => {
            const id = escapeHTML(v.id);
            const name = escapeHTML(v.name || '未命名');
            const active = (v.id === (this._activeViewId || '')) ? ' active' : '';
            return `
              <div class="sv-row${active}" data-id="${id}">
                <div class="sv-left">
                  <div class="sv-name">${name}</div>
                  <div class="sv-meta">${v.id === (this._activeViewId || '') ? '目前套用中' : ' '}</div>
                </div>
                <div class="sv-actions">
                  <button class="btn sm" type="button" data-act="apply">套用</button>
                  <button class="btn sm ghost" type="button" data-act="rename">改名</button>
                  <button class="btn sm danger ghost" type="button" data-act="delete">刪除</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  manageSavedViews() {
    const UI = window.UI;
    if (!UI || typeof UI.openModal !== 'function') return;

    const modalId = 'ui-repairs-saved-views-modal';
    UI.openModal({
      id: modalId,
      title: '管理檢視',
      html: this._renderManageViewsHtml(),
      wideClass: 'modal-wide'
    });

    const wrap = document.getElementById(modalId);
    if (!wrap) return;

    const rerender = () => {
      try {
        const body = wrap.querySelector('.modal-body');
        if (body) body.innerHTML = this._renderManageViewsHtml();
      } catch (_) {}
    };

    wrap.addEventListener('click', async (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!btn) return;
      const act = (btn.getAttribute('data-act') || '').toString();
      const row = btn.closest('.sv-row');
      const id = row ? (row.getAttribute('data-id') || '').toString() : '';
      if (!id) return;

      if (act === 'apply') {
        this.applySavedViewById(id);
        rerender();
        return;
      }

      if (act === 'rename') {
        const views = this.listSavedViews();
        const current = views.find(v => v && v.id === id);
        const newName = await UI.prompt({
          title: '修改檢視名稱',
          label: '檢視名稱',
          defaultValue: (current && current.name) ? String(current.name) : ''
        });
        const nn = (newName || '').toString().trim();
        if (!nn) return;
        try {
          if (window.SavedViews && typeof window.SavedViews.rename === 'function') {
            window.SavedViews.rename(this._savedViewsModule, id, nn);
          }
        } catch (_) {}
        this.refreshSavedViewsSelect();
        rerender();
        try { if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('已更新檢視名稱', { type: 'success' }); } catch (_) {}
        return;
      }

      if (act === 'delete') {
        const ok = (UI && typeof UI.confirm === 'function')
          ? await UI.confirm({ title: '確認刪除', message: '刪除後無法復原，確定要刪除這個檢視？', okText: '刪除', cancelText: '取消', tone: 'danger' })
          : window.confirm('刪除後無法復原，確定要刪除這個檢視？');
        if (!ok) return;

        try {
          if (window.SavedViews && typeof window.SavedViews.remove === 'function') {
            window.SavedViews.remove(this._savedViewsModule, id);
          }
        } catch (_) {}

        if ((this._activeViewId || '') === id) {
          this._activeViewId = '';
          this.saveLastSavedViewId('');
        }
        this.refreshSavedViewsSelect();
        rerender();
        try { if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('已刪除檢視', { type: 'success' }); } catch (_) {}
      }
    });
  }

  // ========================================
  // Form DOM cache helpers (P2-2)
  // ========================================
  _getRepairForm() {
    const el = document.getElementById('repair-form');
    this._formEl = el || null;
    return this._formEl;
  }

  _getFormEl(name) {
    if (!name) return null;
    const form = this._formEl || this._getRepairForm();
    if (!form) return null;
    this._formEls = this._formEls || {};
    if (this._formEls[name] && form.contains(this._formEls[name])) return this._formEls[name];
    const el = (window.DomUtils && typeof window.DomUtils.byName === 'function')
      ? window.DomUtils.byName(form, name)
      : form.querySelector(`[name="${String(name)}"]`);
    this._formEls[name] = el || null;
    return this._formEls[name];
  }

  _clearFormCache() {
    this._formEl = null;
    this._formEls = null;

    // 若聯絡人下拉在開啟狀態，切換/重繪表單時必須關閉，避免殘留浮層
    try { if (typeof this._closeContactDropdown === 'function') this._closeContactDropdown(true); } catch (_) {}

    // 事件委派（P2-2）：列表/詳情按鈕統一由單一 click handler 處理
    this._delegatedClickHandler = null;

    // CodeOpt：若存在事件控制器，先 abort 再釋放引用（避免殘留）
    try { if (this._formAC && typeof this._formAC.abort === 'function') this._formAC.abort(); } catch (_) {}
    try { if (this._companyDropdownAC && typeof this._companyDropdownAC.abort === 'function') this._companyDropdownAC.abort(); } catch (_) {}
    try { if (this._contactDropdownAC && typeof this._contactDropdownAC.abort === 'function') this._contactDropdownAC.abort(); } catch (_) {}
    this._formAC = null;
    this._companyDropdownAC = null;
    this._contactDropdownAC = null;
  }

  // ========================================
  // 分頁（顯示更多） / 日期快速範圍
  // ========================================

  getDefaultPageSize() {
    try {
      if (window.ListPaging && typeof window.ListPaging.getDefaultPageSize === 'function') {
        return window.ListPaging.getDefaultPageSize();
      }
    } catch (_) {}
    const isMobile = (window.AppConfig && window.AppConfig.device && typeof window.AppConfig.device.isMobile === 'function')
      ? window.AppConfig.device.isMobile()
      : (window.innerWidth <= 640);
    return isMobile ? 40 : 60;
  }

  _stableStringify(obj) {
    try {
      if (!obj || typeof obj !== 'object') return JSON.stringify(obj);
      const keys = Object.keys(obj).sort();
      const out = {};
      for (const k of keys) out[k] = obj[k];
      return JSON.stringify(out);
    } catch (_) {
      try { return JSON.stringify(obj); } catch (__) { return String(obj); }
    }
  }

  _buildQueryKey(effectiveFilters) {
    return [
      this._stableStringify(effectiveFilters || {}),
      String(this.sortBy || ''),
      String(this.sortOrder || '')
    ].join('|');
  }

  _getTaiwanDateString(date) {
    try {
      if (window.RepairModel && typeof window.RepairModel.getTaiwanDateString === 'function') {
        return window.RepairModel.getTaiwanDateString(date);
      }
    } catch (_) {}
    try {
      const d = date ? new Date(date) : new Date();
      return d.toISOString().slice(0, 10);
    } catch (_) {
      return '';
    }
  }

  _daysAgoDateString(days) {
    const n = Number(days || 0);
    const ms = (Number.isFinite(n) ? n : 0) * 24 * 60 * 60 * 1000;
    return this._getTaiwanDateString(new Date(Date.now() - ms));
  }

  renderHistoryDatePresets() {
    if (this.scope !== 'history') return '';

    const f = this.getEffectiveFilters() || {};
    const from = (f.completedFrom || '').toString();
    const to = (f.completedTo || '').toString();

    const presets = [
      { key: '30', label: '近 30 天', from: this._daysAgoDateString(30) },
      { key: '90', label: '近 90 天', from: this._daysAgoDateString(90) },
      { key: '180', label: '近 180 天', from: this._daysAgoDateString(180) },
      { key: 'all', label: '全部', from: '' }
    ];

    const isAll = (!from && !to);

    return `
      <div class="date-preset-chips" aria-label="完成日期快速範圍" data-stop-prop="1">
        <span class="muted" style="margin-right:6px;">完成日期：</span>
        ${presets.map(p => {
          const active = (p.key === 'all') ? isAll : (from === p.from && !to);
          return this._chipHtml(p.label, { active, tone: 'secondary', attrs: `data-action="repairs.applyHistoryDatePreset" data-value="${p.key}"` });
        }).join('')}
      </div>
    `;
  }

  applyHistoryDatePreset(key) {
    if (this.scope !== 'history') return;

    this.filters = this.filters || {};
    const k = (key || '').toString();

    if (k === 'all') {
      delete this.filters.completedFrom;
      delete this.filters.completedTo;
    } else {
      const days = Number(k);
      if (!Number.isFinite(days) || days <= 0) return;
      this.filters.completedFrom = this._daysAgoDateString(days);
      delete this.filters.completedTo;
    }

    // 同步篩選面板日期欄位（歷史模式即代表完成日期）
    const fromEl = document.getElementById('filter-date-from');
    const toEl = document.getElementById('filter-date-to');
    if (fromEl) fromEl.value = this.filters.completedFrom || '';
    if (toEl) toEl.value = this.filters.completedTo || '';

    this.updateList();
  }

  renderListFooter(meta) {
    const m = meta || {};
    const visible = Math.max(0, Number(m.visible || 0));
    const total = Math.max(0, Number(m.total || 0));
    const hasMore = !!m.hasMore;

    return `
      <div class="repairs-list-footer">
        <div class="muted">已顯示 <span class="mono">${visible}</span> / <span class="mono">${total}</span> 筆</div>
        <div class="repairs-list-footer-actions">
          ${hasMore ? `<button class="btn" data-action="repairs.loadMore">顯示更多</button>` : `<span class="muted">已顯示全部</span>`}
        </div>
      </div>
    `;
  }

  loadMore() {
    const y = (typeof window !== 'undefined' && typeof window.scrollY === 'number') ? window.scrollY : 0;
    const next = (window.ListPaging && typeof window.ListPaging.nextVisibleCount === 'function')
      ? window.ListPaging.nextVisibleCount(this.visibleCount, this.pageSize)
      : ((this.visibleCount || this.pageSize || 60) + (this.pageSize || 60));
    this.visibleCount = next;
    this.updateList();
    try { window.scrollTo(0, y); } catch (_) {}
  }


  // ========================================
  // 偏好設定（列表密度）
  // ========================================

  getStorageKey(suffix) {
    try {
      const prefix = (window.AppConfig && window.AppConfig.system && window.AppConfig.system.storage && window.AppConfig.system.storage.prefix)
        ? window.AppConfig.system.storage.prefix
        : 'repair_tracking_v161_';
      return `${prefix}${suffix}`;
    } catch (_) {
      return `repair_tracking_v161_${suffix}`;
    }
  }

  loadListDensity() {
    // 以「設定 → 顯示偏好 → 列表密度」為唯一來源（避免頁面再提供額外切換）
    // MainApp 會把 settings.uiDensity 寫入 body.dataset.density：comfortable / compact
    try {
      const d = (document.body && document.body.dataset) ? (document.body.dataset.density || '') : '';
      if (d === 'compact') return 'compact';
      if (d === 'comfortable') return 'standard';
    } catch (_) {}

    // 兼容：若尚未套用 settings（例如尚未登入初始化），採用預設標準
    return 'standard';
  }

  // 已移除列表上的「標準/緊湊」切換鈕；此函式保留以相容舊呼叫，但不再寫入本模組獨立偏好
  saveListDensity(_value) {
    // no-op
  }

  applyDensityClass(rootEl) {
    const el = rootEl || document.querySelector('.repairs-module');
    if (!el) return;
    el.classList.toggle('density-compact', this.listDensity === 'compact');
    el.classList.toggle('density-standard', this.listDensity !== 'compact');
  }

  _syncDensityFromGlobal(nextUiDensity) {
    // nextUiDensity: 'comfortable' | 'compact'（來自 SettingsService）
    let d = '';
    try {
      d = (nextUiDensity || (document.body && document.body.dataset ? document.body.dataset.density : '') || '').toString();
    } catch (_) { d = ''; }

    const desired = (d === 'compact') ? 'compact' : 'standard';
    if (desired !== this.listDensity) {
      this.listDensity = desired;
    }
  }

  getSelectedStatus() {
    const v = this.filters && this.filters.status && Array.isArray(this.filters.status) ? this.filters.status[0] : '';
    return v || '';
  }

  // ========================================
  // 偏好設定（scope：active/history）
  // ========================================

  loadScope() {
    try {
      const key = this.getStorageKey('ui_repairs_scope');
      const v = localStorage.getItem(key);
      return (v === 'history' || v === 'active') ? v : 'active';
    } catch (_) {
      return 'active';
    }
  }

  saveScope(value) {
    try {
      const key = this.getStorageKey('ui_repairs_scope');
      localStorage.setItem(key, value);
    } catch (_) {
      // ignore
    }
  }

  // ========================================
  // 偏好設定（列表關鍵字）
  // ========================================

  loadKeyword() {
    try {
      const key = this.getStorageKey('ui_repairs_keyword');
      const v = (localStorage.getItem(key) || '').toString().trim();
      return v;
    } catch (_) {
      return '';
    }
  }

  saveKeyword(value) {
    try {
      const key = this.getStorageKey('ui_repairs_keyword');
      const v = (value || '').toString().trim();
      if (v) localStorage.setItem(key, v);
      else localStorage.removeItem(key);
    } catch (_) {
      // ignore
    }
  }

  loadFiltersPanelOpen() {
    try {
      const key = this.getStorageKey('ui_repairs_filters_open');
      const v = (localStorage.getItem(key) || '').toString().trim().toLowerCase();
      if (!v) return false;
      return (v === '1' || v === 'true' || v === 'yes' || v === 'on');
    } catch (_) {
      return false;
    }
  }

  saveFiltersPanelOpen(isOpen) {
    try {
      const key = this.getStorageKey('ui_repairs_filters_open');
      localStorage.setItem(key, isOpen ? '1' : '0');
    } catch (_) {
      // ignore
    }
  }

  updateFiltersToggleButton() {
    const btn = document.getElementById('repairs-toggle-filters-btn');
    if (btn) btn.innerText = this.filtersPanelOpen ? '🔍 收合篩選' : '🔍 篩選';

    const emptyBtn = document.getElementById('repairs-empty-toggle-filters-btn');
    if (emptyBtn) emptyBtn.innerText = this.filtersPanelOpen ? '🔍 收合篩選' : '🔍 開啟篩選';
  }

  renderToolbarSummary() {
    const scopeLabel = this.scope === 'history' ? '歷史已完成案件' : '進行中案件';
    const densityLabel = this.listDensity === 'compact' ? '緊湊密度' : '標準密度';
    return `${scopeLabel}｜${densityLabel}`;
  }

  renderStatsLoading() {
    return `
      <div class="card ops-kpi-card repairs-kpi-card repairs-kpi-card--loading">
        <div class="ops-kpi-label">維修概況</div>
        <div class="ops-kpi-value repairs-kpi-value">...</div>
      </div>
    `;
  }

  renderListHeader() {
    return `
      <div class="repairs-list-header panel compact">
        <div class="repairs-list-left">
          <div class="repairs-left-block">
            ${this.renderScopeTabs()}
          </div>
          <div class="repairs-left-block">
            ${this.scope === 'active' ? this.renderStatusChips() : `
              <div class="muted">僅顯示「已完成」且未刪除的維修單；預設依完成時間由新到舊排序。</div>
              ${this.renderHistoryDatePresets()}
            `}
          </div>
        </div>

        <div class="repairs-list-right">
          <div class="repairs-right-block keyword-block">
            ${this.renderKeywordSearch()}
          </div>
          <div class="repairs-right-block sort-block">
            <div class="repairs-list-sort">
              <label class="muted">排序：</label>
              <select class="input repairs-sort-select" id="sort-by" data-action="repairs.handleSort">
                <option value="updatedAt" ${this.sortBy === 'updatedAt' ? 'selected' : ''}>更新時間</option>
                <option value="createdAt" ${this.sortBy === 'createdAt' ? 'selected' : ''}>建立時間</option>
                <option value="completedAt" ${this.sortBy === 'completedAt' ? 'selected' : ''}>完成時間</option>
                <option value="customer" ${this.sortBy === 'customer' ? 'selected' : ''}>客戶名稱</option>
                <option value="status" ${this.sortBy === 'status' ? 'selected' : ''}>狀態</option>
                <option value="priority" ${this.sortBy === 'priority' ? 'selected' : ''}>優先級</option>
              </select>
              <button class="btn" data-action="repairs.toggleSortOrder" title="切換順序">
                ${this.sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setFiltersPanelOpen(isOpen, opts) {
    const open = !!isOpen;
    this.filtersPanelOpen = open;

    const save = !(opts && opts.save === false);
    if (save) this.saveFiltersPanelOpen(open);

    const panel = document.getElementById('repairs-filters');
    if (panel) panel.hidden = !open;

    // 同步按鈕文字與欄位值（即使收合也同步，避免下一次展開顯示舊值）
    try { this.updateFiltersToggleButton(); } catch (_) {}
    try { this.syncFiltersUI(); } catch (_) {}
  }

  toggleFiltersPanel() {
    this.setFiltersPanelOpen(!this.filtersPanelOpen);
  }

  refreshFiltersPanel() {
    const panel = document.getElementById('repairs-filters');
    if (!panel) return;
    panel.innerHTML = this.renderFilters();
    this.syncFiltersUI();
  }

  setModalOpen(isOpen) {
    const modal = document.getElementById('repair-modal');
    if (!modal) return false;
    const open = !!isOpen;
    modal.hidden = !open;
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    modal.classList.toggle('is-open', open);
    if (!open) {
      try { modal.scrollTop = 0; } catch (_) {}
    }
    return open;
  }

  isModalOpen() {
    const modal = document.getElementById('repair-modal');
    return !!(modal && !modal.hidden);
  }

  closeModal(options = {}) {
    const modal = document.getElementById('repair-modal');
    const content = document.getElementById('repair-modal-content');
    if (!(modal && content)) return false;

    const opts = (options && typeof options === 'object') ? options : {};
    const preserveContent = !!opts.preserveContent;

    try {
      const active = document.activeElement;
      if (active && typeof active.closest === 'function' && active.closest('#repair-modal')) {
        active.blur?.();
      }
    } catch (_) {}

    try { if (typeof this._closeCompanyDropdown === 'function') this._closeCompanyDropdown(true); } catch (_) {}
    try { if (typeof this._closeContactDropdown === 'function') this._closeContactDropdown(true); } catch (_) {}
    try { if (typeof this._clearFormCache === 'function') this._clearFormCache(); } catch (_) {}

    this.currentRepair = null;
    this.currentView = 'list';

    try { content.classList.remove('modal-wide', 'modal-large', 'modal-xlarge'); } catch (_) {}
    if (!preserveContent) {
      try { content.innerHTML = ''; } catch (_) {}
    }

    try { modal.scrollTop = 0; } catch (_) {}
    try { content.scrollTop = 0; } catch (_) {}

    this.setModalOpen(false);
    return true;
  }

  renderEmptyStateActionBar(hasExtraFilters) {
    return `
      ${hasExtraFilters ? `
        <button class="btn" data-action="repairs.clearFilters">🧹 清除篩選</button>
        <button class="btn" id="repairs-empty-toggle-filters-btn" data-action="repairs.toggleFilters">${this.filtersPanelOpen ? '🔍 收合篩選' : '🔍 開啟篩選'}</button>
      ` : ''}
      <button class="btn primary" data-action="repairs.openForm">➕ 新增維修單</button>
    `;
  }

  syncFiltersUI() {
    const f = (this.filters && typeof this.filters === 'object') ? this.filters : {};

    // keyword
    const keywordEl = document.getElementById('filter-keyword');
    const kwDraft = (this._draftKeyword !== undefined && this._draftKeyword !== null)
      ? String(this._draftKeyword)
      : (f.keyword || '').toString();
    if (keywordEl && keywordEl.value !== kwDraft) keywordEl.value = kwDraft;

    // status（history scope 不渲染）
    const statusEl = document.getElementById('filter-status');
    if (statusEl) {
      const v = Array.isArray(f.status) ? (f.status[0] || '') : (f.status || '');
      statusEl.value = v ? String(v) : '';
    }

    // priority
    const priorityEl = document.getElementById('filter-priority');
    if (priorityEl) {
      const v = Array.isArray(f.priority) ? (f.priority[0] || '') : (f.priority || '');
      priorityEl.value = v ? String(v) : '';
    }

    // owner（僅支援 me / all）
    const ownerEl = document.getElementById('filter-owner');
    if (ownerEl) {
      const uid = (window.AppState && typeof window.AppState.getUid === 'function')
        ? window.AppState.getUid()
        : (window.currentUser && window.currentUser.uid) ? window.currentUser.uid : '';
      ownerEl.value = (f.owner && uid && String(f.owner) === String(uid)) ? 'me' : '';
    }

    // date range（active: dateFrom/dateTo；history: completedFrom/completedTo）
    const dateFromEl = document.getElementById('filter-date-from');
    const dateToEl = document.getElementById('filter-date-to');

    if (this.scope === 'history') {
      if (dateFromEl) dateFromEl.value = (f.completedFrom || '').toString();
      if (dateToEl) dateToEl.value = (f.completedTo || '').toString();
    } else {
      if (dateFromEl) dateFromEl.value = (f.dateFrom || '').toString();
      if (dateToEl) dateToEl.value = (f.dateTo || '').toString();
    }

    // need parts
    const needPartsEl = document.getElementById('filter-need-parts');
    if (needPartsEl) {
      if (typeof f.needParts === 'boolean') {
        needPartsEl.value = f.needParts ? 'true' : 'false';
      } else {
        needPartsEl.value = '';
      }
    }
  }

  renderKeywordSearch() {
    const f = this.getEffectiveFilters() || {};
    const applied = (f.keyword || '').toString();
    const v = (this._draftKeyword !== undefined && this._draftKeyword !== null)
      ? String(this._draftKeyword)
      : applied;
    const canClear = !!(v.trim() || applied.trim());
    return `
      <div class="repairs-search" data-stop-prop="1">
        <input
          id="repairs-keyword"
          class="input repairs-keyword"
          type="search"
          placeholder="關鍵字：客戶 / SN / 問題 / 單號（輸入後按搜尋）"
          value="${(v || '').replace(/"/g, '&quot;')}"
          
          
        />
        <button class="btn sm primary" title="搜尋" data-action="repairs.applyKeywordSearch">搜尋</button>
        <button id="repairs-keyword-clear" class="btn ghost sm" title="清除" data-action="repairs.clearKeyword" ${canClear ? '' : 'disabled'}>✕</button>
      </div>
    `;
  }

  applyScopeDefaults() {
    // scope 一律寫進 filters，讓 service/filter 同步一致
    this.filters = this.filters || {};
    this.filters.scope = this.scope;

    // 歷史：強制只看已完成 → 狀態 chips 不再具有意義，避免誤操作
    if (this.scope === 'history') {
      this.filters.status = [];
      this.sortBy = 'completedAt';
      this.sortOrder = 'desc';
    } else {
      if (this.sortBy === 'completedAt') this.sortBy = 'updatedAt';
    }
  }

  getEffectiveFilters() {
    const f = { ...(this.filters || {}) };
    f.scope = this.scope;

    // 歷史：強制忽略 status，並把日期篩選改為完成日期（completedFrom/completedTo）
    if (this.scope === 'history') {
      f.status = [];

      // 相容舊版：若曾使用 dateFrom/dateTo，視同 completedFrom/completedTo
      if (f.dateFrom && !f.completedFrom) f.completedFrom = f.dateFrom;
      if (f.dateTo && !f.completedTo) f.completedTo = f.dateTo;

      delete f.dateFrom;
      delete f.dateTo;
    } else {
      // 進行中：不套用完成日期篩選
      delete f.completedFrom;
      delete f.completedTo;
    }

    return f;
  }

  setScope(scope) {
    const s = (scope || '').toString();
    if (s !== 'active' && s !== 'history') return;
    this.scope = s;
    this.saveScope(s);
    this.applyScopeDefaults();

    // P3：scope 切換時同步更新篩選面板（欄位/標籤依 scope 變化）
    try { this.refreshFiltersPanel(); } catch (_) {}
    try { this.updateFiltersToggleButton(); } catch (_) {}

    this.updateList();
  }

  getScopeCounts() {
    try {
      const active = window._svc('RepairService').search({ scope: 'active' }).length;
      const history = window._svc('RepairService').search({ scope: 'history' }).length;
      return { active, history };
    } catch (_) {
      return { active: 0, history: 0 };
    }
  }

  renderScopeTabs() {
    const counts = this.getScopeCounts();
    const isActive = this.scope === 'active';
    const isHistory = this.scope === 'history';
    return `
      <div class="scope-tabs" aria-label="進行中/歷史切換">
        ${this._chipHtml(`進行中 <span class="scope-count">${counts.active}</span>`, { active: isActive, tone: 'primary', allowHtml: true, attrs: 'data-action="repairs.setScope" data-value="active"' })}
        ${this._chipHtml(`歷史（已完成） <span class="scope-count">${counts.history}</span>`, { active: isHistory, tone: 'primary', allowHtml: true, attrs: 'data-action="repairs.setScope" data-value="history"' })}
      </div>
    `;
  }

  getStatusChips() {
    const statuses = (window.AppConfig && window.AppConfig.business && window.AppConfig.business.repairStatus) ? window.AppConfig.business.repairStatus : [];
    const map = new Map();
    (statuses || []).forEach(s => {
      if (!s || !s.value) return;
      const key = String(s.value);
      if (!map.has(key)) map.set(key, { value: key, label: s.label || key, color: s.color || 'var(--color-primary)' });
    });

    // 依既定字典排序：進行中 / 需要零件 / 已完成
    const preferred = ['進行中', '需要零件', '已完成'];
    const ordered = [];
    preferred.forEach(k => { if (map.has(k)) { ordered.push(map.get(k)); map.delete(k); } });
    // 其餘狀態（若未來擴充）放後面
    for (const [, v] of map.entries()) ordered.push(v);

    return [
      { value: '', label: '全部', color: 'var(--color-text-secondary)' },
      ...ordered
    ];
  }

  renderStatusChips() {
    const selected = this.getSelectedStatus();
    const chips = this.getStatusChips();
    return `
      <div class="status-chips" aria-label="狀態快速篩選">
        ${chips.map(c => {
          const isActive = (c.value || '') === (selected || '');
          const enc = encodeURIComponent(c.value || '');
          return this._chipHtml(c.label, { active: isActive, tone: this._toneForRepairStatusChip(c.value || c.label), attrs: `data-action="repairs.applyStatusChip" data-value="${enc}"` });
        }).join('')}
      </div>
    `;
  }

  renderDensityToggle() {
    // 已移除：列表密度改由「設定 → 顯示偏好 → 列表密度」控制
    return '';
  }
  
  /**
   * 渲染主介面
   */
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      return;
    }

    // 以全域設定同步列表密度（設定頁變更會即時套用）
    try { this._syncDensityFromGlobal(); } catch (_) {}

    // P3-3：若使用者上次有選擇檢視，先套用（避免 scope/欄位 label 不一致）
    try { this._autoApplySavedViewIfNeeded(); } catch (_) {}
    
    container.innerHTML = `
      <div class="repairs-module ops-module-shell ${this.listDensity === 'compact' ? 'density-compact' : 'density-standard'}">
        <div class="repairs-toolbar module-toolbar">
          <div class="module-toolbar-left">
            <div>
              <div class="ops-toolbar-title">
                <div class="ops-toolbar-heading">📋 維修管理</div>
                <span class="badge">Repair</span>
              </div>
              <div class="ops-toolbar-summary" id="repairs-count">${this.renderToolbarSummary()}</div>
            </div>
          </div>

          <div class="module-toolbar-right ops-actions">
            ${this.renderSavedViewsToolbar()}
            <button class="btn" id="repairs-toggle-filters-btn" data-action="repairs.toggleFilters">
              ${this.filtersPanelOpen ? '🔍 收合篩選' : '🔍 篩選'}
            </button>
            <button class="btn" data-action="repairs.sync">
              🔄 同步
            </button>
            <button class="btn primary" data-action="repairs.openForm">
              ➕ 新增維修單
            </button>
          </div>
        </div>

        <div id="repairs-filters" class="repairs-filters panel ops-filter-panel" ${this.filtersPanelOpen ? '' : 'hidden'}>
          ${this.renderFilters()}
        </div>

        <div class="repairs-main-stack">
          <div id="repairs-stats" class="repairs-stats">
            ${this.renderStatsLoading()}
          </div>

          <div id="repairs-content" class="repairs-content">
            ${this.renderListShell([], { loading: true })}
          </div>
        </div>
      </div>

      <div id="repair-modal" class="modal repairs-modal" hidden aria-hidden="true">
        <div class="modal-backdrop" data-action="repairs.closeModal"></div>
        <!-- 使用 modal-host 承載內層 .modal-dialog，避免外層 modal-content 與內層 dialog 雙重 shell 造成表單尺寸與 X 位置異常 -->
        <div class="modal-host" id="repair-modal-content"></div>
      </div>
    `;
    
    // 預先載入客戶資料，確保「公司名稱」清單在維修表單中一致可用
    try {
      if (window._svc('CustomerService') && typeof window._svc('CustomerService').init === 'function') {
        window._svc('CustomerService').init().catch(e => console.warn('CustomerService init failed:', e));
      }
    } catch (e) {
      console.warn('CustomerService preload failed:', e);
    }

    // 綁定事件
    this.bindEvents();

    // 套用列表密度
    this.applyDensityClass(container.querySelector('.repairs-module'));

    // 篩選面板：套用開關狀態 + 同步欄位（P3）
    try { this.setFiltersPanelOpen(this.filtersPanelOpen, { save: false }); } catch (_) {}
    
    // 初次渲染（增量列表 + 統計/計數）
    this.updateList();
    
  }
  
  /**
   * 渲染篩選面板
   */
  renderFilters() {
    const statuses = AppConfig.business.repairStatus;
    // 防呆：避免狀態設定被重複注入造成 KPI 重複
    const seen = new Set();
    const uniqueStatuses = (statuses || []).filter(s => {
      const key = s && s.value ? String(s.value) : '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const priorities = AppConfig.business.priority;
    
    return `
      <div class="filters-grid">
        <div class="filter-group">
          <label class="filter-label">關鍵字搜尋</label>
          <input
            type="text"
            class="input"
            id="filter-keyword"
            placeholder="搜尋單號、序號、客戶...（輸入後按搜尋）"
            
            
          />
        </div>
        
        ${this.scope === 'history' ? '' : `
          <div class="filter-group">
            <label class="filter-label">狀態</label>
            <select class="input" id="filter-status">
              <option value="">全部</option>
              ${uniqueStatuses.map(s => `
                <option value="${s.value}">${s.label}</option>
              `).join('')}
            </select>
          </div>
        `}
        
        <div class="filter-group">
          <label class="filter-label">優先級</label>
          <select class="input" id="filter-priority">
            <option value="">全部</option>
            ${priorities.map(p => `
              <option value="${p.value}">${p.label}</option>
            `).join('')}
          </select>
        </div>
        
        

        <div class="filter-group">
          <label class="filter-label">負責人</label>
          <select class="input" id="filter-owner">
            <option value="">全部</option>
            <option value="me">只看我的</option>
          </select>
        </div>
        <div class="filter-group filter-date-range">
          <label class="filter-label">${this.scope === 'history' ? '完成日期範圍' : '維修日期範圍'}</label>
          <div class="date-range-row">
            <input
              type="date"
              class="input"
              id="filter-date-from"
            />
            <span class="date-range-sep">至</span>
            <input
              type="date"
              class="input"
              id="filter-date-to"
            />
          </div>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">需要零件</label>
          <select class="input" id="filter-need-parts">
            <option value="">全部</option>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        </div>
      </div>

      <div class="filters-actions">
        <button class="btn primary" data-action="repairs.applyFilters">🔍 搜尋</button>
        <button class="btn" data-action="repairs.clearFilters">🧹 清除篩選</button>
      </div>
    `;
  }
  
  /**
   * 渲染統計卡片
   */
  renderStats(scopedOverride) {
    const scoped = Array.isArray(scopedOverride) ? scopedOverride : window._svc('RepairService').search(this.getEffectiveFilters());
    const stats = window.RepairModel.getStats(scoped);
    const statuses = AppConfig.business.repairStatus;
    // 防呆：避免狀態設定被重複注入造成 KPI 重複
    const seen = new Set();
    const uniqueStatuses = (statuses || []).filter(s => {
      const key = s && s.value ? String(s.value) : '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return `
      <div class="card ops-kpi-card repairs-kpi-card" style="--ops-accent: var(--color-text-secondary);">
        <div class="ops-kpi-label">總計</div>
        <div class="ops-kpi-value repairs-kpi-value">${stats.total}</div>
      </div>

      ${uniqueStatuses.map(status => `
        <div class="card ops-kpi-card repairs-kpi-card" style="--ops-accent: ${status.color};">
          <div class="ops-kpi-label">${status.label}</div>
          <div class="ops-kpi-value repairs-kpi-value">
            ${stats.byStatus[status.value] || 0}
          </div>
        </div>
      `).join('')}

      <div class="card ops-kpi-card repairs-kpi-card" style="--ops-accent: var(--color-secondary);">
        <div class="ops-kpi-label">平均處理天數</div>
        <div class="ops-kpi-value repairs-kpi-value">
          ${stats.avgAge}
        </div>
      </div>
    `;
  }
  
  /**
   * 渲染列表
   */
  renderList() {
    let repairs = window._svc('RepairService').search(this.getEffectiveFilters());
    repairs = window.RepairModel.sort(repairs, this.sortBy, this.sortOrder);
    
    if (repairs.length === 0) {
      return this.renderEmptyState();
    }
    
    return `
      <div class="repairs-list">
        ${this.renderListHeader()}

        <div class="repairs-cards">
          ${repairs.map(repair => this.renderRepairCard(repair)).join('')}
        </div>
      </div>
    `;
  }
  

  // ========================================
  // 增量渲染（列表卡片）
  // ========================================

  /**
   * 渲染列表殼（不含卡片內容）
   * - 由 updateList() 透過增量渲染填入卡片，避免一次性建構大量 DOM 造成卡頓
   */
  renderListShell(_repairs, options = {}) {
    const repairs = Array.isArray(_repairs) ? _repairs : [];
    const loading = !!options.loading;

    const pagination = options.pagination || null;
    const total = repairs.length;
    const visible = pagination ? Math.min(Number(pagination.visible || 0), total) : Math.min((this.visibleCount || this.pageSize || 60), total);
    const hasMore = pagination ? !!pagination.hasMore : (visible < total);

    return `
      <div class="repairs-list">
        ${this.renderListHeader()}

        <div class="repairs-cards ${loading ? 'is-rendering' : ''}" id="repairs-cards" data-total="${repairs.length}">
          ${loading ? this.renderLoadingCards() : ''}
        </div>

        ${!loading && total > 0 ? this.renderListFooter({ visible, total, hasMore }) : ''}
      </div>
    `;
  }

  renderLoadingCards() {
    const isMobile = (window.AppConfig && window.AppConfig.device && typeof window.AppConfig.device.isMobile === 'function')
      ? window.AppConfig.device.isMobile()
      : (window.innerWidth <= 640);
    const n = isMobile ? 6 : 8;

    return Array.from({ length: n }).map(() => `
      <div class="repair-card-shell placeholder">
        <div class="repair-card-actions">
          <button class="btn ghost sm" disabled aria-hidden="true">✏️</button>
          <button class="btn ghost sm" disabled aria-hidden="true">🗑</button>
        </div>
        <div class="card repair-card placeholder">
          <div class="card-head">
            <div class="ph ph-line w-40"></div>
            <div class="ph ph-line w-70" style="margin-top:10px;"></div>
            <div class="ph ph-badges" style="margin-top:10px;"></div>
          </div>
          <div class="card-body">
            <div class="ph ph-line w-60"></div>
            <div class="ph ph-line w-90" style="margin-top:10px;"></div>
            <div class="ph ph-line w-80" style="margin-top:10px;"></div>
          </div>
          <div class="card-foot">
            <div class="ph ph-line w-80"></div>
            <div class="ph ph-line w-50"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderCardsIncrementally(repairs, cardsEl, token) {
    if (!cardsEl) return;

    const list = Array.isArray(repairs) ? repairs : [];
    const total = list.length;

    cardsEl.innerHTML = '';
    cardsEl.classList.add('is-rendering');

    const isMobile = (window.AppConfig && window.AppConfig.device && typeof window.AppConfig.device.isMobile === 'function')
      ? window.AppConfig.device.isMobile()
      : (window.innerWidth <= 640);

    const maxPerFrame = isMobile ? 10 : 18;
    const frameBudgetMs = isMobile ? 10 : 12;

    let i = 0;

    const step = () => {
      if (token !== this._renderToken) return;
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

      let html = '';
      let count = 0;

      while (i < total && count < maxPerFrame) {
        const repair = list[i];
        try {
          html += this.renderRepairCard(repair);
        } catch (err) {
          console.error('RepairUI.renderRepairCard failed:', err, repair);
          html += this._renderRepairCardError(repair, err);
        }
        i += 1;
        count += 1;

        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if ((now - t0) >= frameBudgetMs) break;
      }

      if (html) cardsEl.insertAdjacentHTML('beforeend', html);

      if (i < total) {
        requestAnimationFrame(step);
      } else {
        cardsEl.classList.remove('is-rendering');
      }
    };

    requestAnimationFrame(step);
  }

  /**
   * 合併短時間內多次資料變更（例如 init 時大量寫入/同步），避免重複整頁重繪
   */
  requestUpdateList() {
    if (this._updateScheduled) return;
    this._updateScheduled = true;
    requestAnimationFrame(() => {
      this._updateScheduled = false;
      try { this.updateList(); } catch (e) { console.warn('updateList failed:', e); }
    });
  }

  renderLinkageChips(repairId) {
    try {
      if (!window.LinkageHelper || typeof window.LinkageHelper.getForRepair !== 'function') return '';
      const s = window.LinkageHelper.getForRepair(repairId);

      const partsText = (s.parts && s.parts.total > 0)
        ? `${s.parts.primary.label} ${s.parts.primary.count}/${s.parts.total}`
        : '無';

      const quoteText = (s.quotes && s.quotes.total > 0)
        ? `${s.quotes.primary.label} ${s.quotes.primary.count}/${s.quotes.total}`
        : '未建立';

      const orderText = (s.orders && s.orders.total > 0)
        ? `${s.orders.primary.label} ${s.orders.primary.count}/${s.orders.total}`
        : '未建立';

      return `
        <div class="repair-linkage" data-stop-prop="1">
          ${this._chipHtml(`🧩 零件：${partsText}`, { static: true, tone: 'warning', className: 'quick', allowHtml: true, tagName: 'span' })}
          ${this._chipHtml(`🧾 報價：${quoteText}`, { static: true, tone: 'info', className: 'quick', allowHtml: true, tagName: 'span' })}
          ${this._chipHtml(`📦 訂單：${orderText}`, { static: true, tone: 'secondary', className: 'quick', allowHtml: true, tagName: 'span' })}
        </div>
      `;
    } catch (e) {
      console.warn('renderLinkageChips failed:', e);
      return '';
    }
  }

  /**
   * 渲染維修卡片（企業系統風：操作列外置）
   */
  renderRepairCard(repair) {
    const vm = this._toRepairCardViewModel(repair);

    // HTML 安全：避免使用者輸入含尖括號/引號造成卡片 DOM 破壞或整頁事件失效
    const escapeHtml = (input) => {
      const s = (input === null || input === undefined) ? '' : String(input);
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const safeId = escapeHtml(vm.id);
    const safeCustomer = escapeHtml(vm.customer);
    const safeMachine = escapeHtml(vm.machine);
    const safeIssue = escapeHtml(vm.issue);
    const safeOwnerName = escapeHtml(vm.ownerName);
    const safeCreatedDate = escapeHtml(vm.createdDateText);
    const safeCompletedDate = escapeHtml(vm.completedDateText);

    return `
      <div class="repair-card-shell" data-repair-id="${safeId}">
        <div class="repair-card-actions" data-no-open="1">
          <button class="btn sm ghost" type="button" data-action="repair-edit" data-id="${safeId}">✏️ 編輯</button>
          <button class="btn sm danger" type="button" data-action="repair-delete" data-id="${safeId}">🗑 刪除</button>
        </div>

        <div class="repair-card card accent-left" style="--accent-opacity:.55" data-action="repair-open-detail" data-id="${safeId}">
          <div class="card-head">
            <div style="min-width:0;">
              <div class="repair-card-id">${safeId}</div>
              <div class="muted repair-card-sub">${safeCustomer}</div>
            </div>
            <div class="card-head-right repair-card-badges">
              ${vm.needParts ? '<span class="badge badge-warning">需零件</span>' : ''}
              <span class="badge custom" style="--badge-color:${vm.priorityMeta.color};">${escapeHtml(vm.priorityMeta.label)}</span>
            </div>
          </div>

          <div class="card-body">
            <div class="repair-card-machine">${safeMachine}</div>
            <div class="repair-card-issue">${safeIssue}</div>
            ${this.renderLinkageChips(vm.id)}
          </div>

          <div class="card-foot repair-card-foot">
            <div class="repair-card-status">
              <span class="badge custom" style="--badge-color:${vm.statusMeta.color};">${escapeHtml(vm.statusMeta.label)}</span>
              <div class="progress-bar" style="--bar-color:${vm.statusMeta.color};">
                <div class="progress-fill" style="width: ${vm.progress}%;"></div>
              </div>
              <span class="progress-text">${vm.progress}%</span>
            </div>

            <div class="repair-card-meta">
              <span class="muted">👤 ${safeOwnerName}</span>
              ${this.scope === 'history'
                ? `<span class="muted">✅ 完成：${safeCompletedDate}</span>`
                : `<span class="muted">📅 ${safeCreatedDate}</span>`}
              ${vm.ageInDays > 7 ? `<span class="badge badge-warning">${vm.ageInDays} 天</span>` : ''}
              <a class="link" href="javascript:void(0)" data-action="repair-open-history" data-id="${safeId}">查看歷史</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  
  /**
   * 渲染空狀態
   */
  renderEmptyState() {
    const scopeTotal = (window._svc('RepairService') && typeof window._svc('RepairService').search === 'function')
      ? window._svc('RepairService').search({ scope: this.scope }).length
      : 0;

    // scope 不視為「額外篩選」；避免歷史模式永遠顯示「有篩選」
    const raw = this.getEffectiveFilters();
    const effectiveFilters = Object.entries(raw || {})
      .filter(([k, _]) => k !== 'scope')
      .filter(([_, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0));
    const hasExtraFilters = effectiveFilters.length > 0;

    if (window.UI && typeof window.UI.emptyStateHTML === 'function') {
      return window.UI.emptyStateHTML({
        icon: '📋',
        title: '沒有維修記錄',
        text: hasExtraFilters
          ? `沒有符合篩選條件的記錄（此分頁共 ${scopeTotal} 筆），請調整或清除篩選條件。`
          : '開始建立第一筆維修記錄',
        className: 'repairs-empty-state',
        actionHtml: this.renderEmptyStateActionBar(hasExtraFilters)
      });
    }

    return `
      <div class="empty-state repairs-empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">沒有維修記錄</div>
        <div class="empty-text">
          ${hasExtraFilters
            ? `沒有符合篩選條件的記錄（此分頁共 ${scopeTotal} 筆），請調整或清除篩選條件。`
            : '開始建立第一筆維修記錄'}
        </div>
        <div class="ops-actions ops-empty-actions repairs-empty-actions">${this.renderEmptyStateActionBar(hasExtraFilters)}</div>
      </div>
    `;
  }
  /**
   * 更新計數
   * @param {object=} meta 可傳入 { scopeTotal, filtered, rawFilters } 以避免重複 search
   */
  updateCount(meta) {
    const countEl = document.getElementById('repairs-count');
    if (!countEl) return;

    let scopeTotal = 0;
    let filtered = 0;
    let raw = null;

    try {
      if (meta && typeof meta === 'object') {
        scopeTotal = Number(meta.scopeTotal || 0);
        filtered = Number(meta.filtered || 0);
        raw = meta.rawFilters || null;
      } else {
        scopeTotal = window._svc('RepairService').search({ scope: this.scope }).length;
        filtered = window._svc('RepairService').search(this.getEffectiveFilters()).length;
        raw = this.getEffectiveFilters();
      }

      // 僅以 scope 為母集合；若使用者另外加了篩選條件，才顯示 x/y
      const effectiveFilters = Object.entries(raw || {})
        .filter(([k, _]) => k !== 'scope')
        .filter(([_, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0));
      const hasExtraFilters = effectiveFilters.length > 0;

      if (hasExtraFilters && filtered !== scopeTotal) {
        countEl.textContent = `顯示 ${filtered} / ${scopeTotal} 筆`;
      } else {
        countEl.textContent = `共 ${scopeTotal} 筆`;
      }
    } catch (_) {
      // ignore
    }
  }

  /**
   * 更新統計
   */
  updateStats(scopedOverride) {
    const statsContainer = document.getElementById('repairs-stats');
    if (statsContainer) {
      statsContainer.innerHTML = this.renderStats(scopedOverride);
    }
  }
  
    /**
   * 更新列表（增量渲染）
   */
  updateList() {
    const contentContainer = document.getElementById('repairs-content');
    if (!contentContainer) return;

    const effective = this.getEffectiveFilters();

    // filters/sort 變更時，重置分頁顯示數量
    const qk = this._buildQueryKey(effective);
    if (qk !== this._lastQueryKey) {
      this._lastQueryKey = qk;
      this.visibleCount = this.pageSize || this.getDefaultPageSize();
    }

    let repairs = [];
    try {
      repairs = window._svc('RepairService').search(effective) || [];
      repairs = window.RepairModel.sort(repairs, this.sortBy, this.sortOrder) || repairs;
    } catch (e) {
      console.warn('RepairUI.updateList search failed:', e);
      repairs = [];
    }

    const total = repairs.length;
    const visible = Math.min((this.visibleCount || this.pageSize || 60), total);
    const hasMore = visible < total;
    const visibleList = repairs.slice(0, visible);

    // 先更新主內容（殼 / 空狀態）
    if (!repairs || total === 0) {
      contentContainer.innerHTML = this.renderEmptyState();
      // 空狀態不需要渲染卡片
    } else {
      contentContainer.innerHTML = this.renderListShell(repairs, { loading: false, pagination: { visible, total, hasMore } });
      const cardsEl = document.getElementById('repairs-cards');
      const token = ++this._renderToken;
      this.renderCardsIncrementally(visibleList, cardsEl, token);
    }

    // 計數/統計：避免重複 search
    let scopeTotal = 0;
    try { scopeTotal = window._svc('RepairService').search({ scope: this.scope }).length; } catch (_) { scopeTotal = 0; }

    this.updateCount({ scopeTotal, filtered: total, rawFilters: effective });
    this.updateStats(repairs);
  }

  /**
   * 綁定事件
   */
  bindEvents() {
    // 綁定一次即可；避免重複 render 時累積 listener 造成 CPU/記憶體飆高
    if (this._eventsBound) return;

    // RepairService 在極早期（未登入/未 init）可能尚未就緒；此時不鎖死，讓下一次 render 再嘗試
    if (!window._svc('RepairService') || typeof window._svc('RepairService').onChange !== 'function') {
      console.warn('RepairService not ready; skip bindEvents');
      return;
    }

    this._eventsBound = true;

    // 監聽資料變更（僅綁一次）
    try {
      if (this._unsubRepairChange) {
        try { this._unsubRepairChange(); } catch (_) {}
        this._unsubRepairChange = null;
      }
      this._unsubRepairChange = window._svc('RepairService').onChange((action, repair) => {
        try {
          this.requestUpdateList();
        } catch (err) {
          if (window.ErrorHandler && typeof window.ErrorHandler.handle === 'function') {
            window.ErrorHandler.handle(err, 'Repairs', 'MEDIUM', { action, repairId: repair?.id });
          } else {
            console.error(err);
          }
        }
      });
    } catch (e) {
      console.warn('RepairUI.bindEvents onChange failed:', e);
    }

    // 監聽快捷鍵（僅綁一次）
    if (!this._shortcutNewRepairHandler) {
      this._shortcutNewRepairHandler = (window.guard
        ? window.guard(() => { this.openForm(); }, 'Repairs')
        : (() => { this.openForm(); }));
      window.addEventListener('shortcut:new-repair', this._shortcutNewRepairHandler);
    }

    // 設定更新：即時套用列表密度（移除頁面切換鈕後，統一由設定控制）
    if (!this._settingsUpdatedHandler) {
      this._settingsUpdatedHandler = (ev) => {
        try {
          const den = ev?.detail?.uiDensity || '';
          this._syncDensityFromGlobal(den);
          this.applyDensityClass();
          this.requestUpdateList();
        } catch (_) {}
      };
      window.addEventListener('settings:updated', this._settingsUpdatedHandler);
    }

    // 登出時清理（避免跨帳號累積 listener）
    if (!this._logoutCleanupBound) {
      this._logoutCleanupBound = true;
      window.addEventListener('auth:logout', () => {
        try { this._unsubRepairChange && this._unsubRepairChange(); } catch (_) {}
        this._unsubRepairChange = null;

        try {
          if (this._shortcutNewRepairHandler) window.removeEventListener('shortcut:new-repair', this._shortcutNewRepairHandler);
        } catch (_) {}
        this._shortcutNewRepairHandler = null;

        try {
          if (this._settingsUpdatedHandler) window.removeEventListener('settings:updated', this._settingsUpdatedHandler);
        } catch (_) {}
        this._settingsUpdatedHandler = null;

        this._eventsBound = false;
      });
    }

    // P2-2：事件委派綁定（只綁一次）
    this.bindDelegatedClicks();
  }



  /**
   * 事件委派（P2-2）：避免在每張卡片/每個按鈕綁定 handler
   * 規則：
   * - 使用 data-action / data-id
   * - 非 open-detail 類動作一律 stopPropagation，避免誤觸卡片點擊
   */
  _dispatchDelegatedAction(action, event) {
    const act = (action || '').toString().trim();
    if (!act || !act.startsWith('repairs.')) return false;
    const fnName = act.split('.').pop();
    const handler = (fnName && typeof window.RepairUI?.[fnName] === 'function') ? window.RepairUI[fnName] : null;
    if (!handler) return false;
    handler.call(window.RepairUI, event);
    return true;
  }

  bindDelegatedClicks() {
    if (this._delegatedClickHandler) return;

    const delegatedHandler = async (e) => {
      const target = e.target;
      if (!target || !target.closest) return;

      // 僅處理 Repairs 模組（含 Modal）範圍內的事件，避免干擾其他模組
      const inRepairs = !!(target.closest('.repairs-module') || target.closest('#repair-modal'));
      if (!inRepairs) return;

      // 取代過去 inline event.stopPropagation() 的用途：點擊標記區塊不應觸發外層（例如卡片點擊/外部關閉）
      if (target.closest('[data-stop-prop="1"]')) {
        try { e.stopPropagation(); } catch (_) {}
      }

      const el = target.closest('[data-action]');
      if (!el) return;

      const action = (el.getAttribute('data-action') || '').toString();
      const id = (el.getAttribute('data-id') || '').toString();
      const value = (el.getAttribute('data-value') || '').toString();
      const quickAdd = (el.getAttribute('data-quick-add') || '').toString();

      // 避免 a/button 預設行為
      if (el.tagName === 'A' || el.tagName === 'BUTTON') {
        try { e.preventDefault(); } catch (_) {}
      }

      const stop = () => {
        try { e.stopPropagation(); } catch (_) {}
      };

      try {
        switch (action) {
          // --- 既有卡片/連結動作 ---
          case 'repair-open-detail':
            // 允許冒泡，維持卡片點擊直覺
            if (window.RepairUI && typeof window.RepairUI.openDetail === 'function') {
              await window.RepairUI.openDetail(id);
            }
            return;

          case 'repair-edit':
            stop();
            if (window.RepairUI && typeof window.RepairUI.openForm === 'function') {
              await window.RepairUI.openForm(id);
            }
            return;

          case 'repair-delete':
            stop();
            if (window.RepairUI && typeof window.RepairUI.confirmDelete === 'function') {
              await window.RepairUI.confirmDelete(id);
            }
            return;

          case 'repair-open-history':
            stop();
            if (window.RepairUI && typeof window.RepairUI.openHistory === 'function') {
              await window.RepairUI.openHistory(id);
            }
            return;

          case 'quote-open-create':
            stop();
            if (window.repairUI && typeof window.repairUI.openOrCreateQuote === 'function') {
              await window.repairUI.openOrCreateQuote();
            }
            return;

          case 'order-open-create':
            stop();
            if (window.repairUI && typeof window.repairUI.openOrCreateOrder === 'function') {
              await window.repairUI.openOrCreateOrder();
            }
            return;

          // --- Phase 1B：移除 inline on* 後，改由 data-action ---
          case 'repairs.toggleFilters':
            stop();
            return window.RepairUI?.toggleFilters?.();

          case 'repairs.sync':
            stop();
            return window.RepairUI?.sync?.(e);

          case 'repairs.openForm':
            stop();
            return window.RepairUI?.openForm?.(id || null);

          case 'repairs.closeModal':
            stop();
            return window.RepairUI?.closeModal?.();

          case 'repairs.applyFilters':
            stop();
            return window.RepairUI?.applyFilters?.();

          case 'repairs.clearFilters':
            stop();
            return window.RepairUI?.clearFilters?.();

          case 'repairs.applyKeywordSearch':
            stop();
            return window.RepairUI?.applyKeywordSearch?.();

          case 'repairs.clearKeyword':
            stop();
            return window.RepairUI?.clearKeyword?.();

          case 'repairs.setScope':
            stop();
            return window.RepairUI?.setScope?.(value);

          case 'repairs.applyStatusChip':
            stop();
            return window.RepairUI?.applyStatusChip?.(value);

          case 'repairs.applyHistoryDatePreset':
            stop();
            return window.RepairUI?.applyHistoryDatePreset?.(value);

          case 'repairs.loadMore':
            stop();
            return window.RepairUI?.loadMore?.();

          case 'repairs.saveCurrentView':
            stop();
            return window.RepairUI?.saveCurrentView?.();

          case 'repairs.manageViews':
            stop();
            return window.RepairUI?.manageViews?.();

          case 'repairs.toggleSortOrder':
            stop();
            return window.RepairUI?.toggleSortOrder?.();

          case 'repairs.templateManage':
            stop();
            return window.RepairUI?.templateManage?.();

          case 'repairs.toggleCompanyDropdown':
            stop();
            return window.RepairUI?.toggleCompanyDropdown?.(e);

          case 'repairs.toggleContactDropdown':
            stop();
            return window.RepairUI?.toggleContactDropdown?.(e);

          case 'repairs.toggleMachineFilter':
            stop();
            return window.RepairUI?.toggleMachineFilter?.(e);

          case 'repairs.switchDetailTab':
            stop();
            return window.RepairUI?.switchDetailTab?.(value);

          case 'repairs.duplicateRepair':
            stop();
            return window.RepairUI?.duplicateRepair?.(id);

          case 'repairs.confirmDelete':
            stop();
            return window.RepairUI?.confirmDelete?.(id);

          case 'repairs.openRepairParts':
            stop();
            return window.RepairUI?.openRepairParts?.(id, (quickAdd === '1' || quickAdd === 'true') ? { quickAdd: true } : undefined);

          case 'repairs.focusWorklog':
            stop();
            return window.RepairUI?.focusWorklog?.(id, value);

          // --- SOP Hub：從維修單連動 ---
          case 'repairs.linkSop':
            stop();
            return window.RepairUI?.linkSop?.(id);

          case 'repairs.unlinkSop':
            stop();
            return window.RepairUI?.unlinkSop?.(id, value);

          case 'repairs.openSopVersions':
            stop();
            return window.RepairUI?.openSopVersions?.(value);

          case 'repairs.openSopsHub':
            stop();
            return window.RepairUI?.openSopsHub?.();

          default:
            return;
        }
      } catch (err) {
        if (window.ErrorHandler && typeof window.ErrorHandler.handle === 'function') {
          window.ErrorHandler.handle(err, 'Repairs', 'MEDIUM', { action, id, value });
        } else {
          console.error('Delegated click failed:', action, id, value, err);
        }
      }
    };

    this._delegatedClickHandler = (window.guard ? window.guard(delegatedHandler, 'Repairs') : delegatedHandler);

    // 綁在 document，避免列表/詳情 render 重建造成 handler 消失
    document.addEventListener('click', this._delegatedClickHandler);

    // Input/Change/Keydown：取代 inline oninput/onchange/onkeydown
    if (!this._delegatedInputHandler) {
      this._delegatedInputHandler = (ev) => {
        try {
          const t = ev.target;
          if (!t || !t.closest) return;
          if (!(t.closest('.repairs-module') || t.closest('#repair-modal'))) return;
          if (t.id === 'repairs-keyword' || t.id === 'filter-keyword') {
            window.RepairUI?.handleKeywordDraftInput?.(ev);
            return;
          }
          const act = (t.getAttribute && t.getAttribute('data-action')) ? (t.getAttribute('data-action') || '').toString() : '';
          if (act === 'repairs.handleProgressChange') return window.RepairUI?.handleProgressChange?.(ev);
          if (act === 'repairs.handleCustomerPick') return window.RepairUI?.handleCustomerPick?.(ev);
          if (act === 'repairs.handleContactPick') return window.RepairUI?.handleContactPick?.(ev);
          if (act === 'repairs.handleMachineSearchInput') return window.RepairUI?.handleMachineSearchInput?.(ev);
          if (act === 'repairs.handleMachineManualInput') return window.RepairUI?.handleMachineManualInput?.(ev);
          if (this._dispatchDelegatedAction(act, ev)) return;
        } catch (_) {}
      };
      document.addEventListener('input', this._delegatedInputHandler);
    }

    if (!this._delegatedKeydownHandler) {
      this._delegatedKeydownHandler = (ev) => {
        try {
          const t = ev.target;
          if (!t || !t.closest) return;
          if (!(t.closest('.repairs-module') || t.closest('#repair-modal'))) return;
          if (t.id === 'repairs-keyword' || t.id === 'filter-keyword') {
            window.RepairUI?.handleKeywordKeydown?.(ev);
          }
        } catch (_) {}
      };
      document.addEventListener('keydown', this._delegatedKeydownHandler);
    }

    if (!this._delegatedChangeHandler) {
      this._delegatedChangeHandler = (ev) => {
        try {
          const t = ev.target;
          if (!t || !t.closest) return;
          if (!(t.closest('.repairs-module') || t.closest('#repair-modal'))) return;

          if (t.id === 'repairs-view-select') {
            window.RepairUI?.applySavedView?.(t.value);
            return;
          }
          if (t.id === 'sort-by') {
            window.RepairUI?.handleSort?.();
            return;
          }

          const act = (t.getAttribute && t.getAttribute('data-action')) ? (t.getAttribute('data-action') || '').toString() : '';
          if (act === 'repairs.applySavedView') return window.RepairUI?.applySavedView?.(t.value);
          if (act === 'repairs.handleSort') return window.RepairUI?.handleSort?.();
          if (act === 'repairs.handleStatusChange') return window.RepairUI?.handleStatusChange?.(ev);
          if (act === 'repairs.handleProductLineChange') return window.RepairUI?.handleProductLineChange?.(ev);
          if (act === 'repairs.handleMachineSelectChange') return window.RepairUI?.handleMachineSelectChange?.(ev);
          if (act === 'repairs.handleNeedPartsChange') return window.RepairUI?.handleNeedPartsChange?.(ev);
          if (this._dispatchDelegatedAction(act, ev)) return;
        } catch (_) {}
      };
      document.addEventListener('change', this._delegatedChangeHandler);
    }

    if (!this._delegatedSubmitHandler) {
      this._delegatedSubmitHandler = (ev) => {
        try {
          const t = ev.target;
          if (!t || !t.closest) return;
          if (!(t.closest('.repairs-module') || t.closest('#repair-modal'))) return;
          if (t.id === 'repair-form' || (t.getAttribute && t.getAttribute('data-action') === 'repairs.handleSubmit')) {
            try { ev.preventDefault(); } catch (_) {}
            window.RepairUI?.handleSubmit?.(ev);
          }
        } catch (_) {}
      };
      document.addEventListener('submit', this._delegatedSubmitHandler, true);
    }

  }


  /**
   * 確認並刪除維修單（軟刪除）
   * - 會將 isDeleted 標記為 true，並寫入 deletedAt/deletedBy
   * - 刪除後「進行中 / 歷史」列表都不再顯示
   */
  async confirmDelete(id) {
    const repairId = (id || '').toString().trim();
    if (!repairId) return;

    // 以較可判讀的資訊提示使用者
    const r = (window._svc('RepairService') && typeof window._svc('RepairService').get === 'function')
      ? window._svc('RepairService').get(repairId)
      : null;

    const title = (r && (r.repairNo || r.id)) ? (r.repairNo || r.id) : repairId;
    const customer = r ? (r.customer || '') : '';
    const machine = r ? (r.machine || '') : '';
    const hint = [customer, machine].filter(Boolean).join(' / ');
    const msg = `確定要刪除此維修單？

${title}${hint ? `
${hint}` : ''}

（軟刪除：不會出現在進行中/歷史列表，但仍保留於資料庫與變更紀錄）`;

    {
      const ok = (window.UI && typeof window.UI.confirm === 'function')
        ? await window.UI.confirm({ title: '確認刪除維修單', message: msg, okText: '刪除', cancelText: '取消', tone: 'danger' })
        : confirm(msg);
      if (!ok) return;
    }

    try {
      if (!window._svc('RepairService') || typeof window._svc('RepairService').delete !== 'function') {
        throw new Error('RepairService 尚未就緒');
      }

      await window._svc('RepairService').delete(repairId);

      // 若目前有開啟詳情/表單 modal，刪除後直接關閉避免殘留
      try {
        if (this.isModalOpen()) RepairUI.closeModal();
      } catch (_) {}

      this.currentRepair = null;
      this.currentView = 'list';

      // 主動刷新一次（雖然 onChange 也會刷新，但這裡確保 UI 立即同步）
      try { this.updateList(); } catch (_) {}

    } catch (error) {
      console.error('Repair delete error:', error);
      const msg = '刪除失敗：' + (error?.message || error);
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
      else alert(msg);
    }
  }

  /**
   * 公司名稱選擇：更新聯絡人清單（datalist），不主動覆寫已填資料
   * （保底：避免 inline handler 觸發時因缺少方法而造成全站 Fatal）
   */
  handleCustomerPick(event) {
    try {
      const raw = (event && event.target ? event.target.value : '');
      const customerEl = (event && event.target) ? event.target : null;
      const company = (raw || '').toString().trim();

      const contactEl = this._getFormEl('contact');
      const phoneEl = this._getFormEl('phone');
      const emailEl = this._getFormEl('email');
      const datalist = document.getElementById('contact-list');

      const norm = (s) => (s || '').toString().trim().toLowerCase();

      const hasCompany = (name) => {
        const key = norm(name);
        if (!key || !window._svc('CustomerService')) return false;
        try {
          const all = (typeof window._svc('CustomerService').getAll === 'function')
            ? window._svc('CustomerService').getAll()
            : (Array.isArray(window._svc('CustomerService').customers) ? window._svc('CustomerService').customers : []);
          return (all || []).some(c => c && !c.isDeleted && norm(c.name) === key);
        } catch (_) {
          return false;
        }
      };

      const prevCompany = (this._lastCustomerCompany || '').toString().trim();
      const prevKey = norm(prevCompany);
      const newKey = norm(company);

      // 公司被清空：必須清除聯絡人/電話/Email 與 datalist，避免殘留上一次的資料
      if (!company) {
        try { if (customerEl) customerEl.dataset.companyPicked = '0'; } catch (_) {}
        if (contactEl) contactEl.value = '';
        if (phoneEl) phoneEl.value = '';
        if (emailEl) emailEl.value = '';
        if (datalist) datalist.innerHTML = '';
        // 清除上一個聯絡人的自動帶入記錄（避免後續聯絡人切換時誤判為可覆寫）
        this._lastPickedContactName = '';
        this._lastPickedContactPhone = '';
        this._lastPickedContactEmail = '';
        try { if (typeof this._closeContactDropdown === 'function') this._closeContactDropdown(true); } catch (_) {}
        this._lastCustomerCompany = '';
        this._lastCustomerCompanyValid = false;
        return;
      }

      // 公司變更（含 prevKey 尚未初始化的情況）：一律清空聯絡人/電話/Email，避免殘留上一家公司資料
      const hasPrevFilled = !!(
        (contactEl && String(contactEl.value || '').trim()) ||
        (phoneEl && String(phoneEl.value || '').trim()) ||
        (emailEl && String(emailEl.value || '').trim())
      );
      if (prevKey !== newKey && (prevKey || hasPrevFilled)) {
        if (contactEl) contactEl.value = '';
        if (phoneEl) phoneEl.value = '';
        if (emailEl) emailEl.value = '';

        // 公司變更：清除上一個聯絡人的自動帶入記錄
        this._lastPickedContactName = '';
        this._lastPickedContactPhone = '';
        this._lastPickedContactEmail = '';
        try { if (typeof this._closeContactDropdown === 'function') this._closeContactDropdown(true); } catch (_) {}
      }

      if (!window._svc('CustomerService')) {
        this._lastCustomerCompany = company;
        this._lastCustomerCompanyValid = false;
        try { if (customerEl) customerEl.dataset.companyPicked = '0'; } catch (_) {}
        return;
      }

      // 只有在「公司存在於客戶主檔」時，才刷新聯絡人清單；否則清空 datalist 避免誤導
      const isValidCompany = hasCompany(company);

      // 記錄：是否已「選定有效公司」（用於公司下拉行為判斷：避免必須先刪除才看得到完整清單）
      try { if (customerEl) customerEl.dataset.companyPicked = isValidCompany ? '1' : '0'; } catch (_) {}

      const contacts = (isValidCompany && typeof window._svc('CustomerService').getContactsByCompanyName === 'function')
        ? window._svc('CustomerService').getContactsByCompanyName(company)
        : [];

      // 更新聯絡人 datalist
      if (datalist) {
        const names = Array.from(new Set((contacts || []).map(c => (c.contact || '').toString().trim()).filter(Boolean)));
        datalist.innerHTML = names.map(n => {
          const safe = (n || '').toString().replace(/"/g, '&quot;');
          return safe ? `<option value="${safe}"></option>` : '';
        }).join('');
      }

      // 自動帶入：優先使用「最近一次維修單」的聯絡人；否則用客戶主檔最新一筆聯絡人
      const nonEmptyContacts = (contacts || []).filter(c => (c.contact || "").toString().trim());
      if (isValidCompany && contactEl && !contactEl.value && nonEmptyContacts.length >= 1) {
        let chosen = null;

        // 1) 最近一次維修單（同公司）有聯絡人者
        try {
          if (window._svc('RepairService') && typeof window._svc('RepairService').getAll === "function") {
            const all = window._svc('RepairService').getAll() || [];
            const ckey = norm(company);
            const toTs = (r) => {
              const a = r && (r.updatedAt || r.createdAt || r.createdDate || "");
              const t = Date.parse(String(a));
              return Number.isFinite(t) ? t : 0;
            };
            const recent = [...all].filter(r => r && !r.isDeleted && norm(r.customer) === ckey && (r.contact || r.phone || r.email))
              .sort((a, b) => toTs(b) - toTs(a))[0];
            const recentName = (recent && recent.contact ? String(recent.contact).trim() : "");
            if (recentName) {
              chosen = nonEmptyContacts.find(c => norm(c.contact) === norm(recentName)) || null;
            }
          }
        } catch (_) {}

        // 2) fallback：客戶主檔最新一筆（getContactsByCompanyName 已是最新在前）
        if (!chosen) chosen = nonEmptyContacts[0] || null;

        if (chosen) {
          contactEl.value = (chosen.contact || "").toString();
          // 公司自動帶入：若欄位是空的才寫入（不覆寫手動輸入）
          if (phoneEl && !phoneEl.value) phoneEl.value = chosen.phone || "";
          if (emailEl && !emailEl.value) emailEl.value = chosen.email || "";

          // 記住這次帶入的聯絡人資訊，供「使用者改選聯絡人」時判斷是否可覆寫
          this._lastPickedContactName = (chosen.contact || "").toString().trim();
          this._lastPickedContactPhone = (chosen.phone || "").toString();
          this._lastPickedContactEmail = (chosen.email || "").toString();
        }
      }

      this._lastCustomerCompany = company;
      this._lastCustomerCompanyValid = !!isValidCompany;
    } catch (e) {
      console.warn('handleCustomerPick failed:', e);
    }
  }

  /**
   * 聯絡人選擇：自動帶入電話/Email（不覆寫已填資料）
   */
  handleContactPick(event) {
    try {
      const contactName = (event && event.target ? event.target.value : '').trim();
      if (!contactName) return;
      if (!window._svc('CustomerService')) return;

      const companyEl = document.querySelector('#repair-form input[name="customer"]');
      const company = (companyEl && companyEl.value ? companyEl.value : '').trim();
      if (!company) return;

      const phoneEl = document.querySelector('#repair-form input[name="phone"]');
      const emailEl = document.querySelector('#repair-form input[name="email"]');

      const match = (typeof window._svc('CustomerService').findContact === 'function')
        ? window._svc('CustomerService').findContact(company, contactName)
        : null;

      if (!match) return;

      // 使用者改選聯絡人時：
      // - 若 phone/email 為空 → 直接帶入
      // - 若 phone/email 等於「上一個聯絡人自動帶入值」→ 視為未手動修改，可覆寫
      // - 若使用者已手動改過 phone/email → 不覆寫
      const prevName = (this._lastPickedContactName || '').toString().trim();
      const prevPhone = (this._lastPickedContactPhone || '').toString();
      const prevEmail = (this._lastPickedContactEmail || '').toString();

      const canSetPhone = !!(phoneEl && (!phoneEl.value || (prevName && phoneEl.value === prevPhone)));
      const canSetEmail = !!(emailEl && (!emailEl.value || (prevName && emailEl.value === prevEmail)));

      if (canSetPhone) phoneEl.value = match.phone || '';
      if (canSetEmail) emailEl.value = match.email || '';

      // 更新「最近一次選取聯絡人」記錄（用於判斷後續是否可覆寫）
      this._lastPickedContactName = contactName;
      this._lastPickedContactPhone = (match.phone || '').toString();
      this._lastPickedContactEmail = (match.email || '').toString();
    } catch (e) {
      console.warn('handleContactPick failed:', e);
    }
  }

}

// 建立全域實例
const repairUI = new RepairUI();
window.repairUI = repairUI;
window.RepairUI = RepairUI;

// Static bridge：RepairUI.* 供 data-action / 其他模組安全呼叫，實際實作仍由同一個 repairUI instance 處理。
Object.assign(RepairUI, {
  closeModal(options) {
    try {
      return window.repairUI?.closeModal?.(options);
    } catch (e) {
      console.warn('RepairUI.closeModal bridge failed:', e);
      return false;
    }
  },
  isModalOpen() {
    try {
      return !!window.repairUI?.isModalOpen?.();
    } catch (_) {
      return false;
    }
  }
});

// === V161.105: Template Manage (inline onclick fallback) ===
RepairUI.templateManage = function () {
  try {
    if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
      window.AppRouter.navigate('settings');
    } else {
      // fallback hash route
      window.location.hash = '#settings';
    }
    window.setTimeout(() => {
      const card =
        document.getElementById('settings-repair-templates-card') ||
        document.querySelector('section.templates-card') ||
        document.querySelector('[data-section="repair-templates"]');
      if (card && typeof card.scrollIntoView === 'function') {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        card.classList.add('flash-highlight');
        window.setTimeout(() => card.classList.remove('flash-highlight'), 1200);
      }
    }, 200);
  } catch (e) {
    console.warn('[TemplateManage] failed:', e);
  }
};



// === SOP Hub Integration (SOP-1) ===
// 從維修單詳情載入/關聯 SOP（作業流程）

RepairUI.loadSopMini = async function (repairId) {
  const rid = (repairId || '').toString().trim();
  const host = document.getElementById('repair-sops-mini');
  if (!host || !rid) return;

  try {
    if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
      await window.AppRegistry.ensureReady(['SOPService'], { loadAll: false });
    }
  } catch (_) {}

  const rs = (typeof window._svc === 'function') ? window._svc('RepairService') : null;
  const ss = (typeof window._svc === 'function') ? window._svc('SOPService') : null;
  const repair = rs && typeof rs.get === 'function' ? rs.get(rid) : null;

  if (!repair) {
    host.innerHTML = '<div class="muted">找不到維修單</div>';
    return;
  }

  const refs = Array.isArray(repair.sopRefs) ? repair.sopRefs : [];
  if (!refs.length) {
    host.innerHTML = '<div class="muted">尚未關聯 SOP</div>';
    return;
  }

  const esc = (s) => {
    const v = (s === null || s === undefined) ? '' : String(s);
    return v
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  const escAttr = (s) => esc(s).split('\n').join(' ').split('\r').join(' ');

  const rows = refs.map(ref => {
    const sid = (ref && (ref.sopId || ref.id)) ? String(ref.sopId || ref.id).trim() : '';
    if (!sid) return '';
    const sop = ss && typeof ss.get === 'function' ? ss.get(sid) : null;
    const title = esc(sop?.title || sid);
    const latest = Number.isFinite(+sop?.latestVersion) ? parseInt(sop.latestVersion, 10) : 0;
    const ver = Number.isFinite(+ref?.version) ? parseInt(ref.version, 10) : (latest || 0);
    const latestLink = String(sop?.latestDriveWebViewLink || '');

    return `
      <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid var(--color-border);border-radius:10px;background:var(--color-surface);margin:6px 0">
        <div style="min-width:0">
          <div style="font-weight:700;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
          <div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">sopId: <code>${esc(sid)}</code>　｜　v${ver || 0}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
          ${latestLink ? `<a class="btn sm" href="${escAttr(latestLink)}" target="_blank" rel="noopener">開啟</a>` : ''}
          <button class="btn sm" type="button" data-action="repairs.openSopVersions" data-value="${escAttr(sid)}">版本</button>
          <button class="btn sm danger" type="button" data-action="repairs.unlinkSop" data-id="${escAttr(rid)}" data-value="${escAttr(sid)}">移除</button>
        </div>
      </div>
    `;
  }).join('');

  host.innerHTML = rows || '<div class="muted">尚未關聯 SOP</div>';
};

RepairUI.openSopsHub = function () {
  // 從維修單（modal）導到 SOP Hub 時，先關閉所有維修相關 modal，避免畫面重疊
  try { RepairUI.closeModal?.(); } catch (_) {}
  try { document.getElementById('repair-sop-link-modal')?.remove(); } catch (_) {}
  try { document.getElementById('repair-sop-versions-modal')?.remove(); } catch (_) {}

  try {
    if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
      window.AppRouter.navigate('sops');
      return;
    }
  } catch (_) {}
};

RepairUI.linkSop = async function (repairId) {
  const rid = (repairId || '').toString().trim();
  if (!rid) return;

  try {
    if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
      await window.AppRegistry.ensureReady(['SOPService'], { loadAll: false });
    }
  } catch (_) {}

  const rs = (typeof window._svc === 'function') ? window._svc('RepairService') : null;
  const ss = (typeof window._svc === 'function') ? window._svc('SOPService') : null;
  if (!rs || !ss) {
    try { window.UI?.toast?.('SOPService 未載入', { type: 'error' }); } catch (_) {}
    return;
  }

  const repair = (typeof rs.get === 'function') ? rs.get(rid) : null;
  if (!repair) {
    try { window.UI?.toast?.('找不到維修單', { type: 'warning' }); } catch (_) {}
    return;
  }

  // 建立 modal（獨立於 repair-modal）
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.id = 'repair-sop-link-modal';

  const esc = (s) => {
    const v = (s === null || s === undefined) ? '' : String(s);
    return v
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const all = (typeof ss.getAll === 'function') ? (ss.getAll() || []) : [];

  const renderList = (kw) => {
    const k = (kw || '').toString().trim().toLowerCase();
    const refs = Array.isArray(repair.sopRefs) ? repair.sopRefs : [];
    const linked = new Set(refs.map(r => String(r?.sopId || r?.id || '').trim()).filter(Boolean));

    const list = all
      .filter(s => !s?.isDeleted)
      .filter(s => !k ? true : String(s._search || '').includes(k));

    if (!list.length) return '<div class="muted">沒有符合條件的 SOP</div>';

    return list.map(s => {
      const sid = String(s.id || '').trim();
      const title = esc(s.title || sid);
      const isLinked = linked.has(sid);
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--color-border);border-radius:10px;background:var(--color-surface);margin:6px 0">
          <div style="min-width:0">
            <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
            <div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.category || 'general')}　｜　v${Number.isFinite(+s.latestVersion) ? s.latestVersion : 0}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
            ${isLinked ? '<span class="badge">已關聯</span>' : `<button class="btn sm primary" type="button" data-sop-pick="${esc(sid)}">選擇</button>`}
          </div>
        </div>
      `;
    }).join('');
  };

  wrap.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h3>關聯 SOP</h3>
          <div class="muted" style="margin-top:6px;">維修單：<code>${esc(rid)}</code></div>
        </div>
        <button class="modal-close" type="button">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input class="input" id="repair-sop-link-search" placeholder="搜尋 SOP（標題 / tag / 摘要）" style="max-width:420px" />
          <button class="btn" type="button" id="repair-sop-link-search-btn">搜尋</button>
          <button class="btn ghost" type="button" id="repair-sop-link-clear-btn">清除</button>
          <button class="btn" type="button" id="repair-sop-link-open-hub">開啟 SOP Hub</button>
        </div>
        <div style="height:10px"></div>
        <div id="repair-sop-link-list">${renderList('')}</div>
      </div>
      <div class="modal-footer">
        <button class="btn ghost" type="button" id="repair-sop-link-close">關閉</button>
      </div>
    </div>
  `;

  const close = () => {
    try { wrap.remove(); } catch (_) {}
  };

  // bind close
  wrap.querySelector('.modal-close')?.addEventListener('click', close);
  wrap.querySelector('#repair-sop-link-close')?.addEventListener('click', close);
  // backdrop close follows config
  try {
    if (AppConfig?.ui?.modal?.closeOnBackdrop) {
      wrap.querySelector('.modal-backdrop')?.addEventListener('click', close);
    }
  } catch (_) {}

  const listEl = wrap.querySelector('#repair-sop-link-list');
  const inp = wrap.querySelector('#repair-sop-link-search');

  const apply = () => {
    const kw = String(inp?.value || '').trim();
    if (listEl) listEl.innerHTML = renderList(kw);
  };

  wrap.querySelector('#repair-sop-link-search-btn')?.addEventListener('click', apply);
  wrap.querySelector('#repair-sop-link-clear-btn')?.addEventListener('click', () => {
    try { if (inp) inp.value = ''; } catch (_) {}
    if (listEl) listEl.innerHTML = renderList('');
  });
  inp?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      try { e.preventDefault(); } catch (_) {}
      apply();
    }
  });

  wrap.querySelector('#repair-sop-link-open-hub')?.addEventListener('click', () => {
    try { close(); } catch (_) {}
    try { window.AppRouter?.navigate?.('sops'); } catch (_) {}
  });

  // pick handler
  wrap.addEventListener('click', async (e) => {
    try {
      const btn = e.target?.closest?.('[data-sop-pick]');
      if (!btn) return;
      const sid = String(btn.getAttribute('data-sop-pick') || '').trim();
      if (!sid) return;

      const refs = Array.isArray(repair.sopRefs) ? repair.sopRefs.slice() : [];
      const exists = refs.some(r => String(r?.sopId || r?.id || '').trim() === sid);
      if (!exists) refs.push({ sopId: sid });

      await rs.update(rid, { sopRefs: refs, historyNote: '關聯 SOP' });
      try { window.UI?.toast?.('已關聯 SOP', { type: 'success' }); } catch (_) {}

      // 重新開啟詳情以刷新 UI（避免複雜 DOM patch）
      try { RepairUI.openDetail(rid); } catch (_) {}
      close();
    } catch (err) {
      console.warn('link sop failed', err);
      try { window.UI?.toast?.(err?.message || '關聯失敗', { type: 'error' }); } catch (_) {}
    }
  });

  document.body.appendChild(wrap);
  try { inp?.focus?.(); } catch (_) {}
};

RepairUI.unlinkSop = async function (repairId, sopId) {
  const rid = (repairId || '').toString().trim();
  const sid = (sopId || '').toString().trim();
  if (!rid || !sid) return;

  const rs = (typeof window._svc === 'function') ? window._svc('RepairService') : null;
  if (!rs || typeof rs.get !== 'function' || typeof rs.update !== 'function') return;

  const repair = rs.get(rid);
  if (!repair) return;

  const ok = (window.UI?.confirm)
    ? await window.UI.confirm({ title: '移除 SOP 關聯', message: '確定要從此維修單移除 SOP 關聯？', tone: 'danger', okText:'移除' })
    : confirm('確定要移除 SOP 關聯？');
  if (!ok) return;

  try {
    const refs = Array.isArray(repair.sopRefs) ? repair.sopRefs.slice() : [];
    const next = refs.filter(r => String(r?.sopId || r?.id || '').trim() !== sid);
    await rs.update(rid, { sopRefs: next, historyNote: '移除 SOP 關聯' });
    try { window.UI?.toast?.('已移除', { type: 'success' }); } catch (_) {}
    try { RepairUI.openDetail(rid); } catch (_) {}
  } catch (e) {
    try { window.UI?.toast?.(e?.message || '移除失敗', { type: 'error' }); } catch (_) {}
  }
};

RepairUI.openSopVersions = async function (sopId) {
  const sid = (sopId || '').toString().trim();
  if (!sid) return;

  try {
    if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
      await window.AppRegistry.ensureReady(['SOPService'], { loadAll: false });
    }
  } catch (_) {}

  const ss = (typeof window._svc === 'function') ? window._svc('SOPService') : null;
  const sop = ss && typeof ss.get === 'function' ? ss.get(sid) : null;

  let list = [];
  try { if (ss && typeof ss.listVersions === 'function') list = await ss.listVersions(sid); } catch (_) {}

  const esc = (s) => {
    const v = (s === null || s === undefined) ? '' : String(s);
    return v
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  const escAttr = (s) => esc(s).split('\n').join(' ').split('\r').join(' ');

  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.id = 'repair-sop-versions-modal';

  const rows = (list && list.length) ? list.map(v => {
    const ver = Number.isFinite(+v.version) ? v.version : 0;
    const link = String(v.driveWebViewLink || '').trim();
    const ch = String(v.changeLog || '').trim();
    const createdAt = String(v.createdAt || '').slice(0, 19).replace('T',' ');
    return `
      <div style="padding:10px 12px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-surface);margin:8px 0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div style="font-weight:900">v${esc(ver)}</div>
          <div class="muted">${esc(createdAt)}</div>
        </div>
        ${ch ? `<div class="muted" style="margin-top:6px;line-height:1.6">${esc(ch)}</div>` : ''}
        <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
          ${link ? `<a class="btn sm" href="${escAttr(link)}" target="_blank" rel="noopener">開啟</a>` : '<span class="muted">（無連結）</span>'}
        </div>
      </div>
    `;
  }).join('') : '<div class="muted">目前尚無版本。</div>';

  wrap.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h3>版本列表｜${esc(sop?.title || sid)}</h3>
          <div class="muted" style="margin-top:6px;">sopId：<code>${esc(sid)}</code></div>
        </div>
        <button class="modal-close" type="button">✕</button>
      </div>
      <div class="modal-body">
        ${rows}
      </div>
      <div class="modal-footer">
        <button class="btn" type="button" id="repair-sop-versions-open-hub">開啟 SOP Hub</button>
        <button class="btn ghost" type="button" id="repair-sop-versions-close">關閉</button>
      </div>
    </div>
  `;

  const close = () => { try { wrap.remove(); } catch (_) {} };
  wrap.querySelector('.modal-close')?.addEventListener('click', close);
  wrap.querySelector('#repair-sop-versions-close')?.addEventListener('click', close);
  try {
    if (AppConfig?.ui?.modal?.closeOnBackdrop) {
      wrap.querySelector('.modal-backdrop')?.addEventListener('click', close);
    }
  } catch (_) {}
  wrap.querySelector('#repair-sop-versions-open-hub')?.addEventListener('click', () => {
    try { close(); } catch (_) {}
    try { window.AppRouter?.navigate?.('sops'); } catch (_) {}
  });

  document.body.appendChild(wrap);
};
