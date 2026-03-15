/**
 * 客戶管理 - UI 層（公司分組）
 * V161 - Customers Module - UI Layer
 * 
 * 設計：
 * - 以「公司（Customer.name）」為主
 * - 公司底下多筆「聯絡人（Customer.contact）」
 * - 公司分組支援展開 / 縮合（Accordion）
 */

class CustomerUI {
  constructor() {
    this.searchText = '';
    this.searchDraft = '';

    // 方案2：合併刷新避免短時間多次 re-render
    this._listUpdateRaf = null;
    // DOM delegated handlers 綁定狀態（避免跨頁返回後沿用舊容器狀態）
    this._domBound = false;
    this._boundContainer = null;
    // 增量渲染控制（避免大量公司卡片一次性渲染卡頓）
    this._renderToken = 0;

    // 公司展開/縮合狀態（以 encodeURIComponent(companyName) 當 key）
    this.collapsedCompanyKeys = new Set();
    this._loadCollapsedState();

    // P3：可摺疊篩選面板（多條件組合）
    this.filtersPanelOpen = this._loadFiltersPanelOpen();
    this.filters = this._loadFiltersState() || {
      updatedFrom: '',
      updatedTo: '',
      minRepairCount: '',
      hasPhone: false,
      hasEmail: false
    };

    // 方案2：篩選草稿（按【搜尋】才套用）
    this.filtersDraft = { ...(this.filters || {}) };
  }

  _getService() {
    try {
      const reg = (typeof window !== 'undefined' && window.AppRegistry) ? window.AppRegistry : null;
      if (reg && typeof reg.get === 'function') return reg.get('CustomerService');
      return (typeof window !== 'undefined' && typeof window._svc === 'function') ? window._svc('CustomerService') : null;
    } catch (_) {
      return (typeof window !== 'undefined' && typeof window._svc === 'function') ? window._svc('CustomerService') : null;
    }
  }

  _getCollapsedStorageKey() {
    const prefix = (window.AppConfig && window.AppConfig.system && window.AppConfig.system.storage && window.AppConfig.system.storage.prefix)
      ? window.AppConfig.system.storage.prefix
      : 'repair_tracking_v161_';
    return `${prefix}customers_company_collapsed`;
  }

  _getFiltersOpenStorageKey() {
    const prefix = (window.AppConfig && window.AppConfig.system && window.AppConfig.system.storage && window.AppConfig.system.storage.prefix)
      ? window.AppConfig.system.storage.prefix
      : 'repair_tracking_v161_';
    return `${prefix}ui_customers_filters_open`;
  }

  _getFiltersStateStorageKey() {
    const prefix = (window.AppConfig && window.AppConfig.system && window.AppConfig.system.storage && window.AppConfig.system.storage.prefix)
      ? window.AppConfig.system.storage.prefix
      : 'repair_tracking_v161_';
    return `${prefix}ui_customers_filters_state`;
  }

  _loadFiltersPanelOpen() {
    try {
      const raw = localStorage.getItem(this._getFiltersOpenStorageKey());
      if (raw === null || raw === undefined) return false;
      return raw === '1' || raw === 'true';
    } catch (_) {
      return false;
    }
  }

  _saveFiltersPanelOpen() {
    try {
      localStorage.setItem(this._getFiltersOpenStorageKey(), this.filtersPanelOpen ? '1' : '0');
    } catch (_) {}
  }

  _loadFiltersState() {
    try {
      const raw = localStorage.getItem(this._getFiltersStateStorageKey());
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return {
        updatedFrom: (obj.updatedFrom || '').toString(),
        updatedTo: (obj.updatedTo || '').toString(),
        minRepairCount: (obj.minRepairCount || '').toString(),
        hasPhone: !!obj.hasPhone,
        hasEmail: !!obj.hasEmail
      };
    } catch (_) {
      return null;
    }
  }

  _saveFiltersState() {
    try {
      localStorage.setItem(this._getFiltersStateStorageKey(), JSON.stringify(this.filters || {}));
    } catch (_) {}
  }

  _countActiveFilters() {
    const f = this.filters || {};
    let n = 0;
    if ((f.updatedFrom || '').toString().trim()) n += 1;
    if ((f.updatedTo || '').toString().trim()) n += 1;
    if ((f.minRepairCount || '').toString().trim()) n += 1;
    if (f.hasPhone) n += 1;
    if (f.hasEmail) n += 1;
    return n;
  }

  _escapeAttr(input) {
    const s = (input === null || input === undefined) ? '' : String(input);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .split('\n').join(' ')
      .split('\r').join(' ');
  }

  _getFormsApi() {
    try {
      if (typeof window === 'undefined') return null;
      return window.customerUIFormsApi || window.customerUIForms || window.CustomerUIForms || null;
    } catch (_) {
      return null;
    }
  }
  _updateFiltersToggleButtonDraft() {
    const btn = document.getElementById('customers-toggle-filters-btn');
    if (!btn) return;
    const f = this.filtersDraft || {};
    let n = 0;
    if ((f.updatedFrom || '').toString().trim()) n += 1;
    if ((f.updatedTo || '').toString().trim()) n += 1;
    if ((f.minRepairCount || '').toString().trim()) n += 1;
    if (f.hasPhone) n += 1;
    if (f.hasEmail) n += 1;
    const base = this.filtersPanelOpen ? '▾ 收合篩選' : '▸ 開啟篩選';
    btn.textContent = `🔍 ${base}${n ? ` (${n})` : ''}`;
  }

  _updateFiltersToggleButton() {
    const btn = document.getElementById('customers-toggle-filters-btn');
    if (!btn) return;
    const c = this._countActiveFilters();
    const base = this.filtersPanelOpen ? '▾ 收合篩選' : '▸ 開啟篩選';
    btn.textContent = `🔍 ${base}${c ? ` (${c})` : ''}`;
  }

  toggleFiltersPanel() {
    this.filtersPanelOpen = !this.filtersPanelOpen;
    this._saveFiltersPanelOpen();
    const panel = document.getElementById('customers-filters-panel');
    if (panel) panel.hidden = !this.filtersPanelOpen;
    this._updateFiltersToggleButton();
  }

  _renderEmptyState(message, isFilterEmpty) {
    const text = (message || '目前沒有資料').toString();
    const clearBtn = isFilterEmpty
      ? `<button class="btn btn-sm" style="margin-top:8px" onclick="window.customersUI?.clearAll?.()">清除所有篩選</button>`
      : '';
    if (window.UI && typeof window.UI.emptyStateHTML === 'function') {
      return window.UI.emptyStateHTML({
        icon: isFilterEmpty ? '🔍' : '🏢',
        title: isFilterEmpty ? '找不到符合條件的客戶' : '尚無客戶資料',
        text,
        className: 'customers-empty-state'
      }) + clearBtn;
    }
    return `<div class="empty-state customers-empty-state">${this._escapeAttr(text)}${clearBtn}</div>`;
  }
  scheduleUpdateList() {
    if (this._listUpdateRaf) return;
    this._listUpdateRaf = requestAnimationFrame(() => {
      this._listUpdateRaf = null;
      this.updateList();
    });
  }

  setFilterDraft(key, value) {
    const k = (key || '').toString();
    if (!k) return;
    this.filtersDraft = { ...(this.filtersDraft || {}) };
    this.filtersDraft[k] = value;
    this._updateFiltersToggleButtonDraft();
  }

  applyFilters() {
    this.searchText = (this.searchDraft || '').toString().trim();
    this.filters = { ...(this.filtersDraft || {}) };
    this._saveFiltersState();
    this._updateFiltersToggleButton();
    this.scheduleUpdateList();
  }

  clearAll() {
    this.searchDraft = '';
    this.searchText = '';
    this.filtersDraft = {
      updatedFrom: '',
      updatedTo: '',
      minRepairCount: '',
      hasPhone: false,
      hasEmail: false
    };
    this.filters = { ...(this.filtersDraft) };
    this._saveFiltersState();
    this._updateFiltersToggleButton();

    // 同步 UI 欄位（避免狀態已清，但輸入框仍顯示舊值）
    try {
      const searchEl = document.getElementById('customers-search');
      if (searchEl) searchEl.value = this.searchDraft;

      const vUpdatedFrom = (this.filtersDraft.updatedFrom || '');
      const vUpdatedTo = (this.filtersDraft.updatedTo || '');
      const vMinRepairCount = (this.filtersDraft.minRepairCount || '');

      const inUpdatedFrom = document.querySelector('input[data-filter-key="updatedFrom"]');
      const inUpdatedTo = document.querySelector('input[data-filter-key="updatedTo"]');
      const inMinRepair = document.querySelector('input[data-filter-key="minRepairCount"]');
      if (inUpdatedFrom) inUpdatedFrom.value = vUpdatedFrom;
      if (inUpdatedTo) inUpdatedTo.value = vUpdatedTo;
      if (inMinRepair) inMinRepair.value = vMinRepairCount;

      const cbPhone = document.querySelector('input[data-filter-flag="hasPhone"]');
      const cbEmail = document.querySelector('input[data-filter-flag="hasEmail"]');
      if (cbPhone) cbPhone.checked = !!this.filtersDraft.hasPhone;
      if (cbEmail) cbEmail.checked = !!this.filtersDraft.hasEmail;
    } catch (e) {
      console.warn('ClearAll DOM sync failed:', e);
    }

    this.scheduleUpdateList();
  }

  setFilter(key, value) {
    const k = (key || '').toString();
    if (!k) return;
    this.filters = { ...(this.filters || {}) };
    this.filters[k] = value;
    this._saveFiltersState();
    this._updateFiltersToggleButton();
    this.updateList();
  }

  clearFilters() {
    this.filters = {
      updatedFrom: '',
      updatedTo: '',
      minRepairCount: '',
      hasPhone: false,
      hasEmail: false
    };
    this._saveFiltersState();
    this._updateFiltersToggleButton();
    this.updateList();
  }

  _loadCollapsedState() {
    try {
      const key = this._getCollapsedStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        this.collapsedCompanyKeys = new Set(arr.filter(Boolean));
      }
    } catch (e) {
      // 安全：不阻斷 UI
      console.warn('Load collapsed state failed:', e);
    }
  }

  _saveCollapsedState() {
    try {
      const key = this._getCollapsedStorageKey();
      localStorage.setItem(key, JSON.stringify(Array.from(this.collapsedCompanyKeys)));
    } catch (e) {
      console.warn('Save collapsed state failed:', e);
    }
  }

  _companyKey(companyName) {
    const company = (companyName || '(未命名公司)').toString().trim() || '(未命名公司)';
    return encodeURIComponent(company);
  }

  isCollapsed(companyName) {
    const key = this._companyKey(companyName);
    return this.collapsedCompanyKeys.has(key);
  }

  toggleCompany(companyName) {
    const company = (companyName || '(未命名公司)').toString().trim() || '(未命名公司)';
    const key = this._companyKey(company);

    if (this.collapsedCompanyKeys.has(key)) {
      this.collapsedCompanyKeys.delete(key);
    } else {
      this.collapsedCompanyKeys.add(key);
    }

    this._saveCollapsedState();
    this._applyCollapseToDom(key);
  }

  _applyCollapseToDom(companyKey) {
    const card = document.querySelector(`.company-card[data-company-key="${companyKey}"]`);
    if (!card) {
      // 如果 DOM 不存在（例如搜尋/重繪過快），則直接重繪清單
      this.updateList();
      return;
    }

    const isCollapsed = this.collapsedCompanyKeys.has(companyKey);
    card.classList.toggle('is-collapsed', isCollapsed);

    const header = card.querySelector('.company-header');
    if (header) header.setAttribute('aria-expanded', String(!isCollapsed));

    const toggleBtn = card.querySelector('.company-toggle');
    if (toggleBtn) toggleBtn.textContent = isCollapsed ? '▸' : '▾';
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      return;
    }

    // 切換頁面後若掛載容器已變更，需重置 DOM 綁定狀態，避免第二次進頁時按鈕失效
    if (this._boundContainer !== container) {
      this._domBound = false;
      this._boundContainer = container;
    }

    const activeFilters = this._countActiveFilters();
    const filtersBtnText = `🔍 ${this.filtersPanelOpen ? '▾ 收合篩選' : '▸ 開啟篩選'}${activeFilters ? ` (${activeFilters})` : ''}`;

    container.innerHTML = `
      <div class="customers-module ops-module-shell">
        <div class="customers-toolbar module-toolbar customers-toolbar-surface">
          <div class="module-toolbar-left ops-toolbar-title">
            <div class="page-title">
            <h2>🏢 客戶管理</h2>
            <span class="muted ops-toolbar-summary" id="customers-count">載入中...</span>
            </div>
          </div>

          <div class="module-toolbar-right ops-actions">
            <div class="customers-search">
              <input id="customers-search" class="input" type="text" placeholder="搜尋公司/聯絡人/電話/Email" value="${this._escapeAttr(this.searchDraft)}" />
            </div>
            <button class="btn primary" data-action="applyFilters">搜尋</button>
            <button class="btn" data-action="clearAll">清除</button>
            <button class="btn" id="customers-toggle-filters-btn" data-action="toggleFilters">${this._escapeAttr(filtersBtnText)}</button>
            <button class="btn" data-action="openRenameCompany">📝 公司更名同步</button>
            <button class="btn primary" data-action="openForm">➕ 新增聯絡人</button>
          </div>
        </div>

        <div class="customers-filters panel compact ops-filter-panel" id="customers-filters-panel" ${this.filtersPanelOpen ? '' : 'hidden'}>
          <div class="panel-row">
            <div class="panel-left">
              <div class="panel-title"><strong>篩選</strong><span class="muted" style="margin-left:10px;">可多條件組合</span></div>
            </div>
            <div class="panel-right">
              <button class="btn primary" data-action="applyFilters">搜尋</button>
              <button class="btn" data-action="clearAll">清除</button>
            </div>
          </div>

          <div class="customers-filters-grid">
            <div class="field">
              <label class="form-label">更新日期（起）</label>
              <input class="input" type="date" value="${this._escapeAttr((this.filtersDraft?.updatedFrom || ''))}" data-filter-key="updatedFrom" />
            </div>
            <div class="field">
              <label class="form-label">更新日期（迄）</label>
              <input class="input" type="date" value="${this._escapeAttr((this.filtersDraft?.updatedTo || ''))}" data-filter-key="updatedTo" />
            </div>
            <div class="field">
              <label class="form-label">最少維修數</label>
              <input class="input" type="number" min="0" step="1" placeholder="例如 1" value="${this._escapeAttr((this.filtersDraft?.minRepairCount || ''))}" data-filter-key="minRepairCount" />
            </div>
            <div class="customers-filters-flags">
              <label class="form-checkbox">
                <input type="checkbox" ${this.filtersDraft?.hasPhone ? 'checked' : ''} data-filter-flag="hasPhone" />
                有電話
              </label>
              <label class="form-checkbox">
                <input type="checkbox" ${this.filtersDraft?.hasEmail ? 'checked' : ''} data-filter-flag="hasEmail" />
                有 Email
              </label>
            </div>
          </div>
        </div>

        <div class="customers-stats ops-kpi-grid" id="customers-stats">${this.renderStats()}</div>
        <div class="company-cards is-rendering" id="company-cards">${this.renderLoadingCards()}</div>
      </div>

      <div id="customer-modal" class="modal" hidden>
        <div class="modal-backdrop" data-action="closeModal"></div>
        <!-- 使用 modal-host 承載內層 .modal-dialog，避免外層再套一層 modal shell 造成尺寸與關閉按鈕位置異常 -->
        <div class="modal-host" id="customer-modal-content"></div>
      </div>
    `;

    // _bindDomHandlers 只在容器變更或首次掛載時才重新綁定（有 _domBound 旗標保護）。
    // 不在此強制重置 _domBound，否則每次 render() 都會累積監聽器，
    // 導致 toggleCompany 偶數次觸發時互相抵消（折疊按鈕失效 bug）。
    // 容器變更的情況已由 _bindDomHandlers 內的 _boundContainer 比對處理。
    this._bindDomHandlers(container);
    this.updateList();
  }

  _bindDomHandlers(container) {
    if (!container || this._domBound) return;
    this._domBound = true;
    this._boundContainer = container;

    // Click delegation (toolbar + list + modal)
    container.addEventListener('click', (e) => {
      try {
        const t = e.target;
        if (!t) return;

        // Do not hijack tel/mail links (allow default)
        const a = t.closest && t.closest('a');
        if (a) {
          const href = (a.getAttribute('href') || '').toLowerCase();
          if (href.startsWith('tel:') || href.startsWith('mailto:')) return;
        }

        const actEl = t.closest && t.closest('[data-action]');
        if (!actEl) return;

        const action = (actEl.getAttribute('data-action') || '').toString();
        const id = (actEl.getAttribute('data-id') || '').toString();
        const company = (actEl.getAttribute('data-company') || '').toString();

        // Optional: stopPropagation marker
        if (actEl.getAttribute('data-stop') === '1') {
          e.stopPropagation();
        }

        switch (action) {
          case 'applyFilters':
            this.applyFilters();
            return;
          case 'clearAll':
            this.clearAll();
            return;
          case 'toggleFilters':
            this.toggleFiltersPanel();
            return;
          case 'openRenameCompany':
            // 注意：openRenameCompany 為 CustomerUI 的靜態方法（Object.assign(CustomerUI, {...})）
            // 這裡不能用 instance this 呼叫，否則會出現 this.openRenameCompany is not a function
            CustomerUI.openRenameCompany();
            return;
          case 'openForm':
            // 注意：openForm 為 CustomerUI 的靜態方法
            CustomerUI.openForm(id, company);
            return;
          case 'toggleCompany':
            this.toggleCompany(company);
            return;
          case 'openDetail':
            // 注意：openDetail 為 CustomerUI 的靜態方法
            CustomerUI.openDetail(id);
            return;
          case 'closeModal':
            this.closeModal();
            return;
          case 'confirmDelete':
            const formsApi = this._getFormsApi();
            if (formsApi && typeof formsApi.confirmDelete === 'function') {
              formsApi.confirmDelete(id);
            }
            return;
          default:
            return;
        }
      } catch (err) {
        console.warn('customers delegated click failed:', err);
      }
    }, { passive: true });

    // Search input draft + keyboard
    container.addEventListener('input', (e) => {
      const t = e.target;
      if (!t) return;
      if (t.id === 'customers-search') {
        this.searchDraft = t.value || '';
        return;
      }
      const k = t.getAttribute && t.getAttribute('data-filter-key');
      if (k) this.setFilterDraft(k, t.value);
    });

    container.addEventListener('change', (e) => {
      const t = e.target;
      if (!t) return;
      const k = t.getAttribute && t.getAttribute('data-filter-key');
      if (k) {
        this.setFilterDraft(k, t.value);
        return;
      }
      const f = t.getAttribute && t.getAttribute('data-filter-flag');
      if (f) {
        this.setFilterDraft(f, !!t.checked);
      }
    });

    container.addEventListener('keydown', (e) => {
      const t = e.target;
      if (!t) return;
      if (t.id !== 'customers-search') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        this.applyFilters();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.clearAll();
      }
    });

    // Submit delegation for modal forms
    container.addEventListener('submit', (e) => {
      try { e.preventDefault(); } catch (_) {}
      try { e.stopPropagation(); } catch (_) {}
      const form = e.target;
      const formId = form && typeof form.getAttribute === 'function' ? form.getAttribute('id') : '';
      if (!form || !formId) return;
      if (formId === 'customer-form') {
        const formsApi = this._getFormsApi();
        if (formsApi && typeof formsApi.handleSubmit === 'function') {
          return formsApi.handleSubmit(e);
        }
      } else if (formId === 'company-rename-form') {
        if (window.CustomerUI && typeof window.CustomerUI.handleRenameCompany === 'function') {
          return window.CustomerUI.handleRenameCompany(e);
        }
      }
      return undefined;
    });
  }

  renderLoadingCards(count = 6) {
    const n = Math.max(3, Math.min(Number(count) || 6, 12));
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `
        <div class="card company-card placeholder">
          <div class="ph ph-line" style="width:62%"></div>
          <div class="ph ph-line" style="width:42%"></div>
          <div class="ph ph-badge" style="margin-top:6px;"></div>
          <div class="ph ph-line" style="width:86%;margin-top:10px;"></div>
          <div class="ph ph-line" style="width:72%"></div>
        </div>
      `;
    }
    return html;
  }

  renderStats() {
    const svc = this._getService();
    const stats = (svc && typeof svc.getStats === 'function')
      ? svc.getStats()
      : { totalCompanies: 0, totalContacts: 0, hasPhone: 0, hasEmail: 0, totalRepairCount: 0 };

    return `
      <div class="stat-card ops-kpi-card">
        <div class="stat-value ops-kpi-value">${stats.totalCompanies || 0}</div>
        <div class="stat-label ops-kpi-label">公司數</div>
      </div>
      <div class="stat-card ops-kpi-card">
        <div class="stat-value ops-kpi-value">${stats.totalContacts || 0}</div>
        <div class="stat-label ops-kpi-label">聯絡人數</div>
      </div>
      <div class="stat-card ops-kpi-card">
        <div class="stat-value ops-kpi-value">${stats.hasPhone || 0}</div>
        <div class="stat-label ops-kpi-label">有電話</div>
      </div>
      <div class="stat-card ops-kpi-card">
        <div class="stat-value ops-kpi-value">${stats.hasEmail || 0}</div>
        <div class="stat-label ops-kpi-label">有 Email</div>
      </div>
      <div class="stat-card ops-kpi-card">
        <div class="stat-value ops-kpi-value">${stats.totalRepairCount || 0}</div>
        <div class="stat-label ops-kpi-label">累計維修數</div>
      </div>
    `;
  }

  renderCompanyGroups() {
    const svc = this._getService();
    const groups = (svc && typeof svc.searchGroups === 'function') ? svc.searchGroups(this.searchText) : [];

    if (!groups || groups.length === 0) {
      const totalCompanies = (svc && typeof svc.getCompanies === 'function') ? svc.getCompanies().length : 0;
      const hasSearch = !!(this.searchText || '').toString().trim();
      const hasFilters = (this._countActiveFilters() > 0);
      const isFilterEmpty = totalCompanies > 0 && (hasSearch || hasFilters);
      const msg = isFilterEmpty
        ? '請調整搜尋或篩選條件後再試一次。'
        : '還沒有任何客戶資料，可以從維修單新增，或點擊右上角「新增客戶」。';
      return this._renderEmptyState(msg, isFilterEmpty);
    }

    return groups.map(g => this.renderCompanyCard(g)).join('');
  }

  renderCardsIncrementally(groups, cardsEl, token) {
    if (!cardsEl) return;
    const list = Array.isArray(groups) ? groups : [];

    let i = 0;
    let cleared = false;
    const total = list.length;

    cardsEl.classList.add('is-rendering');

    const step = () => {
      if (token !== this._renderToken) return;
      if (!cleared) {
        cardsEl.innerHTML = '';
        cleared = true;
      }

      const t0 = performance.now();
      let html = '';

      // 每幀時間預算（ms）：避免大量 DOM 拼接阻塞 UI
      while (i < total && (performance.now() - t0) < 10) {
        html += this.renderCompanyCard(list[i]);
        i++;
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

  _escapeJsString(v) {
    return (v || '').toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  renderCompanyCard(group) {
    const company = (group.companyName || '(未命名公司)').toString();
    const companyJs = this._escapeJsString(company);
    const contactCount = (group.contacts || []).length;

    const companyKey = this._companyKey(company);
    const collapsed = this.collapsedCompanyKeys.has(companyKey);

    const contacts = (group.contacts || []);

    // 收合時：顯示「最上方第一位」聯絡人（依目前排序的第一筆）
    const topContact = contacts.length > 0 ? contacts[0] : null;
    const topContactHtml = topContact ? (() => {
      const contactName = (topContact.contact || '').trim() || '<span class="muted">(未填聯絡人)</span>';
      const phone = topContact.phone ? `<a href="tel:${topContact.phone}">${topContact.phone}</a>` : '<span class="muted">無</span>';
      const email = topContact.email ? `<a href="mailto:${topContact.email}">${topContact.email}</a>` : '<span class="muted">無</span>';
      const rc = (typeof topContact.repairCount === 'number') ? topContact.repairCount : Number(topContact.repairCount) || 0;

      return `
        <div class=\"contact-row contact-preview\" data-action=\"openDetail\" data-id=\"${topContact.id}\">
          <div class="contact-main">
            <div class="contact-name">${contactName}</div>
            <div class="contact-meta">電話：${phone}　｜　Email：${email}</div>
          </div>
          <div class="contact-badges">
            <span class="badge">維修 ${rc}</span>
          </div>
        </div>
      `;
    })() : `
      <div class="contact-preview-empty muted">（尚無聯絡人）</div>
    `;

    const contactsHtml = contacts.map(c => {
      const contactName = (c.contact || '').trim() || '<span class="muted">(未填聯絡人)</span>';
      const phone = c.phone ? `<a href="tel:${c.phone}">${c.phone}</a>` : '<span class="muted">無</span>';
      const email = c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : '<span class="muted">無</span>';
      const rc = (typeof c.repairCount === 'number') ? c.repairCount : Number(c.repairCount) || 0;

      return `
        <div class=\"contact-row\" data-action=\"openDetail\" data-id=\"${c.id}\">
          <div class="contact-main">
            <div class="contact-name">${contactName}</div>
            <div class="contact-meta">電話：${phone}　｜　Email：${email}</div>
          </div>
          <div class="contact-badges">
            <span class="badge">維修 ${rc}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="company-card card accent-left ${collapsed ? 'is-collapsed' : ''}" data-company-key="${companyKey}">
        <div class="company-header" data-action="toggleCompany" data-company="${this._escapeAttr(company)}" aria-expanded="${collapsed ? 'false' : 'true'}">
          <div>
            <div class="company-name">${company}</div>
            <div class="company-sub">聯絡人：${contactCount}　｜　累計維修：${group.totalRepairCount || 0}</div>
          </div>
          <div class="company-actions">
            <button class=\"btn ghost company-toggle\" title=\"展開/縮合\" data-action=\"toggleCompany\" data-company=\"${this._escapeAttr(company)}\" data-stop=\"1\">${collapsed ? '▸' : '▾'}</button>
            <button class=\"btn\" data-action=\"openForm\" data-company=\"${this._escapeAttr(company)}\" data-stop=\"1\">➕ 新增聯絡人</button>
          </div>
        </div>
        <div class="company-preview">${topContactHtml}</div>
        <div class="company-contacts">${contactsHtml}</div>
      </div>
    `;
  }

  _applyFilters(groups) {
    const list = Array.isArray(groups) ? groups : [];
    const f = this.filters || {};
    const active = this._countActiveFilters();
    if (!active) return list;

    const from = (f.updatedFrom || '').toString().trim();
    const to = (f.updatedTo || '').toString().trim();
    const minRepair = parseInt((f.minRepairCount || '').toString().trim(), 10);
    const minRc = Number.isFinite(minRepair) ? Math.max(0, minRepair) : null;
    const needPhone = !!f.hasPhone;
    const needEmail = !!f.hasEmail;

    return list.filter(g => {
      const latest = (g?.latestUpdatedAt || '').toString();
      const d = latest ? latest.slice(0, 10) : '';
      if (from && d && d < from) return false;
      if (to && d && d > to) return false;

      if (minRc !== null && Number(g?.totalRepairCount || 0) < minRc) return false;

      const contacts = Array.isArray(g?.contacts) ? g.contacts : [];
      if (needPhone) {
        const ok = contacts.some(c => (c?.phone || '').toString().trim());
        if (!ok) return false;
      }
      if (needEmail) {
        const ok = contacts.some(c => (c?.email || '').toString().trim());
        if (!ok) return false;
      }
      return true;
    });
  }

  updateList() {
    const countEl = document.getElementById('customers-count');
    const statsEl = document.getElementById('customers-stats');
    const cardsEl = document.getElementById('company-cards');

    const svc = this._getService();
    const totalCompanies = (svc && typeof svc.getCompanies === 'function') ? svc.getCompanies().length : 0;
    const rawGroups = (svc && typeof svc.searchGroups === 'function') ? svc.searchGroups(this.searchText) : [];
    const groups = this._applyFilters(rawGroups);
    const filteredGroups = Array.isArray(groups) ? groups.length : 0;
    const hasSearch = !!(this.searchText || '').toString().trim();
    const hasFilters = (this._countActiveFilters() > 0);
    const label = (hasSearch || hasFilters) ? `共 ${filteredGroups} / ${totalCompanies} 家` : `共 ${totalCompanies} 家`;

    if (countEl) countEl.textContent = label;
    if (statsEl) statsEl.innerHTML = this.renderStats();

    if (cardsEl) {
      const token = ++this._renderToken;
      if (!groups || groups.length === 0) {
        cardsEl.classList.remove('is-rendering');
        const isFilterEmpty = totalCompanies > 0 && (hasSearch || hasFilters);
        const emptyMsg = isFilterEmpty
          ? '請調整搜尋或篩選條件後再試一次。'
          : '還沒有任何客戶資料，可以從維修單新增，或點擊右上角「新增客戶」。';
        cardsEl.innerHTML = this._renderEmptyState(emptyMsg, isFilterEmpty);
        return;
      }

      cardsEl.innerHTML = this.renderLoadingCards(Math.min(groups.length, 8));
      this.renderCardsIncrementally(groups, cardsEl, token);
    }
  }

  openModal(html) {
    const modal = document.getElementById('customer-modal');
    const content = document.getElementById('customer-modal-content');
    if (!modal || !content) return;
    content.innerHTML = html;
    // 必須使用 flex，才能套用 core/ui.css 的置中與遮罩排版
    // （先前使用 block 會導致視窗位置偏移，尤其在新增聯絡人/編輯時更明顯）
    modal.hidden = false;

    // 避免沿用上一次的捲動位置
    try { content.scrollTop = 0; } catch (_) {}
    try { modal.scrollTop = 0; } catch (_) {}

    // P3：必填欄位即時驗證（modal 開啟時綁定一次，並清除舊的 invalid 狀態）
    try {
      const form = content.querySelector('form');
      if (form && window.FormValidate) {
        window.FormValidate.bindForm(form);
        window.FormValidate.resetForm(form);
      }
      if (form && !form.dataset.directSubmitBound) {
        const directSubmit = (e) => {
          try { e.preventDefault(); } catch (_) {}
          try { e.stopPropagation(); } catch (_) {}
          try { e.stopImmediatePropagation?.(); } catch (_) {}
          // 不能用 form.id：表單內存在 <input name="id"> 時，named access 可能覆蓋掉表單 id 屬性。
          const formId = form && typeof form.getAttribute === 'function' ? form.getAttribute('id') : '';
          if (formId === 'customer-form' && window.CustomerUIForms?.handleSubmit) return window.CustomerUIForms.handleSubmit(e);
          if (formId === 'company-rename-form' && window.CustomerUI?.handleRenameCompany) return window.CustomerUI.handleRenameCompany(e);
          return undefined;
        };
        form.addEventListener('submit', directSubmit);
        form.dataset.directSubmitBound = '1';
      }

      // 桌機開表單時聚焦第一個可編輯欄位；手機避免一開 modal 就彈出鍵盤
      const firstInput = content.querySelector('input:not([type="hidden"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled]):not([readonly])');
      const allowAutoFocus = typeof window !== 'undefined' && window.innerWidth >= 768;
      if (allowAutoFocus && firstInput && typeof firstInput.focus === 'function') {
        requestAnimationFrame(() => {
          try { firstInput.focus(); } catch (_) {}
        });
      }
    } catch (e) {
      console.warn('FormValidate bind failed:', e);
    }
  }

  renderRenameCompanyModal() {
    const svc = this._getService();
    const companies = (svc && typeof svc.getCompanies === 'function') ? (svc.getCompanies() || []) : [];
    const options = companies.map(n => {
      const safe = (n || '').toString().replace(/"/g, '&quot;');
      return safe ? `<option value="${safe}"></option>` : '';
    }).join('');

    return `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>公司更名同步</h3>
          <button class="modal-close" data-action="closeModal">✕</button>
        </div>

        <form id="company-rename-form" class="modal-body">
          <div class="form-section">
            <h4 class="form-section-title">更名設定</h4>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label required">舊公司名稱</label>
                <input type="text" name="fromName" class="input" placeholder="例如：PTI" list="company-rename-list" autocomplete="off" required />
              </div>
              <div class="form-group">
                <label class="form-label required">新公司名稱</label>
                <input type="text" name="toName" class="input" placeholder="例如：PTI（新）" list="company-rename-list" autocomplete="off" required />
              </div>
              <div class="muted" style="grid-column: 1 / -1; font-size: 12px; line-height: 1.5;">
                會同步更新：<strong>客戶管理</strong>（同公司所有聯絡人）、<strong>維修單</strong>、<strong>報價單</strong>、<strong>訂單</strong>。<br>
                比對規則：公司名稱完全一致（忽略前後空白/連續空白/大小寫）。
              </div>
            </div>
          </div>
          <datalist id="company-rename-list">${options}</datalist>
        </form>

        <div class="modal-footer">
          <button class="btn" data-action="closeModal">取消</button>
          <button type="submit" form="company-rename-form" class="btn primary">執行更名</button>
        </div>
      </div>
    `;
  }

  closeModal() {
    const modal = document.getElementById('customer-modal');
    const content = document.getElementById('customer-modal-content');
    if (content) content.innerHTML = '';
    if (modal) modal.hidden = true;
  }
}

// 全域 UI 實例
const customerUI = new CustomerUI();
if (typeof window !== 'undefined') {
  window.customerUI = customerUI;
  window.CustomerUI = CustomerUI;
  try { window.AppRegistry?.register?.('CustomerUI', customerUI); } catch (_) {}
}

// 靜態方法（由 HTML onclick 呼叫）
Object.assign(CustomerUI, {
  onSearch(event) {
    const value = (event.target.value || '').trim();
    clearTimeout(window.customerUI.searchDebounce);
    window.customerUI.searchDebounce = setTimeout(() => {
      window.customerUI.searchText = value;
      window.customerUI.updateList();
    }, 300);
  },

  // P3：篩選面板（可摺疊 + 多條件）
  toggleFilters() {
    if (!window.customerUI) return;
    window.customerUI.toggleFiltersPanel();
  },

  onFilterChange(event, key) {
    if (!window.customerUI) return;
    const v = (event?.target?.value || '').toString();
    window.customerUI.setFilter(key, v);
  },

  onFilterToggle(event, key) {
    if (!window.customerUI) return;
    const v = !!(event?.target?.checked);
    window.customerUI.setFilter(key, v);
  },

  clearFilters() {
    if (!window.customerUI) return;
    window.customerUI.clearFilters();
    // 清除後若面板仍開啟，確保按鈕數字更新
    window.customerUI._updateFiltersToggleButton();
  },

  /**
   * 公司展開/縮合
   */
  toggleCompany(companyName) {
    if (!window.customerUI) return;
    window.customerUI.toggleCompany(companyName);
  },

  /**
   * 新增/編輯聯絡人
   * @param {string} id - Customer id
   * @param {string} presetCompany - 預填公司名稱
   */
  openForm(id = '', presetCompany = '') {
    if (!window.customerUI) return;
    const svc = window.customerUI._getService();
    const existing = (id && svc && typeof svc.get === 'function') ? svc.get(id) : null;
    const formsApi = (window.customerUI && typeof window.customerUI._getFormsApi === 'function') ? window.customerUI._getFormsApi() : null;
    if (!formsApi || typeof formsApi.renderForm !== 'function') {
      console.error('Customer forms API not available');
      return;
    }
    window.customerUI.openModal(formsApi.renderForm(existing, presetCompany));
  },

  /**
   * 公司更名同步（批次更新 客戶/維修/報價/訂單）
   */
  openRenameCompany() {
    if (!window.customerUI) return;
    window.customerUI.openModal(window.customerUI.renderRenameCompanyModal());
  },

  async handleRenameCompany(event) {
    try {
      event.preventDefault();
    } catch (_) {}

    const form = event?.target;
    const fd = form ? new FormData(form) : null;
    const fromName = (fd ? (fd.get('fromName') || '') : '').toString().trim();
    const toName = (fd ? (fd.get('toName') || '') : '').toString().trim();

    if (!fromName || !toName) {
      try { window.UI?.toast?.('請輸入舊公司名稱與新公司名稱', { type: 'error' }); } catch (_) {}
      return;
    }

    const svc = (window.customerUI && typeof window.customerUI._getService === 'function') ? window.customerUI._getService() : null;
    if (!svc || typeof svc.renameCompanyEverywhere !== 'function') {
      try { window.UI?.toast?.('系統尚未載入更名同步功能，請重新整理頁面後再試。', { type: 'error' }); } catch (_) {}
      return;
    }

    try {
      const res = await svc.renameCompanyEverywhere(fromName, toName);
      window.customerUI.closeModal();
      window.customerUI.updateList();
      const msg = `已完成公司更名同步：客戶 ${res.customers}、維修 ${res.repairs}、報價 ${res.quotes}、訂單 ${res.orders}`;
      try { window.UI?.toast?.(msg, { type: 'success' }); } catch (_) { alert(msg); }
    } catch (e) {
      console.warn('handleRenameCompany failed:', e);
      try { window.UI?.toast?.(`公司更名失敗：${e?.message || e}`, { type: 'error' }); } catch (_) { alert(String(e?.message || e)); }
    }
  },

  openDetail(id) {
    const svc = (window.customerUI && typeof window.customerUI._getService === 'function') ? window.customerUI._getService() : null;
    const c = (svc && typeof svc.get === 'function') ? svc.get(id) : null;
    if (!c) return;
    const formsApi = (window.customerUI && typeof window.customerUI._getFormsApi === 'function') ? window.customerUI._getFormsApi() : null;
    if (!formsApi || typeof formsApi.renderDetail !== 'function') {
      console.error('Customer forms API not available');
      return;
    }
    window.customerUI.openModal(formsApi.renderDetail(c));
  },

  closeModal() {
    window.customerUI.closeModal();
  }
});

console.log('✅ CustomerUI (grouped + accordion) loaded');
