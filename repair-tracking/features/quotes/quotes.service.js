/**
 * 報價管理 - Service
 * V161 - Quotes Module - Service Layer
 */

function _svc(name) {
  try {
    if (typeof window !== 'undefined') {
      if (window.getService && typeof window.getService === 'function') return window.getService(name);
      if (window.AppRegistry && typeof window.AppRegistry.get === 'function') return window.AppRegistry.get(name);
      return window[name];
    }
  } catch (_) {}
  return null;
}



class QuoteService {
  constructor() {
    this.isInitialized = false;
    this.isFirebase = false;
    this.db = null;
    this.ref = null;
    this.counters = null;
    // 版本控制：報價單變更歷史（Firebase：data/<uid>/quoteHistory/<quoteId>/<pushKey>）
    this.historyRef = null;
    this._historyCache = new Map(); // quoteId => history[]
    this.quotes = [];
    this.listeners = [];

    // 索引（依 repairId 快速查詢與取得最新單據）
    this._indexDirty = true;
    this._byRepair = new Map();
    this._latestByRepair = new Map();

    // 本機快取 + 增量同步（updatedAt）
    this.cacheEnabled = true;
    // 不以短時間過期作為全量重抓條件；保留欄位以便未來調整策略
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 天
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
    return `${prefix}quotes_${scope}`;
  }

  _counterKey(dateKey) {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || "unknown"));
    return `${prefix}counter_quoteNo_${scope}_${dateKey}`;
  }

  _historyKey() {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || "unknown"));
    return `${prefix}quote_history_${scope}`;
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
        this.ref = root.child('quotes');
      this.historyRef = root.child('quoteHistory');
      this.counters = this._userRootRef.child('counters').child('quoteNo');
    }

    await this.load();
    this.isInitialized = true;
    console.log('✅ QuoteService initialized');
  }

  async load() {
    // Firebase：採「本機快取優先 + 增量同步（updatedAt）」策略，避免每次全量下載
    if (this.ref) {
      // ① 先用本機快取讓畫面快速可用
      const hadLocal = this.loadFromLocalStorage();
      const meta = this._loadMeta();

      // 同步點：優先用 meta，次選用本機資料計算出來的 max(updatedAt)
      const localMax = this._computeMaxUpdatedAt(this.quotes);
      const syncPoint = ((meta && meta.lastMaxUpdatedAt) ? String(meta.lastMaxUpdatedAt) : String(localMax || '')).trim();

      if (hadLocal && syncPoint) {
        const startAt = this._isoMinusSeconds(syncPoint, 2) || syncPoint;
        this.setupRealtimeListeners(startAt);

        try {
          await this.loadDeltaFromFirebase(startAt);
        } catch (e) {
          console.warn('QuoteService delta sync failed, using cached quotes only:', e);
        }

        this.saveToLocalStorage();
        return;
      }

      // ② 沒有可用快取：首次必要做全量載入，再切換到增量監聽
      try {
        await this.loadFromFirebase();
        const maxU = this._computeMaxUpdatedAt(this.quotes);
        const startAt = this._isoMinusSeconds(maxU, 2) || maxU;
        this.setupRealtimeListeners(startAt);
        this.saveToLocalStorage();
        return;
      } catch (e) {
        console.warn('QuoteService load Firebase failed, fallback to local:', e);
      }
    }

    // 降級：只使用本機資料
    this.loadFromLocalStorage();
  }


  // ===============================
  // Cache Meta（本機快取的同步點）
  // ===============================
  _metaKey() {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || "unknown"));
    return `${prefix}quotes_meta_${scope}`;
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
      return Array.isArray(this.quotes) && this.quotes.length > 0;
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
      this.quotes = Object.values(data).map(QuoteModel.normalize).filter(q => q && !q.isDeleted);
    } else {
      this.quotes = [];
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
      const q = QuoteModel.normalize(raw);
      if (!q || !q.id) continue;
      const idx = (this.quotes || []).findIndex(x => x && x.id === q.id);

      if (q.isDeleted) {
        if (idx !== -1) {
          this.quotes.splice(idx, 1);
          changed++;
        }
        continue;
      }

      if (idx === -1) {
        this.quotes.unshift(q);
      } else {
        this.quotes[idx] = q;
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

    // 使用 query（orderByChild + startAt）避免每次啟動都觸發全量 child_added
    this._streamRef = startAt
      ? this.ref.orderByChild('updatedAt').startAt(startAt)
      : this.ref;

    const stream = this._streamRef;

    const upsert = (quote, eventNameForNew) => {
      if (!quote || !quote.id) return;

      const idx = (this.quotes || []).findIndex(q => q && q.id === quote.id);

      if (quote.isDeleted) {
        if (idx !== -1) {
          this.quotes.splice(idx, 1);
          this._scheduleCacheSave();
          this._notifyChanged();
        }
        return;
      }

      if (idx === -1) {
        this.quotes.unshift(quote);
      } else {
        this.quotes[idx] = quote;
      }

      this._scheduleCacheSave();
      this._notifyChanged();
    };

    const onAdd = (snap) => upsert(QuoteModel.normalize(snap.val()), 'added');
    const onChange = (snap) => upsert(QuoteModel.normalize(snap.val()), 'updated');
    const onRemove = (snap) => {
      const id = snap && snap.key ? String(snap.key) : '';
      if (!id) return;
      const idx = (this.quotes || []).findIndex(q => q && q.id === id);
      if (idx !== -1) {
        const removed = this.quotes[idx];
        this.quotes.splice(idx, 1);
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
      localStorage.setItem(this._key(), JSON.stringify(this.quotes || []));

      // 同步點：用於下次啟動增量同步
      const meta = {
        savedAt: Date.now(),
        lastMaxUpdatedAt: this._computeMaxUpdatedAt(this.quotes),
        streamStartAt: (this._streamStartAt || '').toString(),
        counts: {
          quotes: Array.isArray(this.quotes) ? this.quotes.length : 0
        }
      };
      this._saveMeta(meta);
    } catch (e) {
      console.warn('QuoteService saveLocal failed:', e);
    }
  }

_notifyChanged() {
    this._markIndexDirty();
    // 通知其他 UI（例如：維修卡片 chips / 機台歷史頁）更新
    try {
      window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'quotes' } }));
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


  for (const x of (this.quotes || [])) {
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
  // 回傳副本，避免外部修改內部狀態
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

  async _writeFirebaseQuote(quote) {
    if (!this.ref || !quote?.id) return;
    try {
      // 重要：不要整包 set() 覆寫整個 quotes 節點，避免多使用者同時操作時互相覆蓋
      await this.ref.child(quote.id).set(quote);
    } catch (e) {
      console.warn('QuoteService write Firebase failed:', e);
    }
  }

  // ===============================
  // 版本控制（Quote History）
  // ===============================
  _getActor() {
    try {
      const u = window.AuthSystem?.getUser?.() || window.currentUser || window.AuthSystem?.getCurrentUser?.() || null;
      return {
        uid: (u?.uid || '').toString(),
        name: (u?.displayName || u?.name || '').toString(),
        email: (u?.email || '').toString()
      };
    } catch (_) {
      return { uid: '', name: '', email: '' };
    }
  }

  _loadHistoryStore() {
    try {
      const raw = localStorage.getItem(this._historyKey());
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (_) {
      return {};
    }
  }

  _saveHistoryStore(store) {
    try {
      localStorage.setItem(this._historyKey(), JSON.stringify(store || {}));
    } catch (_) {}
  }

  _toMs(v) {
    try {
      if (typeof window.toEpoch === 'function') return window.toEpoch(v, 0);
      if (window.TimeUtils?.toEpoch) return window.TimeUtils.toEpoch(v, 0);
      const d = new Date(v);
      return Number.isFinite(d.getTime()) ? d.getTime() : 0;
    } catch (_) {
      return 0;
    }
  }

  _diffQuote(prev, next) {
    const a = prev || {};
    const b = next || {};
    const changed = [];

    const push = (field, from, to) => {
      if (String(from ?? '') === String(to ?? '')) return;
      changed.push({ field, from, to });
    };

    push('status', a.status, b.status);
    push('customer', a.customer, b.customer);
    push('currency', a.currency, b.currency);
    push('note', (a.note || '').toString().trim(), (b.note || '').toString().trim());

    const aItems = Array.isArray(a.items) ? a.items : [];
    const bItems = Array.isArray(b.items) ? b.items : [];
    const aTotal = Number(a.totalAmount || 0);
    const bTotal = Number(b.totalAmount || 0);
    if (aItems.length !== bItems.length || aTotal !== bTotal) {
      changed.push({ field: 'items', from: `${aItems.length}項 / ${aTotal}`, to: `${bItems.length}項 / ${bTotal}` });
    } else {
      // 深比對：避免只改其中一列但總額剛好相同
      try {
        if (JSON.stringify(aItems) !== JSON.stringify(bItems)) {
          changed.push({ field: 'items', from: `${aItems.length}項`, to: `${bItems.length}項（內容變更）` });
        }
      } catch (_) {}
    }

    const summary = changed.length
      ? changed.map(x => x.field).join(', ')
      : '（無欄位差異）';

    return { changed, summary };
  }

  async getHistory(quoteId) {
    await this.init();
    const qid = (quoteId || '').toString().trim();
    if (!qid) return [];

    // 記憶體快取
    if (this._historyCache.has(qid)) {
      const cached = this._historyCache.get(qid);
      return Array.isArray(cached) ? cached.slice() : [];
    }

    // Firebase 優先
    if (this.historyRef) {
      try {
        const snap = await this.historyRef.child(qid).once('value');
        const data = snap.val();
        let list = [];
        if (data && typeof data === 'object') list = Object.values(data);
        list = list
          .filter(x => x && typeof x === 'object')
          .sort((a, b) => {
            const va = Number(a.version || 0);
            const vb = Number(b.version || 0);
            if (vb !== va) return vb - va;
            return String(b.at || '').localeCompare(String(a.at || ''));
          });

        this._historyCache.set(qid, list);

        // 同步寫入本機（離線仍可查看）
        try {
          const store = this._loadHistoryStore();
          store[qid] = list;
          this._saveHistoryStore(store);
        } catch (_) {}

        return list.slice();
      } catch (e) {
        console.warn('QuoteService getHistory Firebase failed:', e);
      }
    }

    // Local fallback
    try {
      const store = this._loadHistoryStore();
      const list = Array.isArray(store[qid]) ? store[qid] : [];
      const sorted = list.slice().sort((a, b) => {
        const va = Number(a.version || 0);
        const vb = Number(b.version || 0);
        if (vb !== va) return vb - va;
        return String(b.at || '').localeCompare(String(a.at || ''));
      });
      this._historyCache.set(qid, sorted);
      return sorted.slice();
    } catch (_) {
      return [];
    }
  }

  async addHistoryAction(quoteId, options = {}) {
    await this.init();
    const qid = (quoteId || '').toString().trim();
    if (!qid) return null;

    const opt = (options && typeof options === 'object') ? options : {};
    const actor = opt.actor || this._getActor();
    const now = QuoteModel.nowIso();

    const entry = {
      id: QuoteModel.newId('qhist'),
      quoteId: qid,
      version: Number(opt.version || 0) || 0,
      action: (opt.action || 'UPDATE').toString(),
      at: now,
      byUid: (actor.uid || '').toString(),
      byName: (actor.name || '').toString(),
      byEmail: (actor.email || '').toString(),
      summary: (opt.summary || '').toString(),
      changed: Array.isArray(opt.changed) ? opt.changed : [],
      snapshot: (opt.snapshot && typeof opt.snapshot === 'object') ? opt.snapshot : null,
      meta: (opt.meta && typeof opt.meta === 'object') ? opt.meta : null
    };

    // Firebase
    if (this.historyRef) {
      try {
        await this.historyRef.child(qid).push(entry);
      } catch (e) {
        console.warn('QuoteService addHistoryAction Firebase failed:', e);
      }
    }

    // Local store + cache
    try {
      const store = this._loadHistoryStore();
      const arr = Array.isArray(store[qid]) ? store[qid] : [];
      arr.unshift(entry);
      store[qid] = arr;
      this._saveHistoryStore(store);
      this._historyCache.set(qid, arr);
    } catch (_) {}

    return entry;
  }
  getAll() {
    // 注意：remove() 目前採用軟刪除（isDeleted=true）。
    // UI / 搜尋 / 計數需排除已刪除項目，避免出現「按刪除但看起來沒刪」的誤解。
    const rev = this._rev || 0;
    if (this._cacheAll && this._cacheAll.rev === rev) return this._cacheAll.arr;

    const arr = (this.quotes || [])
      .filter(q => q && !q.isDeleted)
      .slice()
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

    this._cacheAll = { rev, arr };
    return arr;
  }

  get(id) {
    const q = (this.quotes || []).find(x => x && x.id === id) || null;
    if (!q || q.isDeleted) return null;
    return q;
  }

  search(text) {
    const q = (text || '').toString().trim().toLowerCase();
    const rows = this.getAll();
    if (!q) return rows;
    return rows.filter(x => {
      // customer：以維修單上的公司名稱為優先（支援客戶更名後仍可搜尋到舊報價）
      let repairCustomer = '';
      try {
        repairCustomer = (window.RepairService && typeof window.RepairService.get === 'function')
          ? (window.RepairService.get(x.repairId)?.customer || '')
          : '';
      } catch (_) {
        repairCustomer = '';
      }

      const hay = `${x.quoteNo || ''} ${x.customer || ''} ${repairCustomer || ''} ${x.status || ''} ${x.repairId || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  async _nextQuoteNo() {
    const dateKey = this._getTaipeiDateKey();

    if (this.counters) {
      const counterRef = this.counters.child(dateKey);
      const result = await counterRef.transaction(current => (current || 0) + 1);
      const seq = result.snapshot.val();
      return `Q${dateKey}-${String(seq).padStart(3, '0')}`;
    }

    // local
    const k = this._counterKey(dateKey);
    const next = Number(localStorage.getItem(k) || 0) + 1;
    localStorage.setItem(k, String(next));
    return `Q${dateKey}-${String(next).padStart(3, '0')}`;
  }

  async createFromRepair(repairId) {
    await this.init();
    if (!repairId) throw new Error('repairId is required');

    const repair = _svc('RepairService')?.get?.(repairId);
    const parts = _svc('RepairPartsService')?.getForRepair?.(repairId) || [];
    const items = parts
      .filter(p => p && !p.isDeleted)
      .map(p => ({
        name: p.partName || '',
        mpn: p.mpn || '',
        vendor: p.vendor || '',
        qty: Number(p.qty || 1),
        unit: p.unit || 'pcs',
        unitPrice: Number(p.unitPrice || 0)
      }))
      .filter(it => (it.name || '').trim().length > 0);

    const quoteNo = await this._nextQuoteNo();
    const owner = window.AuthSystem?.getUser?.() || null;
    const actor = this._getActor();
    const now = QuoteModel.nowIso();

    const quote = QuoteModel.normalize({
      id: QuoteModel.newId('quote'),
      quoteNo,
      repairId,
      customer: repair?.customer || '',
      status: '草稿',
      currency: 'TWD',
      items,
      ownerUid: owner?.uid || '',
      ownerName: owner?.displayName || owner?.name || '',
      ownerEmail: owner?.email || '',
      version: 1,
      createdByUid: actor.uid || '',
      createdByName: actor.name || '',
      createdByEmail: actor.email || '',
      updatedByUid: actor.uid || '',
      updatedByName: actor.name || '',
      updatedByEmail: actor.email || '',
      note: '',
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    });

    this.quotes = [quote, ...(this.quotes || [])];
    this._scheduleCacheSave(250);
    await this._writeFirebaseQuote(quote);
    // 版本控制：建立紀錄
    try {
      await this.addHistoryAction(quote.id, {
        action: 'CREATE',
        version: quote.version,
        summary: 'CREATE',
        changed: [],
        snapshot: quote,
        actor
      });
    } catch (_) {}
    this._notifyChanged();

    // 同步更新 repairParts：標記已報價 + quoteId
    try {
      if (_svc('RepairPartsService')?.update) {
        const list = _svc('RepairPartsService').getForRepair(repairId);
        for (const p of list) {
          if (!p || p.isDeleted) continue;
          if (p.status === '需求提出' || !p.status) {
            await _svc('RepairPartsService').update(repairId, p.id, { status: '已報價', quoteId: quote.id });
          }
        }
      }
    } catch (e) {
      console.warn('QuoteService createFromRepair: update repairParts failed:', e);
    }

    return quote;
  }

  async upsert(quote) {
    await this.init();
    const actor = this._getActor();
    const now = QuoteModel.nowIso();
    const incoming = (quote && typeof quote === 'object') ? quote : {};
    const incomingId = (incoming.id || '').toString().trim();
    const prev = incomingId ? this.get(incomingId) : null;

    const nextVersion = prev ? ((Number(prev.version) || 1) + 1) : (Number(incoming.version) || 1);

    // 狀態核准：首次變更為「已核准」時寫入 approved* 欄位
    const nextStatus = (incoming.status ?? prev?.status ?? '草稿').toString().trim();
    const prevStatus = (prev?.status || '').toString().trim();
    const approvedPatch = (nextStatus === '已核准' && prevStatus !== '已核准')
      ? {
          approvedAt: now,
          approvedByUid: actor.uid || '',
          approvedByName: actor.name || '',
          approvedByEmail: actor.email || ''
        }
      : {};

    const merged = {
      ...(prev || {}),
      ...incoming,
      status: nextStatus,
      version: nextVersion,
      updatedAt: now,
      updatedByUid: actor.uid || '',
      updatedByName: actor.name || '',
      updatedByEmail: actor.email || '',
      ...approvedPatch
    };

    // create 時補齊 created* 欄位
    if (!prev) {
      merged.createdAt = (merged.createdAt || '').toString().trim() || now;
      merged.createdByUid = merged.createdByUid || actor.uid || '';
      merged.createdByName = merged.createdByName || actor.name || '';
      merged.createdByEmail = merged.createdByEmail || actor.email || '';
    }

    const normalized = QuoteModel.normalize(merged);
    const idx = (this.quotes || []).findIndex(q => q.id === normalized.id);
    if (idx >= 0) this.quotes[idx] = normalized;
    else this.quotes = [normalized, ...(this.quotes || [])];

    const action = prev ? 'UPDATE' : 'CREATE';
    const diff = this._diffQuote(prev, normalized);

    this._scheduleCacheSave(250);
    await this._writeFirebaseQuote(normalized);

    // 版本控制：寫入歷史
    try {
      await this.addHistoryAction(normalized.id, {
        action,
        version: normalized.version,
        summary: `${action}: ${diff.summary}`,
        changed: diff.changed,
        snapshot: normalized,
        actor
      });
    } catch (_) {}

    this._notifyChanged();
    return normalized;
  }

  async remove(id) {
    await this.init();
    const rid = (id || '').toString().trim();
    const idx = (this.quotes || []).findIndex(q => q && q.id === rid);
    if (idx === -1) return;

    const removed = this.quotes[idx];

    // 先移除本機快取，確保 UI 立即消失
    // 注意：getAll() 有快取（_cacheAll / _rev），必須先 _notifyChanged() 才能讓列表即時刷新。
    this.quotes.splice(idx, 1);
    this._notifyChanged();
    this._scheduleCacheSave(250);

    // 同步 Firebase：使用 child(id).remove()，避免整包 set 覆寫且更符合「刪除」語意
    if (this.ref) {
      try {
        await this.ref.child(rid).remove();
      } catch (e) {
        // 回滾本機狀態
        this.quotes.splice(idx, 0, removed);
        this._notifyChanged();
        this._scheduleCacheSave(250);
        throw e;
      }
    }

    // 本方法一開始已呼叫 _notifyChanged()，故不需要重複 dispatch data:changed。

    // 連動 repairParts：若該維修單用料仍停留在「已報價」且未產生訂單，則回復為「需求提出」並清除 quoteId
    try {
      const repairId = removed?.repairId || '';
      if (repairId && _svc('RepairPartsService')?.getForRepair && _svc('RepairPartsService')?.update) {
        const list = _svc('RepairPartsService').getForRepair(repairId);
        for (const p of list) {
          if (!p || p.isDeleted) continue;
          if (p.quoteId === rid && !p.orderId && (p.status === '已報價' || !p.status)) {
            await _svc('RepairPartsService').update(repairId, p.id, { status: '需求提出', quoteId: null });
          }
        }
      }
    } catch (e) {
      console.warn('QuoteService remove: rollback repairParts failed:', e);
    }

    // 版本控制：刪除也保留紀錄（不刪除 history）
    try {
      const actor = this._getActor();
      await this.addHistoryAction(rid, {
        action: 'DELETE',
        version: Number(removed?.version || 0) || 0,
        summary: 'DELETE',
        changed: [],
        snapshot: removed,
        actor
      });
    } catch (_) {}
  }

  /**
   * 公司更名同步（由 CustomerService 呼叫）
   * - 依 quote.customer 完全一致（忽略前後空白/連續空白/大小寫）進行批次更新
   */
  async renameCustomer(fromName, toName) {
    await this.init();
    const actor = this._getActor();
    const norm = (v) => (v === null || v === undefined)
      ? ''
      : String(v).trim().toLowerCase().replace(/\s+/g, ' ');

    const oldKey = norm(fromName);
    const newName = (toName === null || toName === undefined) ? '' : String(toName).trim();
    const newKey = norm(newName);
    if (!oldKey || !newKey || oldKey === newKey) return { updated: 0 };

    const nowIso = QuoteModel.nowIso();
    let updatedCount = 0;
    const list = Array.isArray(this.quotes) ? this.quotes : [];

    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      if (!q || q.isDeleted) continue;
      if (norm(q.customer) !== oldKey) continue;

      const nextVer = (Number(q.version) || 1) + 1;
      const patch = {
        customer: newName,
        updatedAt: nowIso,
        version: nextVer,
        updatedByUid: actor.uid || '',
        updatedByName: actor.name || '',
        updatedByEmail: actor.email || ''
      };
      const updated = { ...q, ...patch };
      this.quotes[i] = updated;

      try {
        if (this.ref) await this.ref.child(updated.id).update(patch);
      } catch (e) {
        console.warn('QuoteService renameCustomer: firebase update failed:', e);
      }

      // 版本控制：批次更名也寫入 history
      try {
        await this.addHistoryAction(updated.id, {
          action: 'RENAME_CUSTOMER',
          version: nextVer,
          summary: 'RENAME_CUSTOMER: customer',
          changed: [{ field: 'customer', from: q.customer, to: newName }],
          snapshot: updated,
          actor,
          meta: { from: fromName, to: newName }
        });
      } catch (_) {}
      updatedCount += 1;
    }

    if (updatedCount) {
      this._scheduleCacheSave(250);
      this._notifyChanged();
      try { window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'quotes' } })); } catch (_) {}
    }

    return { updated: updatedCount };
  }
}

const quoteService = new QuoteService();
if (typeof window !== 'undefined') {
  window.QuoteService = quoteService;
  try { window.AppRegistry?.register?.('QuoteService', quoteService); } catch (_) {}
}

console.log('✅ QuoteService loaded');