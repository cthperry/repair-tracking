const fs = require('fs');
const path = require('path');

function read(p){ return fs.readFileSync(p,'utf8'); }
function write(p,s){ fs.writeFileSync(p,s,'utf8'); }

function ensureOnce(str, needle, insertFn){
  if (str.includes(needle)) return str;
  return insertFn(str);
}

function patchConfig(root){
  const p = path.join(root,'core','config.js');
  let s = read(p);
  s = s.replace(/VERSION_DATE:\s*'[^']*'/, "VERSION_DATE: '2026-02-02'");
  s = s.replace(/BUILD_NUMBER:\s*'\d+'/, "BUILD_NUMBER: '220'");
  write(p,s);
}

function patchCustomers(root){
  const p = path.join(root,'features','customers','customers.ui.js');
  let s = read(p);

  // constructor: add searchDraft and rAF scheduler
  s = s.replace(
    /this\.searchText = ''\s*;\s*\n\s*this\.searchDebounce = null\s*;\s*/,
    "this.searchText = '';\n    this.searchDraft = '';\n\n    // 方案2：合併刷新避免短時間多次 re-render\n    this._listUpdateRaf = null;\n"
  );

  // insert filtersDraft after filters assignment
  s = s.replace(
    /(this\.filters\s*=\s*this\._loadFiltersState\(\)\s*\|\|\s*\{[\s\S]*?\n\s*\};)/,
    `$1\n\n    // 方案2：篩選草稿（按【搜尋】才套用）\n    this.filtersDraft = { ...(this.filters || {}) };`
  );

  // add helper _updateFiltersToggleButtonDraft before existing _updateFiltersToggleButton
  s = ensureOnce(s, '_updateFiltersToggleButtonDraft()', (txt)=>{
    return txt.replace(
      /\n\s*_updateFiltersToggleButton\(\)\s*\{/,
      `\n  _updateFiltersToggleButtonDraft() {\n    const btn = document.getElementById('customers-toggle-filters-btn');\n    if (!btn) return;\n    const f = this.filtersDraft || {};\n    let n = 0;\n    if ((f.updatedFrom || '').toString().trim()) n += 1;\n    if ((f.updatedTo || '').toString().trim()) n += 1;\n    if ((f.minRepairCount || '').toString().trim()) n += 1;\n    if (f.hasPhone) n += 1;\n    if (f.hasEmail) n += 1;\n    const base = this.filtersPanelOpen ? '▾ 收合篩選' : '▸ 開啟篩選';\n    btn.textContent = ` + "\`🔍 ${base}${n ? ` (${n})` : ''}\`" + `;\n  }\n\n  _updateFiltersToggleButton() {`
    );
  });

  // add methods near toggleFiltersPanel (before _updateFiltersToggleButton section is OK)
  s = ensureOnce(s, 'scheduleUpdateList()', (txt)=>{
    return txt.replace(
      /\n\s*setFilter\(key,\s*value\)\s*\{/, 
      `\n  scheduleUpdateList() {\n    if (this._listUpdateRaf) return;\n    this._listUpdateRaf = requestAnimationFrame(() => {\n      this._listUpdateRaf = null;\n      this.updateList();\n    });\n  }\n\n  setFilterDraft(key, value) {\n    const k = (key || '').toString();\n    if (!k) return;\n    this.filtersDraft = { ...(this.filtersDraft || {}) };\n    this.filtersDraft[k] = value;\n    this._updateFiltersToggleButtonDraft();\n  }\n\n  applyFilters() {\n    this.searchText = (this.searchDraft || '').toString().trim();\n    this.filters = { ...(this.filtersDraft || {}) };\n    this._saveFiltersState();\n    this._updateFiltersToggleButton();\n    this.scheduleUpdateList();\n  }\n\n  clearAll() {\n    this.searchDraft = '';\n    this.searchText = '';\n    this.filtersDraft = {\n      updatedFrom: '',\n      updatedTo: '',\n      minRepairCount: '',\n      hasPhone: false,\n      hasEmail: false\n    };\n    this.filters = { ...(this.filtersDraft) };\n    this._saveFiltersState();\n    this._updateFiltersToggleButton();\n    this.scheduleUpdateList();\n  }\n\n  setFilter(key, value) {`
    );
  });

  // render HTML toolbar: input -> draft + buttons
  s = s.replace(
    /<input class="input" type="text" placeholder="搜尋公司\/聯絡人\/電話\/Email" oninput="CustomerUI\.onSearch\(event\)" \/>/,
    `<input id="customers-search" class="input" type="text" placeholder="搜尋公司/聯絡人/電話/Email" value="\${this._escapeAttr(this.searchDraft)}" oninput="CustomerUI.onSearchDraft(event)" onkeydown="CustomerUI.onSearchKeydown(event)" />`
  );
  s = s.replace(
    /<div class="customers-search">([\s\S]*?)<\/div>\s*\n\s*<button class="btn" id="customers-toggle-filters-btn"/,
    `<div class="customers-search">$1</div>\n            <button class="btn primary" onclick="CustomerUI.applyFilters()">搜尋</button>\n            <button class="btn" onclick="CustomerUI.clearAll()">清除</button>\n            <button class="btn" id="customers-toggle-filters-btn"`
  );
  // filters panel buttons
  s = s.replace(
    /<button class="btn" onclick="CustomerUI\.clearFilters\(\)">清除<\/button>/,
    `<button class="btn primary" onclick="CustomerUI.applyFilters()">搜尋</button>\n              <button class="btn" onclick="CustomerUI.clearAll()">清除</button>`
  );
  // filter inputs -> draft
  s = s.replace(/\(this\.filters\?\.updatedFrom/g, '(this.filtersDraft?.updatedFrom');
  s = s.replace(/\(this\.filters\?\.updatedTo/g, '(this.filtersDraft?.updatedTo');
  s = s.replace(/\(this\.filters\?\.minRepairCount/g, '(this.filtersDraft?.minRepairCount');
  s = s.replace(/this\.filters\?\.hasPhone/g, 'this.filtersDraft?.hasPhone');
  s = s.replace(/this\.filters\?\.hasEmail/g, 'this.filtersDraft?.hasEmail');
  s = s.replace(/CustomerUI\.onFilterChange/g, 'CustomerUI.onFilterDraftChange');
  s = s.replace(/CustomerUI\.onFilterToggle/g, 'CustomerUI.onFilterDraftToggle');

  // Object.assign: insert new static methods at top
  s = ensureOnce(s, 'onSearchDraft(event)', (txt)=>{
    return txt.replace(
      /Object\.assign\(CustomerUI,\s*\{\s*\n/, 
      `Object.assign(CustomerUI, {\n  // 方案2：一般條件先寫入 draft，按【搜尋】才套用\n  onSearchDraft(event) {\n    const value = (event?.target?.value || '').toString();\n    window.customerUI.searchDraft = value;\n  },\n\n  onSearchKeydown(event) {\n    if (!event) return;\n    if (event.key === 'Enter') {\n      try { event.preventDefault(); } catch (_) {}\n      CustomerUI.applyFilters();\n    }\n  },\n\n  applyFilters() {\n    window.customerUI?.applyFilters?.();\n  },\n\n  clearAll() {\n    const ui = window.customerUI;\n    if (!ui) return;\n    ui.clearAll();\n    try {\n      const inp = document.getElementById('customers-search');\n      if (inp) inp.value = '';\n    } catch (_) {}\n  },\n\n  onFilterDraftChange(event, key) {\n    const ui = window.customerUI;\n    if (!ui) return;\n    const v = (event?.target?.value || '').toString();\n    ui.setFilterDraft(key, v);\n  },\n\n  onFilterDraftToggle(event, key) {\n    const ui = window.customerUI;\n    if (!ui) return;\n    const v = !!(event?.target?.checked);\n    ui.setFilterDraft(key, v);\n  },\n\n`
    );
  });

  write(p,s);
}

function patchOrders(root){
  const p = path.join(root,'features','orders','orders.ui.js');
  let s = read(p);

  // constructor: add drafts
  s = ensureOnce(s, 'this.searchDraft', (txt)=>{
    return txt.replace(
      /this\.searchText = ''\s*;\s*\n\s*this\.filterStatus = ''\s*;/,
      "this.searchText = '';\n    this.searchDraft = '';\n    this.filterStatus = '';\n    this.filterStatusDraft = '';"
    );
  });
  s = ensureOnce(s, 'this.filterOverdueDraft', (txt)=>{
    return txt.replace(
      /this\.filterOverdue = false\s*;\s*\n\s*this\.filterOpenOnly = false\s*;/,
      "this.filterOverdue = false;\n    this.filterOverdueDraft = false;\n    this.filterOpenOnly = false;\n    this.filterOpenOnlyDraft = false;"
    );
  });
  s = ensureOnce(s, 'this.sortKeyDraft', (txt)=>{
    return txt.replace(/this\.sortKey = 'updatedAt_desc'\s*;/, "this.sortKey = 'updatedAt_desc';\n    this.sortKeyDraft = 'updatedAt_desc';");
  });

  // advanced filter drafts
  const advDraftInsert = `\n    this.filterOrderedFromDraft = '';\n    this.filterOrderedToDraft = '';\n    this.filterExpectedFromDraft = '';\n    this.filterExpectedToDraft = '';\n    this.filterAmountMinDraft = '';\n    this.filterAmountMaxDraft = '';\n    this.filterSupplierDraft = '';\n`;
  s = ensureOnce(s, 'filterOrderedFromDraft', (txt)=>{
    return txt.replace(/this\.filterSupplier = ''\s*;\s*\n\s*\}/, `this.filterSupplier = '';${advDraftInsert}  }`);
  });

  // instance methods applyAll/clearAll/scheduleUpdate
  s = ensureOnce(s, 'applyAll()', (txt)=>{
    return txt.replace(/async update\(\) \{/, 
`applyAll() {\n    // 套用 draft → applied\n    this.searchText = (this.searchDraft || '').toString().trim();\n    this.filterStatus = (this.filterStatusDraft || '').toString().trim();\n    this.filterOverdue = !!this.filterOverdueDraft;\n    this.filterOpenOnly = !!this.filterOpenOnlyDraft;\n    this.sortKey = (this.sortKeyDraft || 'updatedAt_desc').toString();\n\n    this.filterOrderedFrom = (this.filterOrderedFromDraft || '');\n    this.filterOrderedTo = (this.filterOrderedToDraft || '');\n    this.filterExpectedFrom = (this.filterExpectedFromDraft || '');\n    this.filterExpectedTo = (this.filterExpectedToDraft || '');\n    this.filterAmountMin = (this.filterAmountMinDraft || '');\n    this.filterAmountMax = (this.filterAmountMaxDraft || '');\n    this.filterSupplier = (this.filterSupplierDraft || '');\n\n    this.update();\n  }\n\n  clearAll() {\n    this.searchDraft = '';\n    this.searchText = '';\n\n    this.filterStatusDraft = '';\n    this.filterStatus = '';\n    this.filterOverdueDraft = false;\n    this.filterOverdue = false;\n    this.filterOpenOnlyDraft = false;\n    this.filterOpenOnly = false;\n\n    this.sortKeyDraft = 'updatedAt_desc';\n    this.sortKey = 'updatedAt_desc';\n\n    this.filterOrderedFromDraft = '';\n    this.filterOrderedToDraft = '';\n    this.filterExpectedFromDraft = '';\n    this.filterExpectedToDraft = '';\n    this.filterAmountMinDraft = '';\n    this.filterAmountMaxDraft = '';\n    this.filterSupplierDraft = '';\n\n    this.filterOrderedFrom = '';\n    this.filterOrderedTo = '';\n    this.filterExpectedFrom = '';\n    this.filterExpectedTo = '';\n    this.filterAmountMin = '';\n    this.filterAmountMax = '';\n    this.filterSupplier = '';\n\n    this.update();\n  }\n\n  scheduleUpdate() {\n    if (this._updateScheduled) return;\n    this._updateScheduled = true;\n    requestAnimationFrame(() => {\n      this._updateScheduled = false;\n      this.update();\n    });\n  }\n\n  async update() {`);
  });

  // render toolbar: add buttons and draft input
  s = s.replace(
    /<input class="input" type="text" placeholder="搜尋：訂單號 \/ 客戶 \/ 供應商 \/ 狀態" value="\$\{this\._escapeAttr\(this\.searchText\)\}" oninput="OrdersUI\.onSearch\(event\)" \/>/,
    `<input id="orders-search" class="input" type="text" placeholder="搜尋：訂單號 / 客戶 / 供應商 / 狀態" value="\${this._escapeAttr(this.searchDraft)}" oninput="OrdersUI.onSearchDraft(event)" onkeydown="OrdersUI.onSearchKeydown(event)" />`
  );
  s = s.replace(
    /<div class="orders-search">([\s\S]*?)<\/div>\s*\n\s*<button class="btn primary" onclick="OrdersUI\.openCreateFromQuote\(\)">/,
    `<div class="orders-search">$1</div>\n            <button class="btn primary" onclick="OrdersUI.applyAll()">搜尋</button>\n            <button class="btn" onclick="OrdersUI.clearAll()">清除</button>\n            <button class="btn primary" onclick="OrdersUI.openCreateFromQuote()">`
  );

  // _renderFilters: use draft values, and advanced changes should not auto update
  s = s.replace(/const orderedFrom = this\._escapeAttr\(this\.filterOrderedFrom \|\| ''\);/,
               "const orderedFrom = this._escapeAttr(this.filterOrderedFromDraft || this.filterOrderedFrom || '');");
  s = s.replace(/const orderedTo = this\._escapeAttr\(this\.filterOrderedTo \|\| ''\);/,
               "const orderedTo = this._escapeAttr(this.filterOrderedToDraft || this.filterOrderedTo || '');");
  s = s.replace(/const expectedFrom = this\._escapeAttr\(this\.filterExpectedFrom \|\| ''\);/,
               "const expectedFrom = this._escapeAttr(this.filterExpectedFromDraft || this.filterExpectedFrom || '');");
  s = s.replace(/const expectedTo = this\._escapeAttr\(this\.filterExpectedTo \|\| ''\);/,
               "const expectedTo = this._escapeAttr(this.filterExpectedToDraft || this.filterExpectedTo || '');");
  s = s.replace(/const minAmt = this\._escapeAttr\(this\.filterAmountMin \|\| ''\);/,
               "const minAmt = this._escapeAttr(this.filterAmountMinDraft || this.filterAmountMin || '');");
  s = s.replace(/const maxAmt = this\._escapeAttr\(this\.filterAmountMax \|\| ''\);/,
               "const maxAmt = this._escapeAttr(this.filterAmountMaxDraft || this.filterAmountMax || '');");
  s = s.replace(/const supplier = this\._escapeAttr\(this\.filterSupplier \|\| ''\);/,
               "const supplier = this._escapeAttr(this.filterSupplierDraft || this.filterSupplier || '');");

  // status select and sort select use drafts
  s = s.replace(/id="orders-filter-status" onchange="OrdersUI\.setStatusFilter\(event\)"/,
               'id="orders-filter-status" onchange="OrdersUI.setStatusDraft(event)"');
  s = s.replace(/this\.filterStatus === v/g, '(this.filterStatusDraft || this.filterStatus) === v');
  s = s.replace(/id="orders-filter-sort" onchange="OrdersUI\.setSort\(event\)"/,
               'id="orders-filter-sort" onchange="OrdersUI.setSortDraft(event)"');
  s = s.replace(/this\.sortKey === 'updatedAt_desc'/g, "(this.sortKeyDraft || this.sortKey) === 'updatedAt_desc'");
  s = s.replace(/this\.sortKey === 'orderedAt_desc'/g, "(this.sortKeyDraft || this.sortKey) === 'orderedAt_desc'");
  s = s.replace(/this\.sortKey === 'expectedAt_asc'/g, "(this.sortKeyDraft || this.sortKey) === 'expectedAt_asc'");
  s = s.replace(/this\.sortKey === 'totalAmount_desc'/g, "(this.sortKeyDraft || this.sortKey) === 'totalAmount_desc'");

  // advanced inputs: from applyAdvancedFilters() to onAdvancedDraftChange()
  s = s.replace(/OrdersUI\.applyAdvancedFilters\(\)/g, 'OrdersUI.onAdvancedDraftChange()');

  // add apply/clear buttons in filters actions
  s = s.replace(
    /<div class="orders-filters-actions" aria-label="篩選操作">\s*\n\s*<button class="btn sm" onclick="OrdersUI\.toggleAdvancedFilters\(\)">/, 
    `<div class="orders-filters-actions" aria-label="篩選操作">\n            <button class="btn sm primary" onclick="OrdersUI.applyAll()">搜尋</button>\n            <button class="btn sm ghost" onclick="OrdersUI.clearAll()" title="清除所有條件">清除</button>\n            <button class="btn sm" onclick="OrdersUI.toggleAdvancedFilters()">`
  );
  // remove old clearAdvancedFilters button if present
  s = s.replace(/<button class="btn sm ghost" onclick="OrdersUI\.clearAdvancedFilters\(\)"[\s\S]*?<\/button>/,
               '');

  // Object.assign: add new static methods and adjust handlers
  s = ensureOnce(s, 'onSearchDraft(event)', (txt)=>{
    return txt.replace(/Object\.assign\(OrdersUI,\s*\{\s*\n/, 
`Object.assign(OrdersUI, {\n  onSearchDraft(event) {\n    const v = (event?.target?.value || '').toString();\n    window.ordersUI.searchDraft = v;\n  },\n\n  onSearchKeydown(event) {\n    if (!event) return;\n    if (event.key === 'Enter') {\n      try { event.preventDefault(); } catch (_) {}\n      OrdersUI.applyAll();\n    }\n  },\n\n  applyAll() {\n    window.ordersUI?.applyAll?.();\n  },\n\n  clearAll() {\n    const ui = window.ordersUI;\n    if (!ui) return;\n    ui.clearAll();\n    try {\n      const inp = document.getElementById('orders-search');\n      if (inp) inp.value = '';\n    } catch (_) {}\n  },\n\n  setStatusDraft(event) {\n    const ui = window.ordersUI;\n    if (!ui) return;\n    ui.filterStatusDraft = (event?.target?.value || '').toString().trim();\n    ui.filterOverdueDraft = false;\n    ui.filterOpenOnlyDraft = false;\n  },\n\n  setSortDraft(event) {\n    const ui = window.ordersUI;\n    if (!ui) return;\n    ui.sortKeyDraft = (event?.target?.value || 'updatedAt_desc').toString();\n  },\n\n  onAdvancedDraftChange() {\n    const ui = window.ordersUI;\n    if (!ui) return;\n    const orderedFromEl = document.getElementById('orders-filter-ordered-from');\n    const orderedToEl = document.getElementById('orders-filter-ordered-to');\n    const expectedFromEl = document.getElementById('orders-filter-expected-from');\n    const expectedToEl = document.getElementById('orders-filter-expected-to');\n    const minEl = document.getElementById('orders-filter-amount-min');\n    const maxEl = document.getElementById('orders-filter-amount-max');\n    const supplierEl = document.getElementById('orders-filter-supplier');\n\n    ui.filterOrderedFromDraft = (orderedFromEl ? orderedFromEl.value : ui.filterOrderedFromDraft) || '';\n    ui.filterOrderedToDraft = (orderedToEl ? orderedToEl.value : ui.filterOrderedToDraft) || '';\n    ui.filterExpectedFromDraft = (expectedFromEl ? expectedFromEl.value : ui.filterExpectedFromDraft) || '';\n    ui.filterExpectedToDraft = (expectedToEl ? expectedToEl.value : ui.filterExpectedToDraft) || '';\n    ui.filterAmountMinDraft = (minEl ? minEl.value : ui.filterAmountMinDraft) || '';\n    ui.filterAmountMaxDraft = (maxEl ? maxEl.value : ui.filterAmountMaxDraft) || '';\n    ui.filterSupplierDraft = (supplierEl ? supplierEl.value : ui.filterSupplierDraft) || '';\n  },\n\n`);
  });

  // adjust existing onSearch to no-op draft to avoid accidental immediate updates if referenced
  s = s.replace(/onSearch\(event\) \{[\s\S]*?\},\n\n  setStatusFilter/,
               "onSearch(event) {\n    // 已改為方案2：保留相容舊呼叫但不再即時套用\n    const v = (event?.target?.value || '').toString();\n    window.ordersUI.searchDraft = v;\n  },\n\n  setStatusFilter");

  // chips: sync drafts + apply immediate
  s = s.replace(/window\.ordersUI\.filterOverdue = true;/g, 'window.ordersUI.filterOverdue = true; window.ordersUI.filterOverdueDraft = true;');
  s = s.replace(/window\.ordersUI\.filterOpenOnly = true;/g, 'window.ordersUI.filterOpenOnly = true; window.ordersUI.filterOpenOnlyDraft = true;');
  s = s.replace(/window\.ordersUI\.filterStatus = '';/g, "window.ordersUI.filterStatus = ''; window.ordersUI.filterStatusDraft = ''; ");
  s = s.replace(/window\.ordersUI\.filterStatus = k;/g, "window.ordersUI.filterStatus = k; window.ordersUI.filterStatusDraft = k;");

  write(p,s);
}

function patchParts(root){
  const p = path.join(root,'features','parts','parts.ui.js');
  let s = read(p);

  // constructor add drafts
  s = ensureOnce(s, 'this.searchDraft', (txt)=>{
    return txt.replace(/this\.searchText = ''\s*;/, "this.searchText = '';\n    this.searchDraft = '';" );
  });

  s = ensureOnce(s, 'this.filterStatusDraft', (txt)=>{
    return txt.replace(/this\.filterStatus = ''\s*;/, "this.filterStatus = '';\n    this.filterStatusDraft = '';" );
  });
  s = ensureOnce(s, 'this.filterOverdueDraft', (txt)=>{
    return txt.replace(/this\.filterOverdue = false\s*;/, "this.filterOverdue = false;\n    this.filterOverdueDraft = false;" );
  });
  s = ensureOnce(s, 'this.filterOpenOnlyDraft', (txt)=>{
    return txt.replace(/this\.filterOpenOnly = false\s*;/, "this.filterOpenOnly = false;\n    this.filterOpenOnlyDraft = false;" );
  });
  s = ensureOnce(s, 'this.catalogQuickDraft', (txt)=>{
    return txt.replace(/this\.catalogQuick = ''\s*;/, "this.catalogQuick = '';\n    this.catalogQuickDraft = '';" );
  });
  s = ensureOnce(s, 'this.sortKeyDraft', (txt)=>{
    return txt.replace(/this\.sortKey = 'updatedAt_desc'\s*;/, "this.sortKey = 'updatedAt_desc';\n    this.sortKeyDraft = 'updatedAt_desc';" );
  });
  s = ensureOnce(s, 'this.contextRepairIdDraft', (txt)=>{
    return txt.replace(/this\.contextRepairId = ''\s*;/, "this.contextRepairId = '';\n    this.contextRepairIdDraft = '';" );
  });

  // instance methods applyAll/clearAll
  s = ensureOnce(s, 'applyAll()', (txt)=>{
    return txt.replace(/async update\(\) \{/, 
`applyAll() {\n    this.searchText = (this.searchDraft || '').toString().trim();\n    this.sortKey = (this.sortKeyDraft || this.sortKey || 'updatedAt_desc').toString().trim() || 'updatedAt_desc';\n    this.contextRepairId = (this.contextRepairIdDraft || '').toString().trim();\n\n    if (this.view === 'catalog') {\n      this.catalogQuick = (this.catalogQuickDraft || '').toString().trim();\n    } else {\n      this.filterStatus = (this.filterStatusDraft || '').toString().trim();\n      this.filterOverdue = !!this.filterOverdueDraft;\n      this.filterOpenOnly = !!this.filterOpenOnlyDraft;\n    }\n    this.update();\n  }\n\n  clearAll() {\n    this.searchDraft = '';\n    this.searchText = '';\n    this.sortKeyDraft = 'updatedAt_desc';\n    this.sortKey = 'updatedAt_desc';\n\n    this.contextRepairIdDraft = '';\n    this.contextRepairId = '';\n\n    this.catalogQuickDraft = '';\n    this.catalogQuick = '';\n    this.filterStatusDraft = '';\n    this.filterStatus = '';\n    this.filterOverdueDraft = false;\n    this.filterOverdue = false;\n    this.filterOpenOnlyDraft = false;\n    this.filterOpenOnly = false;\n\n    try { this._updateFiltersToggleButton?.(); } catch (_) {}\n    this.update();\n  }\n\n  async update() {`);
  });

  // render toolbar: draft input + buttons
  s = s.replace(/value="\$\{this\._escapeAttr\(this\.searchText\)\}" oninput="PartsUI\.onSearch\(event\)"/,
               "value=\"\${this._escapeAttr(this.searchDraft)}\" oninput=\"PartsUI.onSearchDraft(event)\" onkeydown=\"PartsUI.onSearchKeydown(event)\"");
  // Insert buttons after search div
  s = s.replace(
    /<div class="parts-search">([\s\S]*?)<\/div>\s*\n\s*<button class="btn" id="parts-toggle-filters-btn"/,
    `<div class="parts-search">$1</div>\n\n            <button class="btn primary" onclick="PartsUI.applyAll()">搜尋</button>\n            <button class="btn" onclick="PartsUI.clearAll()">清除</button>\n\n            <button class="btn" id="parts-toggle-filters-btn"`
  );

  // filters panel right buttons
  s = s.replace(/<button class="btn" onclick="PartsUI\.clearFilters\(\)">清除<\/button>/,
               `<button class="btn primary" onclick="PartsUI.applyAll()">搜尋</button>\n              <button class="btn" onclick="PartsUI.clearAll()">清除</button>`);

  // Object.assign: add new static methods at top
  s = ensureOnce(s, 'onSearchDraft(event)', (txt)=>{
    return txt.replace(/Object\.assign\(PartsUI,\s*\{\s*\n/, 
`Object.assign(PartsUI, {\n  onSearchDraft(event) {\n    const v = (event?.target?.value || '').toString();\n    window.partsUI.searchDraft = v;\n  },\n\n  onSearchKeydown(event) {\n    if (!event) return;\n    if (event.key === 'Enter') {\n      try { event.preventDefault(); } catch (_) {}\n      PartsUI.applyAll();\n    }\n  },\n\n  applyAll() {\n    window.partsUI?.applyAll?.();\n  },\n\n  clearAll() {\n    const ui = window.partsUI;\n    if (!ui) return;\n    ui.clearAll();\n    try {\n      const inp = document.querySelector('.parts-search input');\n      if (inp) inp.value = '';\n    } catch (_) {}\n  },\n\n`);
  });

  // adjust existing onSearch to draft only
  s = s.replace(/onSearch\(event\) \{[\s\S]*?\},\n\n  setStatusFilter/,
               "onSearch(event) {\n    // 已改為方案2：保留相容舊呼叫但不再即時套用\n    const v = (event?.target?.value || '').toString();\n    window.partsUI.searchDraft = v;\n  },\n\n  setStatusFilter");

  // status/filter/sort/repair filter set to draft only (non-chips)
  s = s.replace(/setStatusFilter\(event\) \{[\s\S]*?ui\.update\(\);\n  \},/,
               "setStatusFilter(event) {\n    if (!window.partsUI) return;\n    const ui = window.partsUI;\n    ui.filterStatusDraft = (event?.target?.value || '').toString().trim();\n    ui.filterOverdueDraft = false;\n    ui.filterOpenOnlyDraft = false;\n  },");
  s = s.replace(/setCatalogStatusFilter\(event\) \{[\s\S]*?ui\.update\(\);\n  \},/,
               "setCatalogStatusFilter(event) {\n    if (!window.partsUI) return;\n    const ui = window.partsUI;\n    ui.catalogQuickDraft = (event?.target?.value || '').toString().trim();\n  },");
  s = s.replace(/setSort\(event\) \{[\s\S]*?window\.partsUI\.update\(\);\n  \},/,
               "setSort(event) {\n    if (!window.partsUI) return;\n    window.partsUI.sortKeyDraft = (event?.target?.value || '').toString().trim() || 'updatedAt_desc';\n  },");
  s = s.replace(/setRepairFilter\(event\) \{[\s\S]*?window\.partsUI\.update\(\);\n  \},/,
               "setRepairFilter(event) {\n    if (!window.partsUI) return;\n    window.partsUI.contextRepairIdDraft = (event?.target?.value || '').toString().trim();\n  },");
  s = s.replace(/clearRepairFilter\(\) \{[\s\S]*?window\.partsUI\.update\(\);\n  \},/,
               "clearRepairFilter() {\n    if (!window.partsUI) return;\n    window.partsUI.contextRepairIdDraft = '';\n  },");

  // clearFilters button now mapped to clearAll (immediate apply)
  s = s.replace(/clearFilters\(\) \{[\s\S]*?ui\.update\(\);\n  \},/,
               "clearFilters() {\n    // 已改為方案2：清除立即套用\n    PartsUI.clearAll();\n  },");

  // chips immediate apply + sync drafts
  s = s.replace(/ui\.catalogQuick = k;\n      ui\.update\(\);/,
               "ui.catalogQuick = k;\n      ui.catalogQuickDraft = k;\n      ui.update();");
  s = s.replace(/ui\.filterStatus = '';/g, "ui.filterStatus = ''; ui.filterStatusDraft = ''; ");
  s = s.replace(/ui\.filterOverdue = true;/g, "ui.filterOverdue = true; ui.filterOverdueDraft = true;");
  s = s.replace(/ui\.filterOpenOnly = true;/g, "ui.filterOpenOnly = true; ui.filterOpenOnlyDraft = true;");
  s = s.replace(/ui\.filterStatus = k;/g, "ui.filterStatus = k; ui.filterStatusDraft = k;");

  write(p,s);
}

function main(){
  const root = process.argv[2];
  if (!root) throw new Error('root required');
  patchConfig(root);
  patchCustomers(root);
  patchOrders(root);
  patchParts(root);
  console.log('phase1 patched');
}

main();
