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
    this.searchDebounce = null;

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
  }

  _getService() {
    try {
      return (typeof window._svc === 'function') ? window._svc('CustomerService') : window.CustomerService;
    } catch (_) {
      return window.CustomerService;
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
    if (panel) panel.style.display = this.filtersPanelOpen ? 'block' : 'none';
    this._updateFiltersToggleButton();
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

    const activeFilters = this._countActiveFilters();
    const filtersBtnText = `🔍 ${this.filtersPanelOpen ? '▾ 收合篩選' : '▸ 開啟篩選'}${activeFilters ? ` (${activeFilters})` : ''}`;

    container.innerHTML = `
      <div class="customers-module">
        <div class="customers-toolbar module-toolbar">
          <div class="module-toolbar-left">
            <div class="page-title">
            <h2>🏢 客戶管理</h2>
            <span class="muted" id="customers-count">載入中...</span>
            </div>
          </div>

          <div class="module-toolbar-right">
            <div class="customers-search">
              <input class="input" type="text" placeholder="搜尋公司/聯絡人/電話/Email" oninput="CustomerUI.onSearch(event)" />
            </div>
            <button class="btn" id="customers-toggle-filters-btn" onclick="CustomerUI.toggleFilters()">${this._escapeAttr(filtersBtnText)}</button>
            <button class="btn" onclick="CustomerUI.openRenameCompany()">📝 公司更名同步</button>
            <button class="btn primary" onclick="CustomerUI.openForm()">➕ 新增聯絡人</button>
          </div>
        </div>

        <div class="customers-filters panel compact" id="customers-filters-panel" style="display:${this.filtersPanelOpen ? 'block' : 'none'};">
          <div class="panel-row">
            <div class="panel-left">
              <div class="panel-title"><strong>篩選</strong><span class="muted" style="margin-left:10px;">可多條件組合</span></div>
            </div>
            <div class="panel-right">
              <button class="btn" onclick="CustomerUI.clearFilters()">清除</button>
            </div>
          </div>

          <div class="customers-filters-grid">
            <div class="field">
              <label class="form-label">更新日期（起）</label>
              <input class="input" type="date" value="${this._escapeAttr((this.filters?.updatedFrom || ''))}" onchange="CustomerUI.onFilterChange(event, 'updatedFrom')" />
            </div>
            <div class="field">
              <label class="form-label">更新日期（迄）</label>
              <input class="input" type="date" value="${this._escapeAttr((this.filters?.updatedTo || ''))}" onchange="CustomerUI.onFilterChange(event, 'updatedTo')" />
            </div>
            <div class="field">
              <label class="form-label">最少維修數</label>
              <input class="input" type="number" min="0" step="1" placeholder="例如 1" value="${this._escapeAttr((this.filters?.minRepairCount || ''))}" oninput="CustomerUI.onFilterChange(event, 'minRepairCount')" />
            </div>
            <div class="customers-filters-flags">
              <label class="form-checkbox">
                <input type="checkbox" ${this.filters?.hasPhone ? 'checked' : ''} onchange="CustomerUI.onFilterToggle(event, 'hasPhone')" />
                有電話
              </label>
              <label class="form-checkbox">
                <input type="checkbox" ${this.filters?.hasEmail ? 'checked' : ''} onchange="CustomerUI.onFilterToggle(event, 'hasEmail')" />
                有 Email
              </label>
            </div>
          </div>
        </div>

        <div class="customers-stats" id="customers-stats">${this.renderStats()}</div>
        <div class="company-cards is-rendering" id="company-cards">${this.renderLoadingCards()}</div>
      </div>

      <div id="customer-modal" class="modal" style="display:none;">
        <div class="modal-backdrop" onclick="CustomerUI.closeModal()"></div>
        <div class="modal-content" id="customer-modal-content"></div>
      </div>
    `;

    this.updateList();
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
      <div class="stat-card">
        <div class="stat-value">${stats.totalCompanies || 0}</div>
        <div class="stat-label">公司數</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalContacts || 0}</div>
        <div class="stat-label">聯絡人數</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.hasPhone || 0}</div>
        <div class="stat-label">有電話</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.hasEmail || 0}</div>
        <div class="stat-label">有 Email</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalRepairCount || 0}</div>
        <div class="stat-label">累計維修數</div>
      </div>
    `;
  }

  renderCompanyGroups() {
    const svc = this._getService();
    const groups = (svc && typeof svc.searchGroups === 'function') ? svc.searchGroups(this.searchText) : [];

    if (!groups || groups.length === 0) {
      return `
        <div class="empty-state">沒有符合條件的資料</div>
      `;
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
      const phone = topContact.phone ? `<a href="tel:${topContact.phone}" onclick="event.stopPropagation();">${topContact.phone}</a>` : '<span class="muted">無</span>';
      const email = topContact.email ? `<a href="mailto:${topContact.email}" onclick="event.stopPropagation();">${topContact.email}</a>` : '<span class="muted">無</span>';
      const rc = (typeof topContact.repairCount === 'number') ? topContact.repairCount : Number(topContact.repairCount) || 0;

      return `
        <div class="contact-row contact-preview" onclick="CustomerUI.openDetail('${topContact.id}')">
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
      const phone = c.phone ? `<a href="tel:${c.phone}" onclick="event.stopPropagation();">${c.phone}</a>` : '<span class="muted">無</span>';
      const email = c.email ? `<a href="mailto:${c.email}" onclick="event.stopPropagation();">${c.email}</a>` : '<span class="muted">無</span>';
      const rc = (typeof c.repairCount === 'number') ? c.repairCount : Number(c.repairCount) || 0;

      return `
        <div class="contact-row" onclick="CustomerUI.openDetail('${c.id}')">
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
        <div class="company-header" onclick="CustomerUI.toggleCompany('${companyJs}')" aria-expanded="${collapsed ? 'false' : 'true'}">
          <div>
            <div class="company-name">${company}</div>
            <div class="company-sub">聯絡人：${contactCount}　｜　累計維修：${group.totalRepairCount || 0}</div>
          </div>
          <div class="company-actions">
            <button class="btn ghost company-toggle" title="展開/縮合" onclick="event.stopPropagation(); CustomerUI.toggleCompany('${companyJs}')">${collapsed ? '▸' : '▾'}</button>
            <button class="btn" onclick="event.stopPropagation(); CustomerUI.openForm('', '${companyJs}')">➕ 新增聯絡人</button>
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
        cardsEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">沒有符合條件的資料</div>`;
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
    modal.style.display = 'flex';

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
          <button class="modal-close" onclick="CustomerUI.closeModal()">✕</button>
        </div>

        <form id="company-rename-form" class="modal-body" onsubmit="CustomerUI.handleRenameCompany(event)">
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
          <button class="btn" onclick="CustomerUI.closeModal()">取消</button>
          <button type="submit" form="company-rename-form" class="btn primary">執行更名</button>
        </div>
      </div>
    `;
  }

  closeModal() {
    const modal = document.getElementById('customer-modal');
    const content = document.getElementById('customer-modal-content');
    if (content) content.innerHTML = '';
    if (modal) modal.style.display = 'none';
  }
}

// 全域 UI 實例
const customerUI = new CustomerUI();
if (typeof window !== 'undefined') {
  window.customerUI = customerUI;
}

// 靜態方法（由 HTML onclick 呼叫）
Object.assign(CustomerUI, {
  onSearch(event) {
    const value = (event.target.value || '').trim();
    clearTimeout(window.customerUI.searchDebounce);
    window.customerUI.searchDebounce = setTimeout(() => {
      window.customerUI.searchText = value;
      window.customerUI.updateList();
    }, 120);
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
    window.customerUI.openModal(window.customerUIForms.renderForm(existing, presetCompany));
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
    window.customerUI.openModal(window.customerUIForms.renderDetail(c));
  },

  closeModal() {
    window.customerUI.closeModal();
  }
});

console.log('✅ CustomerUI (grouped + accordion) loaded');
