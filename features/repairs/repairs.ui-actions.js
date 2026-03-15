/**
 * 維修管理 - UI 層（靜態互動方法 / Modal / 報價訂單連動）
 * Extracted from repairs.ui.js (originally from line 3597)
 * Extends RepairUI.prototype (instance methods) and RepairUI (static methods).
 */

// Instance methods → RepairUI.prototype
Object.assign(RepairUI.prototype, {

  // ===============================
  // V161.105 - Quote/Order linkage
  // ===============================
  bindQuoteOrderBlock(){
    // P2-2：改用事件委派（data-action），避免每次 openDetail 重新綁 onclick
    const btnQ = document.getElementById('btn-open-create-quote');
    const btnO = document.getElementById('btn-open-create-order');
    if(btnQ && !btnQ.getAttribute('data-action')) btnQ.setAttribute('data-action','quote-open-create');
    if(btnO && !btnO.getAttribute('data-action')) btnO.setAttribute('data-action','order-open-create');
  },

  async refreshQuoteOrderSummary(){
  const box = document.getElementById('quote-order-summary');
  if(!box || !this.currentRepair) return;
  const rid = this.currentRepair.id;

  const pickLatest = (arr)=> (window.Utils && typeof window.Utils.pickLatest === 'function')
    ? window.Utils.pickLatest(arr)
    : ((Array.isArray(arr) && arr.length) ? arr[0] : null);

  let qCount = 0, oCount = 0;
  let qLatest = null, oLatest = null;

  try{
    if(window._svc('QuoteService')){
      if(typeof window._svc('QuoteService').getSummaryForRepair === 'function'){
        const s = window._svc('QuoteService').getSummaryForRepair(rid) || {};
        qCount = Number(s.count)||0;
        qLatest = s.latest || null;
      }else if(typeof window._svc('QuoteService').getForRepair === 'function'){
        const arr = await window._svc('QuoteService').getForRepair(rid);
        qCount = Array.isArray(arr) ? arr.length : 0;
        qLatest = pickLatest(arr);
      }
    }
    if(window._svc('OrderService')){
      if(typeof window._svc('OrderService').getSummaryForRepair === 'function'){
        const s = window._svc('OrderService').getSummaryForRepair(rid) || {};
        oCount = Number(s.count)||0;
        oLatest = s.latest || null;
      }else if(typeof window._svc('OrderService').getForRepair === 'function'){
        const arr = await window._svc('OrderService').getForRepair(rid);
        oCount = Array.isArray(arr) ? arr.length : 0;
        oLatest = pickLatest(arr);
      }
    }
  }catch(e){
    console.warn('RepairUI.refreshQuoteOrderSummary failed', e);
  }

  // 動作 chips：依是否存在最新單據決定顯示「建立 / 開啟」
  try{
    const btnQ = document.getElementById('btn-open-create-quote');
    const btnO = document.getElementById('btn-open-create-order');
    if(btnQ) btnQ.textContent = (qLatest ? '開啟報價' : '建立報價');
    if(btnO) btnO.textContent = (oLatest ? '開啟訂單' : '建立訂單');
  }catch(_){ }

  const esc = (s)=>escapeHTML((s??'').toString());
  const fmt = (v) => {
    try {
      if (window.TimeUtils && typeof window.TimeUtils.formatTaipeiDateTime === 'function') {
        return window.TimeUtils.formatTaipeiDateTime(v) || '-';
      }
      const ms = (typeof window.toEpoch === 'function')
        ? window.toEpoch(v, 0)
        : (window.TimeUtils?.toEpoch ? window.TimeUtils.toEpoch(v, 0) : (Date.parse(String(v ?? '')) || 0));
      if (!ms) return '-';
      return new Date(ms).toLocaleString();
    } catch (_) {
      return '-';
    }
  };
  const itemCount = (x)=> Array.isArray(x?.items) ? x.items.length : 0;

  const statusChip = (label, status)=>{
    const st = (status || '-').toString();
    return `<span class="chip static" title="${esc(st)}">${esc(label)}：${esc(st)}</span>`;
  };
  const timeChip = (label, v)=>{
    const t = fmt(v);
    return `<span class="chip static" title="${esc(t)}">${esc(label)}：${esc(t)}</span>`;
  };
  const countChip = (label, n)=> `<span class="chip static">${esc(label)}：${Number(n)||0}</span>`;

  box.innerHTML = `
    <div class="chip-row" style="justify-content:flex-start;">
      ${countChip('報價', qCount)}
      ${qLatest ? countChip('項目', itemCount(qLatest)) : ''}
      ${qLatest ? statusChip('最新狀態', qLatest.status) : '<span class="chip static">尚無報價</span>'}
      ${qLatest ? timeChip('更新', (qLatest.updatedAt||qLatest.createdAt)) : ''}
    </div>
    <div class="chip-row" style="justify-content:flex-start;margin-top:8px;">
      ${countChip('訂單', oCount)}
      ${oLatest ? countChip('項目', itemCount(oLatest)) : ''}
      ${oLatest ? statusChip('最新狀態', oLatest.status) : '<span class="chip static">尚無訂單</span>'}
      ${oLatest ? timeChip('更新', (oLatest.updatedAt||oLatest.createdAt)) : ''}
    </div>
  `;
  },

  async openOrCreateQuote(){
  if(!this.currentRepair) return;
  const rid = this.currentRepair.id;

  let target = null;
  try{
    if(window._svc('QuoteService')){
      if(typeof window._svc('QuoteService').getLatestForRepair === 'function'){
        target = window._svc('QuoteService').getLatestForRepair(rid);
      }else if(typeof window._svc('QuoteService').getSummaryForRepair === 'function'){
        target = window._svc('QuoteService').getSummaryForRepair(rid)?.latest || null;
      }else if(typeof window._svc('QuoteService').getForRepair === 'function'){
        const arr = await window._svc('QuoteService').getForRepair(rid);
        target = (window.Utils?.pickLatest) ? window.Utils.pickLatest(arr) : (arr && arr[0]) || null;
      }

      if(!target && typeof window._svc('QuoteService').createFromRepair === 'function'){
        target = await window._svc('QuoteService').createFromRepair(this.currentRepair);
      }
    }
  }catch(e){
    console.warn('RepairUI.openOrCreateQuote failed', e);
  }
  if(!target) return;

  // 確保模組載入後再切換並開啟明細（避免延遲載入造成空白）
  if (window.ModuleLoader?.ensure) {
    try { await window.ModuleLoader.ensure('quotes'); } catch (_) {}
  }
  if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
    await window.AppRouter.navigate('quotes');
    try { window.QuotesUI?.openDetail?.(target.id); } catch (_) {}
  }
  },

  async openOrCreateOrder(){
  if(!this.currentRepair) return;
  const rid = this.currentRepair.id;

  let target = null;
  try{
    if(window._svc('OrderService')){
      if(typeof window._svc('OrderService').getLatestForRepair === 'function'){
        target = window._svc('OrderService').getLatestForRepair(rid);
      }else if(typeof window._svc('OrderService').getSummaryForRepair === 'function'){
        target = window._svc('OrderService').getSummaryForRepair(rid)?.latest || null;
      }else if(typeof window._svc('OrderService').getForRepair === 'function'){
        const arr = await window._svc('OrderService').getForRepair(rid);
        target = (window.Utils?.pickLatest) ? window.Utils.pickLatest(arr) : (arr && arr[0]) || null;
      }

      if(!target && typeof window._svc('OrderService').createFromRepair === 'function'){
        target = await window._svc('OrderService').createFromRepair(this.currentRepair);
      }
    }
  }catch(e){
    console.warn('RepairUI.openOrCreateOrder failed', e);
  }
  if(!target) return;

  if (window.ModuleLoader?.ensure) {
    try { await window.ModuleLoader.ensure('orders'); } catch (_) {}
  }
  if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
    await window.AppRouter.navigate('orders');
    try { window.OrdersUI?.openDetail?.(target.id); } catch (_) {}
  }
},

  /**
   * 複製維修單：開啟新增表單並帶入來源欄位
   * - 不複製：狀態/進度、零件追蹤勾選、時間戳、歷史
   */
  async duplicateRepair(repairId) {
    try {
      const rid = (repairId || '').toString().trim();
      if (!rid) return;

      let src = null;
      try {
        if (window._svc('RepairService')) {
          if (typeof window._svc('RepairService').get === 'function') src = window._svc('RepairService').get(rid);
          else if (typeof window._svc('RepairService').getById === 'function') src = window._svc('RepairService').getById(rid);
          else if (typeof window._svc('RepairService').getAll === 'function') {
            const arr = window._svc('RepairService').getAll();
            if (Array.isArray(arr)) src = arr.find(x => x && x.id === rid);
          }
        }
      } catch (_) {}

      if (!src) {
        const msg = '找不到要複製的維修單';
        if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'warning' });
        else alert(msg);
        return;
      }

      // 深拷貝避免後續操作污染原始資料
      try {
        this._dupSourceRepair = (typeof structuredClone === 'function') ? structuredClone(src) : JSON.parse(JSON.stringify(src));
      } catch (_) {
        this._dupSourceRepair = { ...src };
      }

      await RepairUI.openForm(null);
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('已建立複製草稿，請確認後儲存', { type: 'info' });

    } catch (e) {
      console.warn('duplicateRepair failed:', e);
      const msg = e && e.message ? `複製失敗：${e.message}` : '複製失敗';
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
      else alert(msg);
    }
  },

  _applyDuplicatePrefill() {
    try {
      // 僅在「新增」表單（currentRepair 為 null）才允許帶入
      if (this.currentRepair) return false;
      if (!this._dupSourceRepair) return false;

      const src = this._dupSourceRepair;
      this._dupSourceRepair = null;

      const form = document.getElementById('repair-form');
      if (!form) return false;

      const setField = (name, value, fire = true) => {
        const el = form.querySelector(`[name="${name}"]`);
        if (!el) return;
        el.value = (value ?? '').toString();
        if (fire) {
          try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
          try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
        }
      };

      // 1) 客戶/聯絡人（先帶入公司，觸發聯絡人清單刷新）
      setField('customer', src.customer || '', true);
      setField('contact', src.contact || '', true);

      // 2) 電話/Email（覆寫為來源值）
      const phoneEl = form.querySelector('[name="phone"]');
      if (phoneEl) phoneEl.value = (src.phone || '').toString();
      const emailEl = form.querySelector('[name="email"]');
      if (emailEl) emailEl.value = (src.email || '').toString();

      // 3) 設備產品線/機型
      const plEl = form.querySelector('[name="productLine"]');
      if (plEl) {
        plEl.value = (src.productLine || '').toString();
        try { plEl.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
      }

      const machineVal = (src.machine || '').toString();
      if (machineVal) {
        const sel = document.getElementById('machine-select');
        const manual = document.getElementById('machine-manual');
        const final = document.getElementById('machine-final');

        if (sel && final) {
          const hasOpt = Array.from(sel.options || []).some(o => (o && o.value === machineVal));
          if (hasOpt) {
            sel.value = machineVal;
            try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
          } else {
            sel.value = '__manual__';
            try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
            if (manual) {
              manual.value = machineVal;
              try { manual.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
            } else {
              final.value = machineVal;
            }
          }
        } else {
          // fallback: hidden field
          const m = form.querySelector('[name="machine"]');
          if (m) m.value = machineVal;
        }
      }

      // 4) 其他主要欄位
      setField('serialNumber', src.serialNumber || '', true);
      setField('issue', src.issue || '', false);

      const contentEl = form.querySelector('[name="content"]');
      if (contentEl) contentEl.value = (src.content || '').toString();
      const notesEl = form.querySelector('[name="notes"]');
      if (notesEl) notesEl.value = (src.notes || '').toString();

      // 5) 優先級（可選）
      try {
        const pr = (src.priority || '').toString();
        if (pr) {
          const prEl = form.querySelector('[name="priority"]');
          if (prEl) prEl.value = pr;
        }
      } catch (_) {}

      // 聚焦問題描述，方便立即調整
      try { form.querySelector('[name="issue"]')?.focus?.(); } catch (_) {}

      return true;
    } catch (e) {
      console.warn('_applyDuplicatePrefill failed:', e);
      return false;
    }
  }
});

// Static methods → RepairUI
Object.assign(RepairUI, {
  // === 互動方法（由 HTML onclick 呼叫）===
  
  /**
   * 切換篩選面板
   */
  toggleFilters() {
    const instance = window.repairUI;
    if (instance && typeof instance.toggleFiltersPanel === 'function') {
      instance.toggleFiltersPanel();
      return;
    }

    // fallback（保相容）
    const panel = document.getElementById('repairs-filters');
    if (panel) {
      panel.hidden = !panel.hidden;
    }
  },

  // ========================================
  // Saved Views（自訂檢視）
  // ========================================

  applySavedView(viewId) {
    const instance = window.repairUI;
    if (!instance || typeof instance.applySavedViewById !== 'function') return;
    instance.applySavedViewById(viewId);
  },

  saveCurrentView() {
    const instance = window.repairUI;
    if (!instance || typeof instance.saveCurrentViewInteractive !== 'function') return;
    instance.saveCurrentViewInteractive();
  },

  manageViews() {
    const instance = window.repairUI;
    if (!instance || typeof instance.manageSavedViews !== 'function') return;
    instance.manageSavedViews();
  },
  
  /**
   * 處理搜尋（防抖）
   */
  handleSearch(event) {
    const instance = window.repairUI;
    // 中文/日文等輸入法組字期間（IME composing）不觸發搜尋
    if (event && event.isComposing) return;
    const keyword = event.target.value.trim();
    
    // 清除之前的計時器
    if (instance.searchDebounce) {
      clearTimeout(instance.searchDebounce);
    }
    
    // 設定新的計時器
    instance.searchDebounce = setTimeout(() => {
      if (!instance.filters) instance.filters = {};
      if (keyword) instance.filters.keyword = keyword;
      else delete instance.filters.keyword;
      instance.updateList();
    }, 300);
  },
  
  /**
   * 套用篩選
   */
  applyFilters() {
    const instance = window.repairUI;
    
    // 收集篩選條件
    const filters = {};
    
    const keywordRaw = (document.getElementById('filter-keyword')?.value || '').toString();
    const keyword = keywordRaw.trim();
    instance._draftKeyword = keywordRaw;
    if (keyword) filters.keyword = keyword;
    
    const status = document.getElementById('filter-status')?.value;
    if (status) filters.status = [status];
    
    const priority = document.getElementById('filter-priority')?.value;
    if (priority) filters.priority = [priority];
    
    
    const owner = document.getElementById('filter-owner')?.value;
    if (owner === 'me') filters.owner = (window.AppState?.getUid?.() || window.currentUser?.uid || '');
    const dateFrom = document.getElementById('filter-date-from')?.value;
    if (dateFrom) {
      if (instance.scope === 'history') filters.completedFrom = dateFrom;
      else filters.dateFrom = dateFrom;
    }

    const dateTo = document.getElementById('filter-date-to')?.value;
    if (dateTo) {
      if (instance.scope === 'history') filters.completedTo = dateTo;
      else filters.dateTo = dateTo;
    }
    
    const needParts = document.getElementById('filter-need-parts')?.value;
    if (needParts) filters.needParts = needParts === 'true';
    
    instance.filters = filters;

    // keyword 偏好保存 + 同步上方關鍵字輸入框
    try { instance.saveKeyword(keyword); } catch (_) {}
    try {
      const topKw = document.getElementById('repairs-keyword');
      if (topKw && topKw.value !== keywordRaw) topKw.value = keywordRaw;
      const clearBtn = document.getElementById('repairs-keyword-clear');
      if (clearBtn) clearBtn.disabled = !(keywordRaw.trim() || keyword.trim());
    } catch (_) {}

    instance.visibleCount = instance.pageSize;
    instance.updateList();
  },

  /**
   * 狀態 Chips：快速套用/清除狀態篩選
   */
  applyStatusChip(encodedValue) {
    const instance = window.repairUI;
    const value = decodeURIComponent(encodedValue || '');

    if (!instance.filters) instance.filters = {};
    if (value) {
      instance.filters.status = [value];
    } else {
      delete instance.filters.status;
    }

    // 同步篩選面板（即使面板收起來也要保持一致）
    const sel = document.getElementById('filter-status');
    if (sel) sel.value = value;

    instance.updateList();
  },

  /**
   * 完成日期快速範圍（歷史模式）
   */
  applyHistoryDatePreset(key) {
    const instance = window.repairUI;
    if (!instance || typeof instance.applyHistoryDatePreset !== 'function') return;
    instance.applyHistoryDatePreset(key);
  },

  /**
   * 分頁：顯示更多
   */
  loadMore() {
    const instance = window.repairUI;
    if (!instance || typeof instance.loadMore !== 'function') return;
    instance.loadMore();
  },

  /**
   * scope 切換：active / history
   */
  setScope(scope) {
    const instance = window.repairUI;
    if (!instance || typeof instance.setScope !== 'function') return;
    instance.setScope(scope);
  },

  /**
   * 列表密度切換：標準 / 緊湊
   */
  setListDensity(mode) {
    // 已移除列表上的密度切換鈕；此方法保留（相容舊程式/除錯），但不再寫入獨立偏好
    const instance = window.repairUI;
    const m = (mode === 'compact') ? 'compact' : 'standard';
    instance.listDensity = m;
    instance.applyDensityClass();
    instance.updateList();
  },
  
  /**
   * 清除篩選
   */
    clearFilters() {
    const instance = window.repairUI;

    // 清除表單（篩選面板可能收起，但元素仍在 DOM；仍做防呆）
    [
      'filter-keyword',
      'filter-status',
      'filter-priority',
      'filter-owner',
      'filter-date-from',
      'filter-date-to',
      'filter-need-parts'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // 清除篩選條件
    instance.filters = {};
    // keyword 草稿/偏好同步清除
    instance._draftKeyword = '';
    try { instance.saveKeyword(''); } catch (_) {}
    try {
      const topKw = document.getElementById('repairs-keyword');
      if (topKw) topKw.value = '';
      const clearBtn = document.getElementById('repairs-keyword-clear');
      if (clearBtn) clearBtn.disabled = true;
    } catch (_) {}

    instance.visibleCount = instance.pageSize;
    instance.updateList();
  },

  // ========================================
  // 關鍵字搜尋（列表）
  // ========================================

  // 使用者輸入：只更新「草稿」，不立即觸發搜尋
  handleKeywordDraftInput(event) {
    const instance = window.repairUI;
    if (!instance) return;
    const el = event?.target;
    const v = (el?.value || '').toString();
    instance._draftKeyword = v;

    // 同步篩選面板 keyword（若存在）
    try {
      const kwEl = document.getElementById('filter-keyword');
      if (kwEl && kwEl !== el && kwEl.value !== v) kwEl.value = v;
    } catch (_) {}

    // 更新清除按鈕狀態（避免需要重新 render）
    try {
      const applied = (instance.filters && instance.filters.keyword) ? String(instance.filters.keyword) : '';
      const clearBtn = document.getElementById('repairs-keyword-clear');
      if (clearBtn) clearBtn.disabled = !(v.trim() || applied.trim());
    } catch (_) {}
  },

  // Enter 直接套用搜尋
  handleKeywordKeydown(event) {
    if (!event) return;
    if (event.key === 'Enter') {
      try { event.preventDefault(); } catch (_) {}
      try { RepairUI.applyKeywordSearch(); } catch (_) {}
    }
  },

  // 套用關鍵字（按鈕/Enter）
  applyKeywordSearch() {
    const instance = window.repairUI;
    if (!instance) return;
    const el = document.getElementById('repairs-keyword');
    const raw = (el ? el.value : (instance._draftKeyword || '')).toString();
    const kw = raw.trim();

    instance._draftKeyword = raw;
    instance.filters = instance.filters || {};
    if (kw) instance.filters.keyword = kw;
    else delete instance.filters.keyword;

    try { instance.saveKeyword(kw); } catch (_) {}

    // 同步篩選面板輸入
    try {
      const kwEl = document.getElementById('filter-keyword');
      if (kwEl && kwEl.value !== raw) kwEl.value = raw;
    } catch (_) {}

    // 更新清除按鈕狀態
    try {
      const clearBtn = document.getElementById('repairs-keyword-clear');
      if (clearBtn) clearBtn.disabled = !(raw.trim() || kw);
    } catch (_) {}

    // 關鍵字套用時回到第一頁
    instance.visibleCount = instance.pageSize;
    instance.updateList();
  },

  clearKeyword() {
    const instance = window.repairUI;
    if (!instance) return;
    instance.filters = instance.filters || {};
    delete instance.filters.keyword;
    instance._draftKeyword = '';
    try { instance.saveKeyword(''); } catch (_) {}

    const el = document.getElementById('repairs-keyword');
    if (el) el.value = '';
    const kwEl = document.getElementById('filter-keyword');
    if (kwEl) kwEl.value = '';
    const clearBtn = document.getElementById('repairs-keyword-clear');
    if (clearBtn) clearBtn.disabled = true;

    instance.visibleCount = instance.pageSize;
    instance.updateList();
  },

  
  /**
   * 處理排序
   */
  handleSort() {
    const instance = window.repairUI;
    const sortBy = document.getElementById('sort-by')?.value;
    
    if (sortBy) {
      instance.sortBy = sortBy;
      instance.updateList();
    }
  },
  
  /**
   * 切換排序順序
   */
  toggleSortOrder() {
    const instance = window.repairUI;
    instance.sortOrder = instance.sortOrder === 'asc' ? 'desc' : 'asc';
    instance.updateList();
  },
  
  /**
   * 同步資料
   */
  async sync(ev) {
    try {
      const e = ev || (typeof window !== 'undefined' ? window.event : null);
      const btn = (e && e.target) ? e.target : null;
      if (btn) {
        btn.disabled = true;
        btn.textContent = '🔄 同步中...';
      }
      
      await window._svc('RepairService').sync();
      
      const instance = window.repairUI;
      instance.updateList();
      
      if (btn) btn.textContent = '✅ 同步完成';
      setTimeout(() => {
        if (btn) btn.disabled = false;
        if (btn) btn.textContent = '🔄 同步';
      }, 2000);
      
    } catch (error) {
      console.error('Sync error:', error);
      {
        const msg = '同步失敗：' + (error?.message || error);
        if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
        else alert(msg);
      }
    }
  },
  
  // === Modal 方法 ===

  /**
   * 同步「維修詳情/歷史」視窗大小。
   *
   * 背景：renderDetail() 內部可能用 .modal-dialog 搭配 modal-wide / modal-large 等尺寸類別，
   * 但外層 #repair-modal-content 仍是預設寬度，會造成視窗大小看起來不一致。
   *
   * 作法：偵測內容內第一個 .modal-dialog 的尺寸 class，複製到外層 content。
   */
  _syncModalSize(contentEl) {
    if (!contentEl) return;
    const sizeClasses = ['modal-wide', 'modal-large', 'modal-xlarge'];

    // 先清掉舊的尺寸（避免上一次殘留）
    try { contentEl.classList.remove(...sizeClasses); } catch (_) {}

    const dialog = contentEl.querySelector?.('.modal-dialog');
    if (!dialog) return;

    const hit = sizeClasses.find(c => dialog.classList.contains(c));
    if (hit) {
      try { contentEl.classList.add(hit); } catch (_) {}
    }
  },
  
  /**
   * 開啟新增表單
   */
  async openForm(repairId = null) {
    const instance = window.repairUI;
    instance.currentRepair = repairId ? window._svc('RepairService').get(repairId) : null;

    const modal = document.getElementById('repair-modal');
    const content = document.getElementById('repair-modal-content');

    if (!(modal && content)) return;

    // 避免從「詳情/歷史（較寬）」切回表單時，尺寸 class 殘留
    try { content.classList.remove('modal-wide', 'modal-large', 'modal-xlarge'); } catch (_) {}

    // 先打開 modal（避免使用者感覺「沒反應」）
    instance.setModalOpen(true);

    // 每次開啟表單都要強制回到頂部，避免上一次在 modal 內捲動的位置被沿用
    // （使用者要求：滑桿/狀態區必須在最上方，開啟新增/編輯時要直接看到）
    const resetModalScroll = () => {
      try { content && (content.scrollTop = 0); } catch (_) {}
      try { modal && (modal.scrollTop = 0); } catch (_) {}
    };
    resetModalScroll();
    content.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>${repairId ? '編輯維修單' : '新增維修單'}</h3>
          <button class="modal-close" type="button" data-action="repairs.closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="muted">載入中...</div>
        </div>
      </div>
    `;

    // 確保 CustomerService 已初始化，避免「公司名稱」清單偶發空白
    try {
      if (window._svc('CustomerService') && typeof window._svc('CustomerService').init === 'function') {
        await window._svc('CustomerService').init();
      }
    } catch (e) {
      console.warn('CustomerService init skipped:', e);
    }

    // 初始化 Settings（提供「常用公司 Top N / 最近使用 / 歷史帶入」）
    try {
      if (window._svc('SettingsService') && typeof window._svc('SettingsService').init === 'function' && !window._svc('SettingsService').isInitialized) {
        await window._svc('SettingsService').init();
      }
    } catch (e) {
      console.warn('SettingsService init skipped:', e);
    }

    // 初始化 RepairTemplatesService（避免模板下拉初次載入為空）
    try {
      if (window.Utils && typeof window.Utils.ensureServiceReady === 'function') {
        await window.Utils.ensureServiceReady('RepairTemplatesService');
      } else if (window._svc('RepairTemplatesService') && typeof window._svc('RepairTemplatesService').init === 'function' && !window._svc('RepairTemplatesService').ready) {
        await window._svc('RepairTemplatesService').init();
      }
    } catch (e) {
      console.warn('RepairTemplatesService init skipped:', e);
    }

    // 重繪表單
    content.innerHTML = instance.renderForm();
    // 表單預設使用標準寬度；仍同步一次以確保沒有殘留尺寸
    RepairUI._syncModalSize(content);

    // 若表單內容本身宣告尺寸（未來擴充），同步到外層
    RepairUI._syncModalSize(content);

    // 再次保險：render 後與下一個 frame 都重置一次（避免瀏覽器因 focus/重排而跳到中段）
    resetModalScroll();
    requestAnimationFrame(resetModalScroll);

    // 表單後處理（快速選 / 歷史帶入等）
    try {
      if (typeof instance.afterRenderForm === 'function') {
        await instance.afterRenderForm();
      }
    } catch (e) {
      console.warn('afterRenderForm failed:', e);
    }

    // afterRenderForm 可能會更新 chips/DOM，最後再確保維持在頂部
    resetModalScroll();
  },
  
  /**
   * 詳情 → 📄 複製：複製成新維修單（開啟新增表單並帶入必要欄位）
   */
  async duplicateRepair(repairId) {
    try {
      const instance = window.repairUI;
      if (!instance || typeof instance.duplicateRepair !== 'function') return;
      await instance.duplicateRepair(repairId);
    } catch (e) {
      console.warn('RepairUI.duplicateRepair wrapper failed:', e);
      const msg = '複製失敗';
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
      else alert(msg);
    }
  },

  /**
   * 開啟詳情
   */
  
openDetail(repairId) {
    const instance = window.repairUI;
    instance.currentRepair = window._svc('RepairService').get(repairId);
    
    if (!instance.currentRepair) {
      {
        const msg = '找不到維修記錄';
        if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'warning' });
        else alert(msg);
      }
      return;
    }
    
    const modal = document.getElementById('repair-modal');
    const content = document.getElementById('repair-modal-content');
    
    if (modal && content) {
      content.innerHTML = instance.renderDetail();
      RepairUI._syncModalSize(content);
      instance.setModalOpen(true);

      // 避免沿用前一次捲動位置
      try { content.scrollTop = 0; } catch (_) {}
      try { modal.scrollTop = 0; } catch (_) {}

      // 延後載入：零件追蹤摘要
      setTimeout(() => {
        RepairUI.loadPartsMini(repairId);
      }, 0);

      // 延後載入：報價 / 訂單摘要 + 綁定按鈕（避免 DOM 尚未就緒）
      setTimeout(async () => {
        try {
          if (instance && typeof instance.bindQuoteOrderBlock === 'function') {
            instance.bindQuoteOrderBlock();
          }
          if (instance && typeof instance.refreshQuoteOrderSummary === 'function') {
            // Quote/Order 模組可能尚未 init/load：使用 Utils 做「只載一次」的防呆與效能優化
            if (window.Utils && typeof window.Utils.ensureServiceReady === 'function') {
              await window.Utils.ensureServiceReady('QuoteService', { loadAll: true });
              await window.Utils.ensureServiceReady('OrderService', { loadAll: true });
            } else {
              // fallback（保留舊行為，避免 utils 未載入時失效）
              try {
                if (window._svc('QuoteService') && typeof window._svc('QuoteService').init === 'function' && !window._svc('QuoteService').isInitialized) {
                  await window._svc('QuoteService').init();
                }
                if (window._svc('QuoteService') && typeof window._svc('QuoteService').loadAll === 'function') {
                  await window._svc('QuoteService').loadAll();
                }
              } catch (e) {
                console.warn('RepairUI: QuoteService init/load failed', e);
              }
              try {
                if (window._svc('OrderService') && typeof window._svc('OrderService').init === 'function' && !window._svc('OrderService').isInitialized) {
                  await window._svc('OrderService').init();
                }
                if (window._svc('OrderService') && typeof window._svc('OrderService').loadAll === 'function') {
                  await window._svc('OrderService').loadAll();
                }
              } catch (e) {
                console.warn('RepairUI: OrderService init/load failed', e);
              }
            }

            await instance.refreshQuoteOrderSummary();
          }
        } catch (e) {
          console.warn('RepairUI: quote/order mini load failed', e);
        }
      }, 0);

      // 延後載入：SOP（作業流程）
      setTimeout(async () => {
        try {
          if (window.RepairUI && typeof window.RepairUI.loadSopMini === 'function') {
            await window.RepairUI.loadSopMini(repairId);
          }
        } catch (e) {
          console.warn('RepairUI: sop mini load failed', e);
        }
      }, 0);

      // 延後載入：工作記錄（WorkLog）
      setTimeout(async () => {
        try {
          if (window.WorkLogUI && typeof window.WorkLogUI.loadWorkLogSection === 'function') {
            await window.WorkLogUI.loadWorkLogSection(repairId);
          }
        } catch (e) {
          console.warn('RepairUI: worklog section load failed', e);
        }
      }, 0);

      // 延後載入：活動時間軸（Timeline）
      setTimeout(() => {
        try {
          if (window.ActivityTimeline && typeof window.ActivityTimeline.renderInto === 'function') {
            window.ActivityTimeline.renderInto('repair-activity-timeline', repairId, { max: 30 });
          }
        } catch (e) {
          console.warn('RepairUI: timeline render failed', e);
        }
      }, 0);
    }
  },
  

  /**
   * 開啟歷史紀錄（對齊「查看歷史」的操作；會自動捲動到歷史區塊）
   */
  openHistory(repairId) {
    // 先沿用 openDetail 行為
    RepairUI.openDetail(repairId);

    // P3：切換到「變更記錄」標籤
    setTimeout(() => {
      try { RepairUI.switchDetailTab('history'); } catch (_) {}
    }, 0);
  },

  /**
   * 維修詳情：切換標籤（總覽 / 變更記錄）
   */
  switchDetailTab(tab) {
    const key = (tab || '').toString();

    const main = document.getElementById('repair-detail-tab-main');
    const hist = document.getElementById('repair-detail-tab-history');
    const btnMain = document.getElementById('repair-detail-tab-btn-main');
    const btnHist = document.getElementById('repair-detail-tab-btn-history');

    if (!main || !hist || !btnMain || !btnHist) return;

    const showHistory = (key === 'history');

    main.hidden = showHistory;
    hist.hidden = !showHistory;

    try { btnMain.classList.toggle('active', !showHistory); } catch (_) {}
    try { btnHist.classList.toggle('active', showHistory); } catch (_) {}
    try { btnMain.setAttribute('aria-selected', showHistory ? 'false' : 'true'); } catch (_) {}
    try { btnHist.setAttribute('aria-selected', showHistory ? 'true' : 'false'); } catch (_) {}

    // 切換後回到頂部，避免使用者誤以為卡住
    const content = document.getElementById('repair-modal-content');
    const modal = document.getElementById('repair-modal');
    try { if (content) content.scrollTop = 0; } catch (_) {}
    try { if (modal) modal.scrollTop = 0; } catch (_) {}
  },

  /**
   * 維修詳情：載入零件追蹤摘要
   */
  async loadPartsMini(repairId) {
    const host = document.getElementById('repair-parts-mini');
    if (!host) return;

    // 零件模組可能尚未初始化：在此做最低限度 init + load
    if (!window._svc('RepairPartsService')) {
      host.innerHTML = '<div class="muted">零件模組未載入</div>';
      return;
    }

    try {
      if (!window._svc('RepairPartsService').isInitialized) {
        await window._svc('RepairPartsService').init();
      }
      await window._svc('RepairPartsService').loadAll();

      const items = (window._svc('RepairPartsService').listForRepair(repairId) || [])
        .filter(i => !i.isDeleted);

      if (items.length === 0) {
        host.innerHTML = '<div class="muted">目前沒有零件追蹤項目</div>';
        return;
      }

      const statusBadge = (s) => {
        const status = (s || '').toString().trim();
        let cls = 'badge';
        try {
          if (window.AppConfig && typeof window.AppConfig.getStatusBadgeClass === 'function') {
            cls = window.AppConfig.getStatusBadgeClass('part', status) || 'badge';
          }
        } catch (_) {}
        return `<span class="badge ${cls}">${status || '—'}</span>`;
      };

      const list = items
        .slice()
        .sort((a, b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')))
        .reverse()
        .slice(0, 6)
        .map(i => {
          const name = (i.partName || '').toString();
          const mpn = (i.mpn || '').toString();
          const qty = Number(i.qty);
          const qtyText = Number.isFinite(qty) ? qty : '';
          return `
            <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid var(--color-border);border-radius:10px;background:var(--color-surface);margin:6px 0">
              <div style="min-width:0">
                <div style="font-weight:600;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name || '(未命名零件)'}</div>
                <div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${mpn ? `MPN: ${mpn}` : ''}${qtyText !== '' ? `　Qty: ${qtyText}` : ''}</div>
              </div>
              <div>${statusBadge(i.status)}</div>
            </div>
          `;
        }).join('');

      host.innerHTML = list + (items.length > 6 ? '<div class="muted" style="margin-top:6px">僅顯示最新 6 筆</div>' : '');
    } catch (e) {
      console.error(e);
      host.innerHTML = '<div class="muted">零件摘要載入失敗</div>';
    }
  },

  /**
   * 從維修詳情跳轉至「零件追蹤」模組（可選 quickAdd）
   */
  openRepairParts(repairId, options = {}) {
    try {
      if (window.partsUI?.setContextRepair) {
        window.partsUI.setContextRepair(repairId);
      }
      if (window.AppRouter?.navigate) {
        window.AppRouter.navigate('parts');
      }
      if (options && options.quickAdd) {
        setTimeout(() => {
          try { window.partsUI?.openAddTracker?.(); } catch (_) {}
        }, 350);
      }
    } catch (e) {
      console.error(e);
    }
  }
});

