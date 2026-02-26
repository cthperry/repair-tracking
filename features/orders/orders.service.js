/**
 * 訂單/採購追蹤 - Service
 * V161 - Orders Module - Service Layer
 */




class OrderService {
  constructor() {
    this.isInitialized = false;
    this.isFirebase = false;
    this.db = null;
    this.ref = null;
    this.counters = null;
    this.orders = [];

    // 本機快取 + 增量同步（updatedAt）
    this.cacheEnabled = true;
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 天（保留欄位）
    this._cacheSaveTimer = null;

    // getAll 快取（避免重複 filter/sort）
    this._rev = 0;
    this._cacheAll = null;

    // 關頁/切背景時 flush 本機快取
    this._localFlushHooked = false;

    // Realtime Stream
    this._listenersReady = false;
    this._streamRef = null;
    this._streamStartAt = '';
  }

  _key() {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || "unknown"));
    return `${prefix}orders_${scope}`;
  }

  _counterKey(dateKey) {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || "unknown"));
    return `${prefix}counter_orderNo_${scope}_${dateKey}`;
  }

  _getTaipeiDateKey() {
    try {
      if (window.Utils && typeof window.Utils.getTaipeiDateKey === 'function') {
        return window.Utils.getTaipeiDateKey();
      }
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = fmt.formatToParts(new Date());
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      return `${y}${m}${d}`;
    } catch (_) {
      return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }
  }

  async init() {
    if (this.isInitialized) return;

    this.isFirebase = (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined');
    if (this.isFirebase) {
      this.db = firebase.database();
      const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || window.AuthSystem?.getCurrentUser?.()?.uid || '').toString();
        const root = this.db.ref('data').child(uid);
        this._userRootRef = root;
        this.ref = root.child('orders');
      this.counters = this._userRootRef.child('counters').child('orderNo');
    }

    await this.load();
    this.isInitialized = true;
    console.log('✅ OrderService initialized');
  }

  async load() {
    // Firebase：採「本機快取優先 + 增量同步（updatedAt）」策略，避免每次全量下載
    if (this.ref) {
      const hadLocal = this.loadFromLocalStorage();
      const meta = this._loadMeta();

      const localMax = this._computeMaxUpdatedAt(this.orders);
      const syncPoint = ((meta && meta.lastMaxUpdatedAt) ? String(meta.lastMaxUpdatedAt) : String(localMax || '')).trim();

      if (hadLocal && syncPoint) {
        const startAt = this._isoMinusSeconds(syncPoint, 2) || syncPoint;
        this.setupRealtimeListeners(startAt);
        try {
          await this.loadDeltaFromFirebase(startAt);
        } catch (e) {
          console.warn('OrderService delta sync failed, using cached orders only:', e);
        }
        this.saveToLocalStorage();
        return;
      }

      try {
        await this.loadFromFirebase();
        const maxU = this._computeMaxUpdatedAt(this.orders);
        const startAt = this._isoMinusSeconds(maxU, 2) || maxU;
        this.setupRealtimeListeners(startAt);
        this.saveToLocalStorage();
        return;
      } catch (e) {
        console.warn('OrderService load Firebase failed, fallback to local:', e);
      }
    }

    this.loadFromLocalStorage();
  }


  // ===============================
  // Cache Meta（本機快取的同步點）
  // ===============================
  _metaKey() {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || "unknown"));
    return `${prefix}orders_meta_${scope}`;
  }

  _loadMeta() {
    try {
      const raw = localStorage.getItem(this._metaKey());
      if (!raw) return null;
      const meta = JSON.parse(raw);
      return meta && typeof meta === 'object' ? meta : null;
    } catch (_) {
      return null;
    }
  }

  _saveMeta(meta) {
    try {
      localStorage.setItem(this._metaKey(), JSON.stringify(meta || {}));
    } catch (_) {}
  }

  _computeMaxUpdatedAt(list) {
    try {
      let max = '';
      for (const x of (list || [])) {
        const u = (x && x.updatedAt) ? String(x.updatedAt) : '';
        if (u && (!max || u.localeCompare(max) > 0)) max = u;
      }
      return max;
    } catch (_) {
      return '';
    }
  }

  _isoMinusSeconds(iso, seconds = 2) {
    try {
      const d = new Date(iso);
      if (!Number.isFinite(d.getTime())) return '';
      const t = d.getTime() - Math.max(0, seconds) * 1000;
      return new Date(t).toISOString();
    } catch (_) {
      return '';
    }
  }

  _ensureLocalFlushHook() {
    if (this._localFlushHooked) return;
    this._localFlushHooked = true;
    try {
      window.addEventListener('beforeunload', () => {
        try { this._saveLocalNow(); } catch (_) {}
      }, { capture: true });
    } catch (_) {}
    try {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          try { this._saveLocalNow(); } catch (_) {}
        }
      }, { capture: true });
    } catch (_) {}
  }

  _scheduleCacheSave(delayMs = 1500) {
    if (!this.cacheEnabled) return;
    this._ensureLocalFlushHook();
    if (this._cacheSaveTimer) clearTimeout(this._cacheSaveTimer);
    this._cacheSaveTimer = setTimeout(() => {
      this._cacheSaveTimer = null;
      this._saveLocalNow();
    }, Math.max(250, delayMs));
  }

  loadFromLocalStorage() {
    try {
      this._loadLocal();
      return Array.isArray(this.orders) && this.orders.length > 0;
    } catch (_) {
      return false;
    }
  }

  saveToLocalStorage() {
    this._saveLocalNow();
  }

  async loadFromFirebase() {
    if (!this.ref) return;
    const snap = await this.ref.once('value');
    const data = snap.val();
    if (data && typeof data === 'object') {
      this.orders = Object.values(data).map(OrderModel.normalize).filter(o => o && !o.isDeleted);
    } else {
      this.orders = [];
    }
    this._scheduleCacheSave(250);
    this._notifyChanged();
  }

  async loadDeltaFromFirebase(startAtIso) {
    if (!this.ref) return;
    const startAt = (startAtIso || '').toString().trim();
    if (!startAt) {
      await this.loadFromFirebase();
      return;
    }

    const snapshot = await this.ref
      .orderByChild('updatedAt')
      .startAt(startAt)
      .once('value');

    const data = snapshot.val();
    if (!data) return;

    let changed = 0;
    for (const raw of Object.values(data)) {
      const o = OrderModel.normalize(raw);
      if (!o || !o.id) continue;
      const idx = (this.orders || []).findIndex(x => x && x.id === o.id);

      if (o.isDeleted) {
        if (idx !== -1) {
          this.orders.splice(idx, 1);
          changed++;
        }
        continue;
      }

      if (idx === -1) {
        this.orders.unshift(o);
      } else {
        this.orders[idx] = o;
      }
      changed++;
    }

    if (changed) {
      this._scheduleCacheSave(250);
      this._notifyChanged();
    }
  }

  setupRealtimeListeners(startAtIso = '') {
    if (!this.ref) return;
    if (this._listenersReady) return;

    const startAt = (startAtIso || '').toString().trim();
    this._streamStartAt = startAt;

    this._streamRef = startAt
      ? this.ref.orderByChild('updatedAt').startAt(startAt)
      : this.ref;

    const stream = this._streamRef;

    const upsert = (order) => {
      if (!order || !order.id) return;
      const idx = (this.orders || []).findIndex(o => o && o.id === order.id);

      if (order.isDeleted) {
        if (idx !== -1) {
          this.orders.splice(idx, 1);
          this._scheduleCacheSave();
          this._notifyChanged();
        }
        return;
      }

      if (idx === -1) {
        this.orders.unshift(order);
      } else {
        this.orders[idx] = order;
      }

      this._scheduleCacheSave();
      this._notifyChanged();
    };

    const onAdd = (snap) => upsert(OrderModel.normalize(snap.val()));
    const onChange = (snap) => upsert(OrderModel.normalize(snap.val()));
    const onRemove = (snap) => {
      const id = snap && snap.key ? String(snap.key) : '';
      if (!id) return;
      const idx = (this.orders || []).findIndex(o => o && o.id === id);
      if (idx !== -1) {
        this.orders.splice(idx, 1);
        this._scheduleCacheSave();
        this._notifyChanged();
      }
    };

    stream.on('child_added', onAdd);
    stream.on('child_changed', onChange);
    stream.on('child_removed', onRemove);

    this._streamHandlers = { onAdd, onChange, onRemove };
    this._listenersReady = true;
  }

  detachRealtimeListeners() {
    try {
      if (!this._streamRef || !this._streamHandlers) return;
      const { onAdd, onChange, onRemove } = this._streamHandlers;
      this._streamRef.off('child_added', onAdd);
      this._streamRef.off('child_changed', onChange);
      this._streamRef.off('child_removed', onRemove);
    } catch (_) {}
    this._listenersReady = false;
    this._streamRef = null;
    this._streamHandlers = null;
  }
  _saveLocal() {
    // 相容舊呼叫：保留立即寫入
    this._saveLocalNow();
  }

  _saveLocalNow() {
    try {
      localStorage.setItem(this._key(), JSON.stringify(this.orders || []));

      // 同步點：用於下次啟動增量同步
      const meta = {
        savedAt: Date.now(),
        lastMaxUpdatedAt: this._computeMaxUpdatedAt(this.orders),
        streamStartAt: (this._streamStartAt || '').toString(),
        counts: {
          orders: Array.isArray(this.orders) ? this.orders.length : 0
        }
      };
      this._saveMeta(meta);
    } catch (e) {
      console.warn('OrderService saveLocal failed:', e);
    }
  }
_notifyChanged() {
    this._markIndexDirty();
    // 通知其他 UI（例如：維修卡片 chips / 機台歷史頁）更新
    try {
      window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'orders' } }));
    } catch (_) {}
  }


_markIndexDirty() {
  this._indexDirty = true;
  this._cacheAll = null;
  this._rev = (this._rev || 0) + 1;
}

_ensureIndex() {
  if (!this._indexDirty) return;
  this._indexDirty = false;
  this._byRepair = new Map();
  this._latestByRepair = new Map();

  const toMs = (v) => (typeof window.toEpoch === 'function')
    ? window.toEpoch(v, 0)
    : (window.TimeUtils?.toEpoch ? window.TimeUtils.toEpoch(v, 0) : 0);

  for (const x of (this.orders || [])) {
    if (!x || x.isDeleted) continue;
    const rid = (x.repairId || '').toString();
    if (!rid) continue;

    let arr = this._byRepair.get(rid);
    if (!arr) {
      arr = [];
      this._byRepair.set(rid, arr);
    }
    arr.push(x);

    const t = toMs(x.updatedAt || x.createdAt);
    const cur = this._latestByRepair.get(rid);
    const curT = cur ? toMs(cur.updatedAt || cur.createdAt) : -1;
    if (!cur || t > curT) this._latestByRepair.set(rid, x);
  }
}

getForRepair(repairId) {
  const rid = (repairId || '').toString();
  if (!rid) return [];
  this._ensureIndex();
  const arr = this._byRepair.get(rid) || [];
  return arr.slice();
}

getLatestForRepair(repairId) {
  const rid = (repairId || '').toString();
  if (!rid) return null;
  this._ensureIndex();
  return this._latestByRepair.get(rid) || null;
}

getSummaryForRepair(repairId) {
  const rid = (repairId || '').toString();
  if (!rid) return { count: 0, latest: null };
  this._ensureIndex();
  const list = this._byRepair.get(rid) || [];
  const latest = this._latestByRepair.get(rid) || null;
  return { count: list.length, latest };
}

  async _writeFirebaseOrder(order) {
    if (!this.ref || !order?.id) return;
    try {
      // 重要：不要整包 set() 覆寫整個 orders 節點，避免多使用者同時操作時互相覆蓋
      await this.ref.child(order.id).set(order);
    } catch (e) {
      console.warn('OrderService write Firebase failed:', e);
    }
  }
  getAll() {
    const rev = this._rev || 0;
    if (this._cacheAll && this._cacheAll.rev === rev) return this._cacheAll.arr;

    const arr = (this.orders || [])
      .filter(o => o && !o.isDeleted)
      .slice()
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

    this._cacheAll = { rev, arr };
    return arr;
  }

  get(id) {
    const o = (this.orders || []).find(x => x && x.id === id) || null;
    if (!o || o.isDeleted) return null;
    return o;
  }

  search(text) {
    const q = (text || '').toString().trim().toLowerCase();
    const rows = this.getAll();
    if (!q) return rows;
    return rows.filter(x => {
      const hay = `${x.orderNo || ''} ${x.customer || ''} ${x.status || ''} ${x.supplier || ''} ${x.repairId || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  async _nextOrderNo() {
    const dateKey = this._getTaipeiDateKey();

    if (this.counters) {
      const counterRef = this.counters.child(dateKey);
      const result = await counterRef.transaction(current => (current || 0) + 1);
      const seq = result.snapshot.val();
      return `O${dateKey}-${String(seq).padStart(3, '0')}`;
    }

    const k = this._counterKey(dateKey);
    const next = Number(localStorage.getItem(k) || 0) + 1;
    localStorage.setItem(k, String(next));
    return `O${dateKey}-${String(next).padStart(3, '0')}`;
  }

  _isApprovedQuoteStatus(status) {
    const s = (status || '').toString().trim();
    const sl = s.toLowerCase();
    if (!s) return false;
    if (s.includes('核准')) return true; // 已核准／核准（簽核）
    if (s.includes('簽核')) return true; // 已簽核
    if (sl === 'approved') return true;
    return false;
  }

  async createFromQuote(quoteId, options = {}) {
    await this.init();
    if (!quoteId) throw new Error('quoteId is required');

    const quote = window._svc('QuoteService')?.get?.(quoteId);
    if (!quote) throw new Error('找不到報價資料');

    // 避免重複建立：同一張報價（quoteId）只允許對應一張訂單
    const existing = (this.orders || []).find(o => o && !o.isDeleted && (o.quoteId || '') === (quote.id || quoteId));
    if (existing) return existing;

    // 轉訂單（由「已簽核/已核准」的報價）
    if (options?.requireApproved) {
      if (!this._isApprovedQuoteStatus(quote.status)) {
        throw new Error('需先將報價狀態設定為「已核准（簽核）」才可轉訂單');
      }
    }

    const repair = window._svc('RepairService')?.get?.(quote.repairId) || null;

    const orderNo = await this._nextOrderNo();
    const owner = window.AuthSystem?.getUser?.() || null;
    const now = OrderModel.nowIso();

    const order = OrderModel.normalize({
      id: OrderModel.newId('order'),
      orderNo,
      quoteId: quote.id,
      repairId: quote.repairId || '',
      customer: quote.customer || repair?.customer || '',
      status: '建立',
      supplier: '',
      currency: quote.currency || 'TWD',
      items: (quote.items || []).map(i => ({
        name: i.name,
        mpn: i.mpn,
        vendor: i.vendor,
        qty: i.qty,
        unit: i.unit,
        unitPrice: i.unitPrice
      })),
      orderedAt: '',
      expectedAt: '',
      receivedAt: '',
      ownerUid: owner?.uid || '',
      ownerName: owner?.displayName || owner?.name || '',
      ownerEmail: owner?.email || '',
      note: '',
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    });

    this.orders = [order, ...(this.orders || [])];
    this._scheduleCacheSave(250);
    await this._writeFirebaseOrder(order);
    this._notifyChanged();

    // 同步更新 repairParts：標記已下單 + orderId（僅針對該 quoteId）
    try {
      const rid = order.repairId;
      if (rid && window._svc('RepairPartsService')?.update) {
        const list = window._svc('RepairPartsService').getForRepair(rid);
        for (const p of list) {
          if (!p || p.isDeleted) continue;
          if (p.quoteId === quote.id && (p.status === '已報價' || p.status === '需求提出' || !p.status)) {
            await window._svc('RepairPartsService').update(rid, p.id, { status: '已下單', orderId: order.id });
          }
        }
      }
    } catch (e) {
      console.warn('OrderService createFromQuote: update repairParts failed:', e);
    }

    // 同步維修單：標記「需收費」且「已下單」
    try {
      if (order.repairId && window._svc('RepairService') && typeof window._svc('RepairService').update === 'function') {
        await window._svc('RepairService').update(order.repairId, {
          billing: {
            chargeable: true,
            orderStatus: 'ordered',
            notOrdered: { reasonCode: null, note: null }
          }
        }, { silent: true });
      }
    } catch (e) {
      console.warn('OrderService createFromQuote: update repair billing failed:', e);
    }

    return order;
  }

async createFromRepair(repair) {
  if (!repair || !repair.id) throw new Error('createFromRepair: invalid repair');

  // 先確保有報價（沒有就由維修單建立）
  let quote = null;
  try {
    if (window._svc('QuoteService')) {
      if (typeof window._svc('QuoteService').getLatestForRepair === 'function') {
        quote = window._svc('QuoteService').getLatestForRepair(repair.id);
      } else if (typeof window._svc('QuoteService').getSummaryForRepair === 'function') {
        quote = window._svc('QuoteService').getSummaryForRepair(repair.id)?.latest || null;
      } else if (typeof window._svc('QuoteService').getForRepair === 'function') {
        const qs = await window._svc('QuoteService').getForRepair(repair.id);
        quote = (window.Utils?.pickLatest) ? window.Utils.pickLatest(qs) : (qs && qs[0]) || null;
      }
    }

    if (!quote && window._svc('QuoteService') && typeof window._svc('QuoteService').createFromRepair === 'function') {
      quote = await window._svc('QuoteService').createFromRepair(repair);
    }
  } catch (e) {
    console.warn('OrderService.createFromRepair: ensure quote failed', e);
  }

  if (!quote) throw new Error('createFromRepair: cannot ensure quote');

  // 再由報價建立訂單
  if (typeof this.createFromQuote !== 'function') throw new Error('createFromRepair: createFromQuote missing');
  // createFromQuote 參數為 quoteId（string）
  return await this.createFromQuote(quote.id);
}

async upsert(order) {
    await this.init();
    const normalized = OrderModel.normalize({ ...order, updatedAt: OrderModel.nowIso() });
    const idx = (this.orders || []).findIndex(o => o.id === normalized.id);
    if (idx >= 0) this.orders[idx] = normalized;
    else this.orders = [normalized, ...(this.orders || [])];
    this._scheduleCacheSave(250);
    await this._writeFirebaseOrder(normalized);
    this._notifyChanged();
    return normalized;
  }

  async remove(id) {
    await this.init();
    const oid = (id || '').toString().trim();
    const idx = (this.orders || []).findIndex(o => o && o.id === oid);
    if (idx === -1) return;

    const removed = this.orders[idx];
    this.orders.splice(idx, 1);
    this._scheduleCacheSave(250);

    if (this.ref) {
      try {
        await this.ref.child(oid).remove();
      } catch (e) {
        this.orders.splice(idx, 0, removed);
        this._scheduleCacheSave(250);
        throw e;
      }
    }

    this._notifyChanged();

    // 連動 repairParts：若用料已下單且 orderId 指向本筆訂單，回復為「已報價」並清除 orderId
    try {
      const repairId = removed?.repairId || '';
      if (repairId && window._svc('RepairPartsService')?.getForRepair && window._svc('RepairPartsService')?.update) {
        const list = window._svc('RepairPartsService').getForRepair(repairId);
        for (const p of list) {
          if (!p || p.isDeleted) continue;
          if (p.orderId === oid && (p.status === '已下單' || !p.status)) {
            await window._svc('RepairPartsService').update(repairId, p.id, { status: '已報價', orderId: null });
          }
        }
      }
    } catch (e) {
      console.warn('OrderService remove: rollback repairParts failed:', e);
    }
  }

  /**
   * 公司更名同步（由 CustomerService 呼叫）
   * - 依 order.customer 完全一致（忽略前後空白/連續空白/大小寫）進行批次更新
   */
  async renameCustomer(fromName, toName) {
    await this.init();
    const norm = (v) => (v === null || v === undefined)
      ? ''
      : String(v).trim().toLowerCase().replace(/\s+/g, ' ');

    const oldKey = norm(fromName);
    const newName = (toName === null || toName === undefined) ? '' : String(toName).trim();
    const newKey = norm(newName);
    if (!oldKey || !newKey || oldKey === newKey) return { updated: 0 };

    const nowIso = OrderModel.nowIso();
    let updatedCount = 0;
    const list = Array.isArray(this.orders) ? this.orders : [];

    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (!o || o.isDeleted) continue;
      if (norm(o.customer) !== oldKey) continue;

      const nextVer = (Number(o.version) || 1) + 1;
      const patch = { customer: newName, updatedAt: nowIso, version: nextVer };
      const updated = { ...o, ...patch };
      this.orders[i] = updated;

      try {
        if (this.ref) await this.ref.child(updated.id).update(patch);
      } catch (e) {
        console.warn('OrderService renameCustomer: firebase update failed:', e);
      }
      updatedCount += 1;
    }

    if (updatedCount) {
      this._scheduleCacheSave(250);
      this._notifyChanged();
      try { window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'orders' } })); } catch (_) {}
    }

    return { updated: updatedCount };
  }
}

const orderService = new OrderService();
if (typeof window !== 'undefined') {

  try { window.AppRegistry?.register?.('OrderService', orderService); } catch (_) {}
}

console.log('✅ OrderService loaded');