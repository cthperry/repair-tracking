/**
 * 客戶管理 - 服務層
 * V160 - Customers Module - Service Layer
 */

class CustomerService {
  constructor() {
    this.customers = [];
    this.isInitialized = false;
    this.listeners = [];

    // Firebase
    this.db = null;
    this.customersRef = null;
    this._listenersReady = false;
  }

  // ================================
  // Helpers
  // ================================
  _norm(v) {
    return (v || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
  }

  async init() {
    if (this.isInitialized) {
      console.debug('CustomerService already initialized');
      return;
    }

    try {
      console.log('👥 Initializing Customer Service...');

      if (window.AuthSystem.authMode === 'firebase' && typeof firebase !== 'undefined') {
        this.db = firebase.database();
        const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || window.AuthSystem?.getCurrentUser?.()?.uid || '').toString();
        const root = this.db.ref('data').child(uid);
        this._userRootRef = root;
        this.customersRef = root.child('customers');
        this.setupRealtimeListeners();
      }

      await this.loadData();
      this.isInitialized = true;
      console.log('✅ Customer Service initialized');
      console.log(`  👥 Loaded ${this.customers.length} customers`);

    } catch (error) {
      console.error('Customer Service initialization error:', error);
      window.ErrorHandler.log('MEDIUM', 'CustomerService', 'Initialization failed', { error });
      await this.loadFromLocalStorage();
      this.isInitialized = true;
    }
  }

  setupRealtimeListeners() {
    if (!this.customersRef) return;
    if (this._listenersReady) return;

    
this.customersRef.on('child_added', (snapshot) => {
  const item = snapshot.val();
  if (!item || item.isDeleted) return;
  const idx = this.customers.findIndex(c => c.id === item.id);
  if (idx === -1) {
    this.customers.push(item);
    this.notifyListeners('added', item);
  } else {
    this.customers[idx] = item;
    this.notifyListeners('updated', item);
  }
});

    
this.customersRef.on('child_changed', (snapshot) => {
  const item = snapshot.val();
  if (!item) return;
  const idx = this.customers.findIndex(c => c.id === item.id);

  if (item.isDeleted) {
    if (idx !== -1) {
      this.customers.splice(idx, 1);
      this.notifyListeners('deleted', item);
    }
    return;
  }

  if (idx !== -1) {
    this.customers[idx] = item;
  } else {
    this.customers.push(item);
  }
  this.notifyListeners('updated', item);

});

    this.customersRef.on('child_removed', (snapshot) => {
      const item = snapshot.val();
      const idx = this.customers.findIndex(c => c.id === item.id);
      if (idx !== -1) {
        this.customers.splice(idx, 1);
        this.notifyListeners('removed', item);
      }
    });

    this._listenersReady = true;
    console.log('  ✓ Customer realtime listeners setup');
  }

  async loadData() {
    if (this.customersRef) {
      try {
        await this.loadFromFirebase();
        this.saveToLocalStorage();
        return;
      } catch (error) {
        console.warn('Failed to load customers from Firebase, fallback to local:', error);
      }
    }

    await this.loadFromLocalStorage();
  }

  async loadFromFirebase() {
    const snapshot = await this.customersRef.once('value');
    const data = snapshot.val();
    if (data) {
      this.customers = Object.values(data).filter(c => !c.isDeleted);
      console.log(`  ✓ Loaded ${this.customers.length} customers from Firebase`);
    } else {
      this.customers = [];
    }
  }

  async loadFromLocalStorage() {
    try {
      const prefix = AppConfig.system.storage.prefix;
      const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || 'unknown'));
      const key = prefix + 'customers_' + scope;
      const data = localStorage.getItem(key);
      this.customers = data ? JSON.parse(data) : [];
      this.customers = (this.customers || []).filter(c => !c.isDeleted);
      console.log(`  ✓ Loaded ${this.customers.length} customers from localStorage`);
    } catch (error) {
      console.error('Failed to load customers from localStorage:', error);
      this.customers = [];
    }
  }

  saveToLocalStorage() {
    try {
      const prefix = AppConfig.system.storage.prefix;
      const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || 'unknown'));
      const key = prefix + 'customers_' + scope;
      localStorage.setItem(key, JSON.stringify(this.customers));
    } catch (error) {
      console.error('Failed to save customers to localStorage:', error);
    }
  }

  onChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyListeners(action, item) {
    for (const cb of this.listeners) {
      try { cb(action, item); } catch (e) { /* ignore */ }
    }
  }

  /**
   * 統計資訊
   * - totalCompanies: 公司數（以 name 去重）
   * - totalContacts: 聯絡人筆數（customers 節點每筆視為 1 位聯絡人）
   * @returns {{totalCompanies:number,totalContacts:number,hasPhone:number,hasEmail:number,totalRepairCount:number}}
   */
  getStats() {
    const list = (this.customers || []).filter(c => !c?.isDeleted);
    const companies = new Set();
    let hasPhone = 0;
    let hasEmail = 0;
    let totalRepairCount = 0;

    for (const c of list) {
      companies.add(this._norm(c.name));
      if ((c.phone || '').toString().trim()) hasPhone += 1;
      if ((c.email || '').toString().trim()) hasEmail += 1;
      const rc = Number(c.repairCount);
      if (!Number.isNaN(rc)) totalRepairCount += rc;
    }

    return {
      totalCompanies: Array.from(companies).filter(Boolean).length,
      totalContacts: list.length,
      hasPhone,
      hasEmail,
      totalRepairCount
    };
  }

  getAll() {
    return [...this.customers].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  get(id) {
    return this.customers.find(c => c.id === id) || null;
  }

  findByName(name) {
    const target = (name || '').trim().toLowerCase();
    if (!target) return null;
    return this.customers.find(c => (c.name || '').trim().toLowerCase() === target) || null;
  }

  /**
   * 取得公司清單（去重後的 customer.name）
   */
  getCompanies() {
    const map = new Map();
    for (const c of (this.customers || [])) {
      if (c?.isDeleted) continue;
      const key = this._norm(c.name);
      if (!key) continue;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { name: (c.name || '').trim(), updatedAt: c.updatedAt || c.createdAt || '' });
      } else {
        const ts = (c.updatedAt || c.createdAt || '');
        if (ts && ts > (existing.updatedAt || '')) {
          existing.updatedAt = ts;
          existing.name = (c.name || existing.name || '').trim();
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .map(x => x.name);
  }

  /**
   * 取得某公司底下的聯絡人（customers 記錄）
   */
  getContactsByCompanyName(companyName) {
    const key = this._norm(companyName);
    if (!key) return [];
    return this.getAll().filter(c => !c.isDeleted && this._norm(c.name) === key);
  }

  /**
   * 找到某公司底下特定聯絡人
   */
  findContact(companyName, contactName) {
    const ck = this._norm(companyName);
    const nk = this._norm(contactName);
    if (!ck) return null;
    return this.customers.find(c => !c?.isDeleted && this._norm(c.name) === ck && this._norm(c.contact) === nk) || null;
  }

  search(keyword = '') {
    const q = (keyword || '').trim().toLowerCase();
    if (!q) return this.getAll();

    return this.getAll().filter(c => {
      const s = `${c.name || ''} ${c.contact || ''} ${c.phone || ''} ${c.email || ''} ${c.address || ''}`.toLowerCase();
      return s.includes(q);
    });
  }

  /**
   * 搜尋並以公司分組回傳（供 UI 使用）
   * @returns {Array<{companyName:string, contacts:any[], totalRepairCount:number, latestUpdatedAt:string}>}
   */
  searchGroups(keyword = '') {
    const q = (keyword || '').trim().toLowerCase();
    const base = q ? this.search(q) : this.getAll();
    const groups = new Map();

    for (const c of (base || [])) {
      if (c?.isDeleted) continue;
      const key = this._norm(c.name);
      if (!key) continue;
      if (!groups.has(key)) {
        groups.set(key, {
          companyName: (c.name || '').trim() || '(未命名公司)',
          contacts: [],
          totalRepairCount: 0,
          latestUpdatedAt: ''
        });
      }
      const g = groups.get(key);
      g.contacts.push(c);
      const rc = Number(c.repairCount);
      if (!Number.isNaN(rc)) g.totalRepairCount += rc;
      const ts = (c.updatedAt || c.createdAt || '');
      if (ts && ts > (g.latestUpdatedAt || '')) g.latestUpdatedAt = ts;
    }

    // 每家公司底下聯絡人排序：最新在前
    for (const g of groups.values()) {
      g.contacts.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    }

    return Array.from(groups.values()).sort((a, b) => (b.latestUpdatedAt || '').localeCompare(a.latestUpdatedAt || ''));
  }

  async create(data) {
    const customer = CustomerModel.create(data);
    const validation = CustomerModel.validate(customer);
    if (!validation.isValid) {
      throw new Error(validation.errors.map(e => e.message).join(', '));
    }

    if (this.customersRef) {
      await this.customersRef.child(customer.id).set(customer);
    }

    if (!this.customers.find(c => c.id === customer.id)) {
      this.customers.unshift(customer);
    }
    this.saveToLocalStorage();
    this.notifyListeners('created', customer);
    return customer;
  }

  async update(id, updates) {
    const existing = this.get(id);
    if (!existing) throw new Error('客戶不存在');

    const beforeName = (existing.name || '').toString();

    const updated = CustomerModel.update(existing, updates);
    const validation = CustomerModel.validate(updated);
    if (!validation.isValid) {
      throw new Error(validation.errors.map(e => e.message).join(', '));
    }

    if (this.customersRef) {
      await this.customersRef.child(id).update(updated);
    }

    const idx = this.customers.findIndex(c => c.id === id);
    if (idx !== -1) this.customers[idx] = updated;

    // 若公司名稱變更：同步更名到「維修單 / 報價 / 訂單」以及同公司其他聯絡人
    try {
      const afterName = (updated.name || '').toString();
      if (this._normCompanyName(beforeName) && this._normCompanyName(afterName)
        && this._normCompanyName(beforeName) !== this._normCompanyName(afterName)) {
        await this.renameCompanyEverywhere(beforeName, afterName);
      }
    } catch (e) {
      console.warn('CustomerService rename propagation failed:', e);
    }

    this.saveToLocalStorage();
    this.notifyListeners('updated', updated);
    return updated;
  }

  _normCompanyName(name) {
    return (name === null || name === undefined)
      ? ''
      : String(name).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * 公司更名同步（可用於：
   * - 已更名但維修/報價/訂單仍是舊名稱 → 直接輸入「舊名稱」與「新名稱」即可批次更新
   * - 編輯公司名稱時的自動同步
   *
   * 規則：以公司名稱「完全一致（忽略前後空白、連續空白、大小寫）」做比對。
   */
  async renameCompanyEverywhere(fromName, toName) {
    const oldKey = this._normCompanyName(fromName);
    const newName = (toName === null || toName === undefined) ? '' : String(toName).trim();
    const newKey = this._normCompanyName(newName);
    if (!oldKey || !newKey || oldKey === newKey) {
      return { customers: 0, repairs: 0, quotes: 0, orders: 0 };
    }

    const nowIso = new Date().toISOString();
    let customersCount = 0;

    // 1) 客戶管理：同公司所有聯絡人一併更名（公司層級）
    try {
      const targets = (this.customers || []).filter(c => c && !c.isDeleted && this._normCompanyName(c.name) === oldKey);
      for (const c of targets) {
        if ((c.name || '').toString().trim() === newName) continue;
        const nextVer = (Number(c.version) || 1) + 1;
        const patch = { name: newName, updatedAt: nowIso, version: nextVer };
        try {
          if (this.customersRef) await this.customersRef.child(c.id).update(patch);
        } catch (e) {
          console.warn('CustomerService renameCompanyEverywhere: customer update failed:', e);
        }

        const idx = this.customers.findIndex(x => x.id === c.id);
        if (idx !== -1) this.customers[idx] = { ...c, ...patch };
        customersCount += 1;
      }
      this.saveToLocalStorage();
    } catch (e) {
      console.warn('CustomerService renameCompanyEverywhere: customers sync failed:', e);
    }

    // 2) 其他模組：維修單 / 報價 / 訂單
    const result = { customers: customersCount, repairs: 0, quotes: 0, orders: 0 };

    try {
      // 確保服務已初始化（避免使用者尚未進入該模組時，快取尚未載入導致同步數量為 0）
      if (window.RepairService && typeof window.RepairService.init === 'function') {
        try { await window.RepairService.init(); } catch (_) {}
      }
      if (window.RepairService && typeof window.RepairService.renameCompany === 'function') {
        const r = await window.RepairService.renameCompany(fromName, newName);
        result.repairs = Number(r?.updated || r?.count || 0) || 0;
      }
    } catch (e) {
      console.warn('CustomerService renameCompanyEverywhere: repairs sync failed:', e);
    }

    try {
      if (window.QuoteService && typeof window.QuoteService.init === 'function') {
        try { await window.QuoteService.init(); } catch (_) {}
      }
      if (window.QuoteService && typeof window.QuoteService.renameCustomer === 'function') {
        const q = await window.QuoteService.renameCustomer(fromName, newName);
        result.quotes = Number(q?.updated || q?.count || 0) || 0;
      }
    } catch (e) {
      console.warn('CustomerService renameCompanyEverywhere: quotes sync failed:', e);
    }

    try {
      if (window.OrderService && typeof window.OrderService.init === 'function') {
        try { await window.OrderService.init(); } catch (_) {}
      }
      if (window.OrderService && typeof window.OrderService.renameCustomer === 'function') {
        const o = await window.OrderService.renameCustomer(fromName, newName);
        result.orders = Number(o?.updated || o?.count || 0) || 0;
      }
    } catch (e) {
      console.warn('CustomerService renameCompanyEverywhere: orders sync failed:', e);
    }

    try {
      window.dispatchEvent(new CustomEvent('data:changed', {
        detail: { module: 'customers', action: 'renameCompany', fromName, toName: newName, result }
      }));
    } catch (_) {}

    return result;
  }

  async delete(id) {
    const existing = this.get(id);
    if (!existing) throw new Error('客戶不存在');

    const deleted = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: (window.AppState?.getUid?.() || window.currentUser?.uid || '')
    };

    if (this.customersRef) {
      await this.customersRef.child(id).update(deleted);
    }

    const idx = this.customers.findIndex(c => c.id === id);
    if (idx !== -1) this.customers.splice(idx, 1);

    this.saveToLocalStorage();
    this.notifyListeners('deleted', deleted);
    return true;
  }

  /**
   * 從維修單同步客戶資料
   * - mode=create: repairCount + 1
   * - mode=update: 只補齊缺漏欄位，不累加
   */
  async touchFromRepair(repair, options = {}) {
    if (!repair) return null;
    const companyName = (repair.customer || '').trim();
    if (!companyName) return null;
    const contactName = (repair.contact || '').trim();

    // 以「公司 + 聯絡人」為唯一鍵（同公司可有多位聯絡人）
    let existing = this.findContact(companyName, contactName);

    // 若聯絡人空白，則退回只用公司找一筆（避免無限新增空白聯絡人）
    if (!existing && !contactName) {
      existing = this.findByName(companyName);
    }

    // 建立
    if (!existing) {
      const created = await this.create({
        name: companyName,
        contact: contactName,
        phone: repair.phone || '',
        email: repair.email || '',
        repairCount: (options.mode === 'create') ? 1 : 0
      });
      return created;
    }

    // 補齊
    const updates = {};
    if (!existing.phone && repair.phone) updates.phone = repair.phone;
    if (!existing.email && repair.email) updates.email = repair.email;

    // 若原本沒有聯絡人，但維修單提供了聯絡人，且該公司底下「該聯絡人」不存在 → 建立新聯絡人
    if (contactName && this._norm(existing.contact) !== this._norm(contactName)) {
      const same = this.findContact(companyName, contactName);
      if (!same) {
        const created = await this.create({
          name: companyName,
          contact: contactName,
          phone: repair.phone || '',
          email: repair.email || '',
          repairCount: (options.mode === 'create') ? 1 : 0
        });
        return created;
      }
      existing = same;
    }

    if (options.mode === 'create') {
      updates.repairCount = (typeof existing.repairCount === 'number' ? existing.repairCount : 0) + 1;
    }

    if (Object.keys(updates).length === 0) return existing;
    return await this.update(existing.id, updates);
  }

  reset() {
    try {
      if (this.customersRef && typeof this.customersRef.off === "function") {
        this.customersRef.off();
      }
    } catch (e) {}
    this.customers = [];
    this.isInitialized = false;
    this._listenersReady = false;
    this.listeners = [];
    this.db = null;
    this.customersRef = null;
    this._userRootRef = null;
  }

}

// 全域實例
const customerService = new CustomerService();
if (typeof window !== 'undefined') {
  window.CustomerService = customerService;
  try { window.AppRegistry?.register?.('CustomerService', customerService); } catch (_) {}
}

console.log('✅ CustomerService loaded');
