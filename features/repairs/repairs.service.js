/**
 * 維修管理 - 服務層
 * V160 - Repairs Module - Service Layer
 * 
 * 職責：
 * 1. CRUD 操作
 * 2. Firebase 同步
 * 3. 本地儲存備份
 * 4. 資料快取
 */

class RepairService {
  constructor() {
    this.repairs = [];
    this.repairHistory = [];
    this.isInitialized = false;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.listeners = [];
    
    // Firebase 參考
    this.db = null;
    this.repairsRef = null;
    this.historyRef = null;
    this.countersRef = null;

    // 避免重複註冊 realtime listeners
    this._listenersReady = false;
    
    // 快取設定
    this.cacheEnabled = true;
    this.cacheExpiry = 5 * 60 * 1000; // 5 分鐘

    // Firebase 增量同步（避免每次都全量載入）
    this._streamRef = null;
    this._streamStartAt = null;

    // localStorage 寫入節流（避免大量即時事件時頻繁寫入）
    this._cacheSaveTimer = null;
  }

  // ===============================
  // Cache Meta（本機快取的同步點）
  // ===============================
  _metaKey() {
    const prefix = AppConfig.system.storage.prefix;
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || 'unknown'));
    return prefix + 'repairs_meta_' + scope;
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
    const repairs = Array.isArray(list) ? list : [];
    let max = '';
    for (const r of repairs) {
      if (!r || r.isDeleted) continue;
      const u = (r.updatedAt || '').toString();
      if (u && (!max || u > max)) max = u;
    }
    return max || '';
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

  _scheduleCacheSave(delayMs = 1500) {
    if (!this.cacheEnabled) return;
    if (this._cacheSaveTimer) clearTimeout(this._cacheSaveTimer);
    this._cacheSaveTimer = setTimeout(() => {
      this._cacheSaveTimer = null;
      this.saveToLocalStorage();
    }, Math.max(250, delayMs));
  }
  
  /**
   * 初始化服務
   */
  async init() {
    if (this.isInitialized) {
      console.debug('RepairService already initialized');
      return;
    }
    
    try {
      console.log('🔧 Initializing Repair Service...');
      
      // 初始化 Firebase（如果可用）
      if (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined') {  // N-3 fix: 補可選鏈
        this.db = firebase.database();
        const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || window.AuthSystem?.getCurrentUser?.()?.uid || '').toString();
        const root = this.db.ref('data').child(uid);
        this._userRootRef = root;
        this.repairsRef = root.child('repairs');
        this.historyRef = root.child('repairHistory');
        this.countersRef = root.child('counters').child('repairNo');
        this.serialIndexRef = root.child('serialIndex');
      }
      
      // 載入資料
      await this.loadData();
      
      this.isInitialized = true;
      console.log('✅ Repair Service initialized');
      console.log(`  📦 Loaded ${this.repairs.length} repairs`);
      
    } catch (error) {
      console.error('Repair Service initialization error:', error);
      window.ErrorHandler.log('HIGH', 'RepairService', 'Initialization failed', { error });
      
      // 降級：只使用本地儲存
      await this.loadFromLocalStorage();
      this.isInitialized = true;
    }
  }
  
  /**
   * 設定即時監聽器（Firebase）
   */
  setupRealtimeListeners(startAtIso = '') {
    if (!this.repairsRef) return;
    if (this._listenersReady) return;

    const startAt = (startAtIso || '').toString().trim();
    this._streamStartAt = startAt;

    // 使用 query（orderByChild + startAt）避免每次啟動都觸發全量 child_added
    this._streamRef = startAt
      ? this.repairsRef.orderByChild('updatedAt').startAt(startAt)
      : this.repairsRef;

    const stream = this._streamRef;

    const upsert = (repair, eventNameForNew) => {
      if (!repair || !repair.id) return;

      const idx = this.repairs.findIndex(r => r.id === repair.id);

      if (repair.isDeleted) {
        if (idx !== -1) {
          this.repairs.splice(idx, 1);
          this.notifyListeners('deleted', repair);
          this._scheduleCacheSave();
        }
        return;
      }

      if (idx === -1) {
        this.repairs.unshift(repair);
        this.notifyListeners(eventNameForNew || 'added', repair);
      } else {
        this.repairs[idx] = repair;
        this.notifyListeners('updated', repair);
      }

      this._scheduleCacheSave();
    };

    stream.on('child_added', (snapshot) => {
      upsert(snapshot.val(), 'added');
    });

    stream.on('child_changed', (snapshot) => {
      upsert(snapshot.val(), 'updated');
    });

    // 真實刪除（少見）— 採 base ref 監聽即可（不會造成全量下載）
    this.repairsRef.on('child_removed', (snapshot) => {
      const repair = snapshot.val();
      const index = this.repairs.findIndex(r => r.id === repair?.id);
      if (index !== -1) {
        this.repairs.splice(index, 1);
        this.notifyListeners('removed', repair);
        this._scheduleCacheSave();
      }
    });

    this._listenersReady = true;
    console.log('  ✓ Firebase realtime listeners setup' + (startAt ? ` (startAt ${startAt})` : ''));
  }
  
  /**
   * 載入資料
   */
  async loadData() {
    // Firebase：採「本機快取優先 + 增量同步」，避免每次都 full download
    if (this.repairsRef) {
      const hadLocal = await this.loadFromLocalStorage();
      const meta = this._loadMeta();
      const now = Date.now();

      const cacheFresh = !!(
        hadLocal &&
        this.cacheEnabled &&
        meta &&
        meta.savedAt &&
        (now - meta.savedAt) < this.cacheExpiry &&
        (meta.lastMaxUpdatedAt || '').toString().trim()
      );

      // ① 快取可用：直接用快取畫面先出來，再做增量補齊
      if (cacheFresh) {
        const startAt = this._isoMinusSeconds(meta.lastMaxUpdatedAt, 2) || meta.lastMaxUpdatedAt;
        this.setupRealtimeListeners(startAt);

        try {
          await this.loadDeltaFromFirebase(startAt);
        } catch (e) {
          console.warn('Delta sync failed, using cached repairs only:', e);
        }

        this.saveToLocalStorage();
        return;
      }

      // ② 無快取 / 快取過期：做一次全量載入（首次必要），再切換到增量監聽
      try {
        await this.loadFromFirebase();

        const maxU = this._computeMaxUpdatedAt(this.repairs);
        const startAt = this._isoMinusSeconds(maxU, 2) || maxU;
        this.setupRealtimeListeners(startAt);

        this.saveToLocalStorage();
        return;
      } catch (error) {
        console.warn('Failed to load from Firebase, falling back to local storage:', error);
      }
    }

    // 降級：從本地儲存載入
    await this.loadFromLocalStorage();
  }
  
  /**
   * 從 Firebase 載入
   */
  async loadFromFirebase() {
    const snapshot = await this.repairsRef.once('value');
    const data = snapshot.val();
    
    if (data) {
      this.repairs = Object.values(data).filter(r => !r.isDeleted);
      console.log(`  ✓ Loaded ${this.repairs.length} repairs from Firebase`);
    }
    
    // 載入歷程記錄
    if (this.historyRef) {
      const historySnapshot = await this.historyRef.once('value');
      const historyData = historySnapshot.val();
      
      if (historyData) {
        this.repairHistory = this._flattenHistoryData(historyData);
        console.log(`  ✓ Loaded ${this.repairHistory.length} history records`);
      }
    }
  }

  /**
   * 從 Firebase 增量載入（依 updatedAt）
   * - startAtIso：ISO 時間字串（包含）
   * - 只抓「自上次同步點之後」的變更，避免每次全量讀取
   */
  async loadDeltaFromFirebase(startAtIso) {
    if (!this.repairsRef) return;

    const startAt = (startAtIso || '').toString().trim();
    if (!startAt) {
      // 沒有同步點：退回全量（首次使用/快取不存在）
      await this.loadFromFirebase();
      return;
    }

    const snapshot = await this.repairsRef
      .orderByChild('updatedAt')
      .startAt(startAt)
      .once('value');

    const data = snapshot.val();
    if (!data) return;

    let changed = 0;
    for (const repair of Object.values(data)) {
      if (!repair || !repair.id) continue;

      const idx = this.repairs.findIndex(r => r.id === repair.id);

      if (repair.isDeleted) {
        if (idx !== -1) {
          this.repairs.splice(idx, 1);
          changed++;
        }
        continue;
      }

      if (idx === -1) {
        this.repairs.unshift(repair);
      } else {
        this.repairs[idx] = repair;
      }
      changed++;
    }

    if (changed) {
      console.log(`  ✓ Delta synced ${changed} repairs from Firebase (startAt ${startAt})`);
    }
  }
  
  /**
   * 從本地儲存載入
   */
  async loadFromLocalStorage() {
    try {
      const prefix = AppConfig.system.storage.prefix;
      const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || 'unknown'));
      const key = prefix + 'repairs_' + scope;
      const data = localStorage.getItem(key);

      let loaded = false;
      
      if (data) {
        this.repairs = JSON.parse(data);
        console.log(`  ✓ Loaded ${this.repairs.length} repairs from localStorage`);
        loaded = true;
      }
      
      // 載入歷程
      const historyKey = prefix + 'repair_history_' + scope;
      const historyData = localStorage.getItem(historyKey);
      
      if (historyData) {
        this.repairHistory = JSON.parse(historyData);
        console.log(`  ✓ Loaded ${this.repairHistory.length} history records from localStorage`);
      }
      return loaded;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      this.repairs = [];
      this.repairHistory = [];
      return false;
    }
  }
  /**
   * 儲存到本地（已做 debounce，避免大量同步 JSON.stringify 造成卡頓）
   */
  saveToLocalStorage() {
    this._localDirty = true;

    const delay = (AppConfig && AppConfig.system && AppConfig.system.performance && typeof AppConfig.system.performance.debounceDelay === 'number')
      ? AppConfig.system.performance.debounceDelay
      : 300;

    // 只掛一次 flush hook（避免關頁/切背景時尚未落盤）
    if (!this._localSaveHooked) {
      this._localSaveHooked = true;
      try {
        window.addEventListener('beforeunload', () => {
          try { this.flushLocalSave(); } catch (_) {}
        }, { capture: true });
      } catch (_) {}
      try {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            try { this.flushLocalSave(); } catch (_) {}
          }
        }, { capture: true });
      } catch (_) {}
    }

    try { if (this._localSaveTimer) clearTimeout(this._localSaveTimer); } catch (_) {}
    this._localSaveTimer = setTimeout(() => {
      this._localSaveTimer = null;
      try { this._saveToLocalStorageNow(); } catch (_) {}
    }, delay);
  }

  /**
   * 立即 flush（用於 beforeunload / visibilitychange）
   */
  flushLocalSave() {
    try {
      if (this._localSaveTimer) {
        clearTimeout(this._localSaveTimer);
        this._localSaveTimer = null;
      }
    } catch (_) {}
    try { this._saveToLocalStorageNow(); } catch (_) {}
  }

  _saveToLocalStorageNow() {
    if (!this._localDirty) return;
    this._localDirty = false;
    try {
      const prefix = AppConfig.system.storage.prefix;
      const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || 'unknown'));
      const key = prefix + 'repairs_' + scope;
      localStorage.setItem(key, JSON.stringify(this.repairs));

      const historyKey = prefix + 'repair_history_' + scope;
      localStorage.setItem(historyKey, JSON.stringify(this.repairHistory));

      // 同步點：用於下次啟動增量同步
      const meta = {
        savedAt: Date.now(),
        lastMaxUpdatedAt: this._computeMaxUpdatedAt(this.repairs),
        streamStartAt: (this._streamStartAt || '').toString(),
        counts: {
          repairs: Array.isArray(this.repairs) ? this.repairs.length : 0,
          history: Array.isArray(this.repairHistory) ? this.repairHistory.length : 0
        }
      };
      this._saveMeta(meta);

      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

/**
 * 歷史紀錄：將 Firebase repairHistory 結構攤平成陣列
 * 支援：
 *   repairHistory/{repairId}/{pushKey} = history
 * 以及舊版可能的陣列格式
 */
_flattenHistoryData(historyData) {
  const list = [];
  if (!historyData || typeof historyData !== 'object') return list;

  for (const [repairId, bucket] of Object.entries(historyData)) {
    if (!bucket) continue;

    // bucket 可能是 array 或 object(pushKey -> history)
    if (Array.isArray(bucket)) {
      for (const h of bucket) {
        if (!h) continue;
        list.push({ ...h, repairId: h.repairId || repairId });
      }
      continue;
    }

    if (typeof bucket === 'object') {
      for (const h of Object.values(bucket)) {
        if (!h) continue;
        list.push({ ...h, repairId: h.repairId || repairId });
      }
    }
  }

  return this._sortHistory(list);
}

/**
 * 依時間排序歷史紀錄（由舊到新）
 */
_sortHistory(list) {
  return [...(list || [])].sort((a, b) => {
    const ta = new Date(a?.timestamp || 0).getTime();
    const tb = new Date(b?.timestamp || 0).getTime();
    return ta - tb;
  });
}

/**
 * 比較用：處理 undefined/null 以及 object/array
 */
_normalizeComparable(val) {
  if (val === undefined) return null;
  if (val === null) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'boolean') return val;
  try {
    return JSON.stringify(val);
  } catch (e) {
    return String(val);
  }
}

_isEqualValue(a, b) {
  return this._normalizeComparable(a) === this._normalizeComparable(b);
}

/**
 * 計算維修單變更欄位（用於歷史紀錄）
 */
_computeChangedFields(before, after) {
  const fields = [
    'customer','contact','phone','email',
    'machine','serialNumber','issue','content',
    'status','progress','priority',
    'needParts','partsOrdered','partsArrived','partsReplaced',
    'billing.chargeable','billing.orderStatus','billing.notOrdered.stageCode','billing.notOrdered.reasonCode','billing.notOrdered.note',
    'notes','tags','attachments'
  ];

  const changed = [];
  const b = before || {};
  const a = after || {};

  const getByPath = (obj, path) => {
    if (!path) return undefined;
    if (path.indexOf('.') === -1) return obj ? obj[path] : undefined;
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  };

  for (const field of fields) {
    const bv = getByPath(b, field);
    const av = getByPath(a, field);
    if (!this._isEqualValue(bv, av)) {
      changed.push({ field, from: bv, to: av });
    }
  }

  return changed;
}

  // ========================================
  // serialIndex（可選）：序號 -> repairId 索引
  // - 目的：資料量變大時，避免必須全載入 repairs 才能查序號
  // - 規則：不影響主流程；任何寫入失敗都應被上層 try/catch 吃掉
  // ========================================
  _normalizeSerial(serial) {
    return (serial === null || serial === undefined) ? '' : String(serial).trim();
  }

  _serialKey(serial) {
    const s = this._normalizeSerial(serial);
    if (!s) return '';
    // RTDB key 不允許 . # $ [ ] /
    return s.replace(/[.#$\[\]\/]/g, '_');
  }

  async _upsertSerialIndex(before, after) {
    if (!this.db || !after || !after.id) return;

    const beforeKey = this._serialKey(before?.serialNumber);
    const afterKey = this._serialKey(after?.serialNumber);

    // 軟刪除：直接從索引移除
    if (after.isDeleted) {
      const key = beforeKey || afterKey;
      if (key) {
        await this.serialIndexRef.child(key).child(after.id).remove();
      }
      return;
    }

    // 先移除舊序號
    if (beforeKey && beforeKey !== afterKey) {
      await this.serialIndexRef.child(beforeKey).child(after.id).remove();
    }

    // 新序號寫入
    if (afterKey) {
      await this.serialIndexRef.child(afterKey).child(after.id).set(true);
    } else if (beforeKey) {
      // 序號被清空：移除索引
      await this.serialIndexRef.child(beforeKey).child(after.id).remove();
    }
  }

  /**
   * 取得 YYYYMMDD（台灣時區）
   */
  getTaiwanDateKey() {
    const dateStr = window.RepairModel.getTaiwanDateString(new Date()).replace(/-/g, '');
    return dateStr;
  }

  /**
   * 由 createdDate（YYYY-MM-DD / YYYYMMDD）取得 YYYYMMDD；不合法則回退今天
   */
  getDateKeyFromCreatedDate(createdDate) {
    const raw = (createdDate === null || createdDate === undefined) ? '' : String(createdDate).trim();
    if (/^\d{8}$/.test(raw)) return raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.replace(/-/g, '');
    return this.getTaiwanDateKey();
  }

  /**
   * 取得下一個維修單流水號（Firebase transaction / 本機 localStorage）
   */
  async getNextRepairSequence(dateKey) {
    // Firebase：transaction 保證多人同時建立不撞號
    if (this.countersRef && typeof this.countersRef.child === 'function') {
      const ref = this.countersRef.child(dateKey);
      const result = await ref.transaction((current) => (current || 0) + 1);
      const seq = result?.snapshot?.val();
      if (typeof seq === 'number') return seq;
      // 兼容某些 SDK 回傳格式
      const fallback = await ref.once('value');
      return fallback.val() || 1;
    }

    // 本機：localStorage
    const prefix = AppConfig.system.storage.prefix;
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || "unknown"));
    const key = `${prefix}repairNo_${scope}_${dateKey}`;
    const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return next;
  }

  /**
   * 生成維修單號：RYYYYMMDD-001
   */
  async generateRepairId(createdDate) {
    const dateKey = this.getDateKeyFromCreatedDate(createdDate);
    const seq = await this.getNextRepairSequence(dateKey);
    const padded = String(seq).padStart(3, '0');
    return `R${dateKey}-${padded}`;
  }

  /**
   * 新增維修單
   */
  async create(data) {
    try {
      // 生成維修單號（RYYYYMMDD-001）
      data = { ...data, id: await this.generateRepairId(data?.createdDate) };

      // 建立維修單
      let repair = RepairModel.normalizeStatusProgress(RepairModel.create(data));

      // completedAt：若建立時即為「已完成」，立刻寫入一次（避免歷史列表排序無依據）
      if (repair.status === '已完成' && !(repair.completedAt || '').toString().trim()) {
        repair = { ...repair, completedAt: new Date().toISOString() };
      }
      
      // 驗證
      const validation = RepairModel.validate(repair);
      if (!validation.isValid) {
        throw new Error(validation.errors.map(e => e.message).join(', '));
      }
      
      // 儲存到 Firebase
      if (this.repairsRef) {
        await this.repairsRef.child(repair.id).set(repair);
      }

      //（可選）序號索引：提升日後「機台歷史」查詢彈性（失敗不影響主流程）
      try {
        await this._upsertSerialIndex(null, repair);
      } catch (_) {}
      
      // 加入本地列表（避免 Realtime Listener 競態造成重複）
      if (!this.repairs.find(r => r.id === repair.id)) {
        this.repairs.unshift(repair);
      }
      
      // 儲存到本地
      this.saveToLocalStorage();
      
      // 通知監聽器
      this.notifyListeners('created', repair);

      // 歷史紀錄：建立
      await this.addHistoryAction(repair, {
        action: 'CREATE',
        note: '建立維修單',
        changed: [],
        fromStatus: null,
        toStatus: repair.status,
        fromProgress: null,
        toProgress: repair.progress
      });
      
      // 同步客戶資料（Phase 1：registry-first；避免直接 window.*Service）
      try {
        const reg = (typeof window !== 'undefined' && window.AppRegistry) ? window.AppRegistry : null;
        const CustomerService = (reg && typeof reg.get === 'function')
          ? reg.get('CustomerService')
          : (typeof window._svc === 'function' ? window._svc('CustomerService') : null);

        if (CustomerService && typeof CustomerService.touchFromRepair === 'function') {
          await CustomerService.touchFromRepair(repair, { mode: 'create' });
        }
      } catch (e) {
        console.warn('Customer sync skipped:', e);
      }

      console.log('✅ Repair created:', repair.id);
      return repair;
      
    } catch (error) {
      console.error('Failed to create repair:', error);
      window.ErrorHandler.log('MEDIUM', 'RepairService', 'Create failed', { error, data });
      throw error;
    }
  }
  
  /**
   * 更新維修單
   */
  async update(id, updates) {
    try {
      // 找到現有維修單
      const existing = this.repairs.find(r => r.id === id);
      if (!existing) {
        throw new Error('維修單不存在');
      }
      
      // 變更前快照（用於歷史紀錄）
      const before = { ...existing };

      // 更新資料
      let updated = RepairModel.normalizeStatusProgress(RepairModel.update(existing, updates));

      // completedAt：第一次進入「已完成」時寫入（後續不覆寫）
      if (updated.status === '已完成' && !(updated.completedAt || '').toString().trim()) {
        updated = { ...updated, completedAt: new Date().toISOString() };
      }
      
      // 驗證
      const validation = RepairModel.validate(updated);
      if (!validation.isValid) {
        throw new Error(validation.errors.map(e => e.message).join(', '));
      }
      
      // 儲存到 Firebase
      if (this.repairsRef) {
        await this.repairsRef.child(id).update(updated);
      }

      //（可選）序號索引：序號異動時同步更新（失敗不影響主流程）
      try {
        await this._upsertSerialIndex(before, updated);
      } catch (_) {}
      
      // 更新本地列表
      const index = this.repairs.findIndex(r => r.id === id);
      if (index !== -1) {
        this.repairs[index] = updated;
      }
      
      // 歷史紀錄：只要有變更就記錄（含進度/狀態連動）
      const changed = this._computeChangedFields(before, updated);
      if (changed.length > 0) {
        await this.addHistoryAction(updated, {
          action: 'UPDATE',
          note: (updates.historyNote || updates.statusNote || '').toString(),
          changed,
          fromStatus: before.status,
          toStatus: updated.status,
          fromProgress: before.progress,
          toProgress: updated.progress
        });
      }

      // 儲存到本地
      this.saveToLocalStorage();
      
      // 通知監聽器
      this.notifyListeners('updated', updated);

      // 同步客戶資料（Phase 1：registry-first；避免直接 window.*Service）
      try {
        const reg = (typeof window !== 'undefined' && window.AppRegistry) ? window.AppRegistry : null;
        const CustomerService = (reg && typeof reg.get === 'function')
          ? reg.get('CustomerService')
          : (typeof window._svc === 'function' ? window._svc('CustomerService') : null);

        if (CustomerService && typeof CustomerService.touchFromRepair === 'function') {
          await CustomerService.touchFromRepair(updated, { mode: 'update' });
        }
      } catch (e) {
        console.warn('Customer sync skipped:', e);
      }

      console.log('✅ Repair updated:', id);
      return updated;
      
    } catch (error) {
      console.error('Failed to update repair:', error);
      window.ErrorHandler.log('MEDIUM', 'RepairService', 'Update failed', { error, id, updates });
      throw error;
    }
  }
  
  /**
   * 刪除維修單（軟刪除）
   */
  async delete(id) {
    try {
      const existing = this.repairs.find(r => r.id === id);
      if (!existing) {
        throw new Error('維修單不存在');
      }
      
      // 軟刪除（標記為已刪除）
      const deleted = {
        ...existing,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: (window.AppState?.getUid?.() || window.currentUser?.uid || '')
      };
      
      // 更新 Firebase
      if (this.repairsRef) {
        await this.repairsRef.child(id).update(deleted);
      }

      //（可選）序號索引：軟刪除後移除索引（失敗不影響主流程）
      try {
        await this._upsertSerialIndex(existing, deleted);
      } catch (_) {}
      
      // 從本地列表移除
      const index = this.repairs.findIndex(r => r.id === id);
      if (index !== -1) {
        this.repairs.splice(index, 1);
      }
      
      // 儲存到本地
      this.saveToLocalStorage();
      
      // 通知監聽器
      this.notifyListeners('deleted', deleted);

      // 歷史紀錄：刪除（軟刪除）
      await this.addHistoryAction(deleted, {
        action: 'DELETE',
        note: '刪除維修單',
        changed: [{ field: 'isDeleted', from: false, to: true }],
        fromStatus: existing.status,
        toStatus: existing.status,
        fromProgress: existing.progress,
        toProgress: existing.progress
      });
      
      console.log('✅ Repair deleted:', id);
      return deleted;
      
    } catch (error) {
      console.error('Failed to delete repair:', error);
      window.ErrorHandler.log('MEDIUM', 'RepairService', 'Delete failed', { error, id });
      throw error;
    }
  }
  
  /**
   * 取得單一維修單
   */
  get(id) {
    return this.repairs.find(r => r.id === id);
  }
  
  /**
   * 取得所有維修單
   */
  getAll() {
    return this.repairs;
  }
  
  /**
   * 搜尋維修單
   */
  search(filters) {
    return RepairModel.filter(this.repairs, filters);
  }
  
  /**
   * 取得統計資料
   */
  getStats() {
    return RepairModel.getStats(this.repairs);
  }
  
  /**
 * 新增歷史紀錄（CREATE / UPDATE / DELETE）
 */
async addHistoryAction(repair, options = {}) {
  try {
    const safeOpt = options && typeof options === 'object' ? options : {};
    const history = RepairModel.createHistory(repair, safeOpt);

    // 補齊 repairId（避免舊資料缺欄位）
    if (!history.repairId) history.repairId = repair?.id || safeOpt.repairId || '';

    // 儲存到 Firebase
    if (this.historyRef && history.repairId) {
      await this.historyRef.child(history.repairId).push(history);
    }

    // 加入本地列表
    this.repairHistory.push(history);
    this.repairHistory = this._sortHistory(this.repairHistory);

    // 儲存到本地
    this.saveToLocalStorage();

    console.log('✅ History added:', history.id);
    return history;

  } catch (error) {
    console.error('Failed to add history:', error);
    window.ErrorHandler.log('LOW', 'RepairService', 'Add history failed', { error });
    return null;
  }
}

/**
 * 相容舊版：新增「狀態歷程」
 */
async addHistory(repair, fromStatus, toStatus, note = '') {
  const changed = (fromStatus !== toStatus)
    ? [{ field: 'status', from: fromStatus, to: toStatus }]
    : [];
  return this.addHistoryAction(repair, {
    action: 'UPDATE',
    fromStatus,
    toStatus,
    fromProgress: null,
    toProgress: null,
    note,
    changed
  });
}

/**
 * 取得維修單歷程
   */
  getHistory(repairId) {
    return this._sortHistory(this.repairHistory.filter(h => h.repairId === repairId));
  }
  
  /**
   * 監聽資料變更
   */
  onChange(callback) {
    this.listeners.push(callback);
    
    // 返回取消監聽函式
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
  
  /**
   * 通知監聽器
   */
  notifyListeners(action, repair) {
    this.listeners.forEach(callback => {
      try {
        callback(action, repair);
      } catch (error) {
        console.error('Error in listener:', error);
      }
    });
  }
  
  /**
   * 同步資料
   */
  async sync() {
    if (this.isSyncing) {
      console.warn('Sync already in progress');
      return;
    }
    
    if (!this.repairsRef) {
      console.warn('Firebase not available, skipping sync');
      return;
    }
    
    try {
      this.isSyncing = true;
      console.log('🔄 Syncing repairs...');

      // 以「上次同步點」做增量同步，避免每次 full download
      const meta = this._loadMeta();
      const base = (meta?.lastMaxUpdatedAt || this._computeMaxUpdatedAt(this.repairs) || '').toString();
      const startAt = this._isoMinusSeconds(base, 2) || base;

      if (startAt) {
        await this.loadDeltaFromFirebase(startAt);
      } else {
        await this.loadFromFirebase();
      }

      this.saveToLocalStorage();
      
      this.lastSyncTime = Date.now();
      console.log('✅ Sync completed');
      
    } catch (error) {
      console.error('Sync failed:', error);
      window.ErrorHandler.log('MEDIUM', 'RepairService', 'Sync failed', { error });
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * 批次匯入
   */
  async importBatch(repairs) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const data of repairs) {
      try {
        await this.create(data);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          data,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * 批次匯出
   */
  exportBatch(filters = {}) {
    const repairs = this.search(filters);
    return repairs.map(repair => RepairModel.toJSON(repair));
  }
  

/**
 * 取得：同公司 + 同機型 最近使用的序號（用於表單提示）
 * - 同時包含進行中(this.repairs)與歷史(this.repairHistory)
 * - 以 updatedAt/createdAt/createdDate 由新到舊排序
 */
getRecentSerialNumbers({ customer, machine, excludeId, limit = 6 } = {}) {
  try {
    const c = (customer || '').toString().trim().toLowerCase();
    const m = (machine || '').toString().trim().toLowerCase();
    if (!c || !m) return [];

    const maxN = Math.max(1, Math.min(12, Number(limit) || 6));
    const pool = []
      .concat(Array.isArray(this.repairs) ? this.repairs : [])
      .concat(Array.isArray(this.repairHistory) ? this.repairHistory : []);
    const toEpoch = (window.TimeUtils && typeof window.TimeUtils.toEpoch === "function")
      ? ((v, fb = 0) => window.TimeUtils.toEpoch(v, fb))
      : ((v, fb = 0) => { const t = Date.parse(String(v ?? "")); return Number.isFinite(t) ? t : fb; });

    const toTime = (r) => {
      const s = (r && (r.updatedAt || r.createdAt)) ? String(r.updatedAt || r.createdAt) : "";
      const t1 = toEpoch(s, 0);
      if (t1) return t1;
      const d = (r && r.createdDate) ? String(r.createdDate) : "";
      const t2 = toEpoch(d ? `${d}T00:00:00+08:00` : "", 0);
      return t2;
    };


    const filtered = pool.filter(r => {
      if (!r) return false;
      const id = (r.id || '').toString();
      if (excludeId && id && id === String(excludeId)) return false;

      const rc = (r.customer || '').toString().trim().toLowerCase();
      const rm = (r.machine || '').toString().trim().toLowerCase();
      if (rc !== c) return false;
      if (rm !== m) return false;

      const sn = (r.serialNumber || '').toString().trim();
      return !!sn;
    });

    filtered.sort((a, b) => toTime(b) - toTime(a));

    const seen = new Set();
    const out = [];
    for (const r of filtered) {
      const sn = (r.serialNumber || '').toString().trim();
      const key = sn.toLowerCase();
      if (!sn || seen.has(key)) continue;
      seen.add(key);
      out.push(sn);
      if (out.length >= maxN) break;
    }
    return out;
  } catch (e) {
    console.warn('getRecentSerialNumbers failed:', e);
    return [];
  }
}

  /**
   * 公司更名同步（由 CustomerService 呼叫）
   * - 依 repair.customer 完全一致（忽略前後空白/連續空白/大小寫）進行批次更新
   */
  async renameCompany(fromName, toName) {
    try {
      await this.init();
    } catch (_) {}

    const norm = (v) => (v === null || v === undefined)
      ? ''
      : String(v).trim().toLowerCase().replace(/\s+/g, ' ');

    const oldKey = norm(fromName);
    const newName = (toName === null || toName === undefined) ? '' : String(toName).trim();
    const newKey = norm(newName);
    if (!oldKey || !newKey || oldKey === newKey) return { updated: 0 };

    const nowIso = new Date().toISOString();
    const list = Array.isArray(this.repairs) ? this.repairs : [];
    const targets = list.filter(r => r && !r.isDeleted && norm(r.customer) === oldKey);
    if (!targets.length) return { updated: 0 };

    let updatedCount = 0;
    for (const r of targets) {
      const nextVer = (Number(r.version) || 1) + 1;
      const patch = { customer: newName, updatedAt: nowIso, version: nextVer };

      try {
        if (this.repairsRef) await this.repairsRef.child(r.id).update(patch);
      } catch (e) {
        console.warn('RepairService renameCompany: firebase update failed:', e);
      }

      const idx = this.repairs.findIndex(x => x.id === r.id);
      if (idx !== -1) this.repairs[idx] = { ...r, ...patch };
      updatedCount += 1;
    }

    try { this.saveToLocalStorage(); } catch (_) {}
    try { this.notifyListeners('bulkUpdated', { field: 'customer', fromName, toName: newName, count: updatedCount }); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'repairs' } })); } catch (_) {}
    return { updated: updatedCount };
  }

  reset() {
    try { this.teardownRealtimeListeners(); } catch (e) {}
    this.repairs = [];
    this.repairHistory = [];
    this.isInitialized = false;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this._listenersReady = false;
    this._streamRef = null;
    this._streamStartAt = null;
    this.db = null;
    this.repairsRef = null;
    this.historyRef = null;
    this.countersRef = null;
    this.serialIndexRef = null;
    this._userRootRef = null;
    try { if (this._cacheSaveTimer) clearTimeout(this._cacheSaveTimer); } catch (e) {}
    this._cacheSaveTimer = null;
  }

  /**
   * 清除所有資料（危險操作）
   */
  async clearAll() {
    {
      const msg = '確定要清除所有維修記錄嗎？此操作無法復原！';
      const ok = (window.UI && typeof window.UI.confirm === 'function')
        ? await window.UI.confirm({ title: '危險操作', message: msg, okText: '清除', cancelText: '取消', tone: 'danger' })
        : confirm(msg);
      if (!ok) return false;
    }
    
    try {
      // 清除 Firebase
      if (this.repairsRef) {
        await this.repairsRef.remove();
      }
      
      if (this.historyRef) {
        await this.historyRef.remove();
      }
      
      // 清除本地
      this.repairs = [];
      this.repairHistory = [];
      this.saveToLocalStorage();
      
      console.log('✅ All repairs cleared');
      return true;
      
    } catch (error) {
      console.error('Failed to clear repairs:', error);
      window.ErrorHandler.log('HIGH', 'RepairService', 'Clear all failed', { error });
      throw error;
    }
  }
}

// 建立全域實例
const repairService = new RepairService();

// 輸出到全域
if (typeof window !== 'undefined') {

  try { window.AppRegistry?.register?.('RepairService', repairService); } catch (_) {}
}

console.log('✅ RepairService loaded');
