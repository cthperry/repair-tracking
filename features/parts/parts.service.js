/**
 * 零件管理 - Service
 * V161 - Parts Module - Service Layer
 *
 * - parts：零件主檔（可選）
 * - repairParts：維修單用料/更換追蹤（核心）
 */

class PartService {
  constructor() {
    this.isInitialized = false;
    this.isFirebase = false;
    this.db = null;
    this.ref = null;
    this.parts = [];

    // PartService localStorage debounce
    this._localDirty = false;
    this._localSaveTimer = null;
    this._localSaveHooked = false;
  }

  _key() {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || 'unknown'));
    return `${prefix}parts_catalog_${scope}`;
  }

  async init() {
    if (this.isInitialized) return;

    this.isFirebase = (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined');
    if (this.isFirebase) {
      this.db = firebase.database();
      const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || window.AuthSystem?.getCurrentUser?.()?.uid || '').toString();
      if (!uid) {
        console.warn('PartService init: missing uid, fallback to local mode');
        this.isFirebase = false;
      } else {
        const root = this.db.ref('data').child(uid);
        this._userRootRef = root;
        this.ref = root.child('parts');
      }
    }

    await this.load();
    this.isInitialized = true;
    console.log('✅ PartService initialized');
  }
  async load() {
    // Firebase 優先
    if (this.ref) {
      try {
        const snap = await this.ref.once('value');
        const data = snap.val();
        if (data && typeof data === 'object') {
          this.parts = Object.values(data).map(PartModel.normalize).filter(Boolean);
          this._saveLocal();
          return;
        }
      } catch (e) {
        console.warn('PartService load Firebase failed, fallback to local:', e);
      }
    }

    // localStorage
    try {
      const raw = localStorage.getItem(this._key());
      if (!raw) {
        this.parts = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.parts = (parsed || []).map(PartModel.normalize).filter(Boolean);
      } else if (parsed && typeof parsed === 'object') {
        this.parts = Object.values(parsed).map(PartModel.normalize).filter(Boolean);
      } else {
        this.parts = [];
      }
    } catch (e) {
      this.parts = [];
    }
  }

  _saveLocal() {
    this._localDirty = true;
    const delay = (AppConfig?.system?.performance?.debounceDelay ?? 300);

    if (!this._localSaveHooked) {
      this._localSaveHooked = true;
      try {
        window.addEventListener('beforeunload', () => {
          try { this._flushLocalSave(); } catch (_) {}
        }, { capture: true });
      } catch (_) {}
      try {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            try { this._flushLocalSave(); } catch (_) {}
          }
        }, { capture: true });
      } catch (_) {}
    }

    try { if (this._localSaveTimer) clearTimeout(this._localSaveTimer); } catch (_) {}
    this._localSaveTimer = setTimeout(() => {
      this._localSaveTimer = null;
      try { this._saveLocalNow(); } catch (_) {}
    }, delay);
  }

  _flushLocalSave() {
    try { if (this._localSaveTimer) { clearTimeout(this._localSaveTimer); this._localSaveTimer = null; } } catch (_) {}
    try { this._saveLocalNow(); } catch (_) {}
  }

  _saveLocalNow() {
    if (!this._localDirty) return;
    this._localDirty = false;
    try {
      localStorage.setItem(this._key(), JSON.stringify(this.parts || []));
    } catch (e) {
      console.warn('PartService saveLocal failed:', e);
    }
  }

  reset() {
    try { if (this.ref && typeof this.ref.off === 'function') this.ref.off(); } catch (_) {}
    this.isInitialized = false;
    this.isFirebase = false;
    this.db = null;
    this.ref = null;
    this.parts = [];

    // PartService localStorage debounce
    this._localDirty = false;
    this._localSaveTimer = null;
    this._localSaveHooked = false;
  }

  async _persist() {
    this._saveLocal();
    if (this.ref) {
      try {
        const obj = {};
        (this.parts || []).forEach(p => {
          if (!p?.id) return;
          obj[p.id] = p;
        });
        await this.ref.set(obj);
      } catch (e) {
        console.warn('PartService persist Firebase failed:', e);
      }
    }
  }

  getAll() {
    return (this.parts || []).slice();
  }

  get(id) {
    return (this.parts || []).find(p => p.id === id) || null;
  }

  search(text) {
    const q = (text || '').toString().trim().toLowerCase();
    const rows = (this.parts || []).filter(p => p && p.isActive !== false);
    if (!q) return rows;
    return rows.filter(p => {
      const hay = `${p.name || ''} ${p.mpn || ''} ${p.vendor || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  async upsert(part) {
    await this.init();
    const normalized = PartModel.normalize({ ...part, updatedAt: PartModel.nowIso() });
    const idx = (this.parts || []).findIndex(p => p.id === normalized.id);
    if (idx >= 0) this.parts[idx] = normalized;
    else this.parts = [normalized, ...(this.parts || [])];
    await this._persist();
    return normalized;
  }

  async deactivate(id) {
    await this.init();
    const idx = (this.parts || []).findIndex(p => p.id === id);
    if (idx === -1) return;
    this.parts[idx] = PartModel.normalize({ ...this.parts[idx], isActive: false, updatedAt: PartModel.nowIso() });
    await this._persist();
  }
}

class RepairPartsService {
  constructor() {
    this.isInitialized = false;
    this.isFirebase = false;
    this.db = null;
    this.ref = null;

    // { [repairId]: RepairPart[] }
    this.byRepair = {};

    // RepairPartsService getAllItems cache
    this._itemsRev = 0;
    this._cacheAllItems = null;

    // RepairPartsService localStorage debounce
    this._localDirty = false;
    this._localSaveTimer = null;
    this._localSaveHooked = false;
  }

  _key() {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || 'unknown'));
    return `${prefix}repair_parts_${scope}`;
  }

  _touchItems() {
    this._itemsRev = (this._itemsRev || 0) + 1;
    this._cacheAllItems = null;
  }

  async init() {
    if (this.isInitialized) return;

    this.isFirebase = (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined');
    if (this.isFirebase) {
      this.db = firebase.database();
      const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || window.AuthSystem?.getCurrentUser?.()?.uid || '').toString();
      if (!uid) {
        console.warn('RepairPartsService init: missing uid, fallback to local mode');
        this.isFirebase = false;
      } else {
        const root = this.db.ref('data').child(uid);
        this._userRootRef = root;
        this.ref = root.child('repairParts');
      }
    }

    await this.loadAll();
    this.isInitialized = true;
    console.log('✅ RepairPartsService initialized');
  }

  reset() {
    try { if (this.ref && typeof this.ref.off === 'function') this.ref.off(); } catch (_) {}
    this.isInitialized = false;
    this.isFirebase = false;
    this.db = null;
    this.ref = null;
    this.byRepair = {};

    // RepairPartsService getAllItems cache
    this._itemsRev = 0;
    this._cacheAllItems = null;

    // RepairPartsService localStorage debounce
    this._localDirty = false;
    this._localSaveTimer = null;
    this._localSaveHooked = false;
  }

  async loadAll() {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const scope = (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || 'unknown'));
    const migratedKey = `${prefix}repair_parts_migrated_flat_${scope}`;

    const normalizeToByRepair = (raw) => {
      const out = {};
      if (!raw) return out;

      // A) 新結構：{ [repairId]: { [itemId]: item } } 或 { [repairId]: item[] }
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const topKeys = Object.keys(raw);
        // 偵測是否為「舊扁平結構」：{ [pushId]: { repairId, ... } }
        const looksFlat = topKeys.some(k => {
          const v = raw[k];
          return v && typeof v === 'object' && !Array.isArray(v) && !!(v.repairId || v.repair_id);
        });

        if (!looksFlat) {
          // 依 repairId 分群
          topKeys.forEach(rid => {
            const node = raw[rid];
            if (!node) return;

            // node 可能是 object(map) 或 array
            const arr = Array.isArray(node)
              ? node
              : (typeof node === 'object' ? Object.values(node) : []);

            const list = (arr || [])
              .map(it => RepairPartModel.normalize(rid, it))
              .filter(it => it && !it.isDeleted);

            if (list.length) out[rid] = list;
          });
          return out;
        }

        // B) 舊扁平結構：{ [pushId]: { repairId, ... } }
        topKeys.forEach(k => {
          const v = raw[k];
          if (!v || typeof v !== 'object') return;
          const rid = (v.repairId || v.repair_id || '').toString().trim();
          if (!rid) return;
          const item = { ...v };
          if (!item.id) item.id = (v.id || k).toString();
          const normalized = RepairPartModel.normalize(rid, item);
          if (!normalized || normalized.isDeleted) return;
          if (!out[rid]) out[rid] = [];
          out[rid].push(normalized);
        });

        // 依 updatedAt desc
        Object.keys(out).forEach(rid => {
          out[rid] = (out[rid] || []).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        });
        return out;
      }

      // C) local 可能是 array（舊版存法）：[ {repairId,...}, ... ]
      if (Array.isArray(raw)) {
        (raw || []).forEach((v, idx) => {
          if (!v || typeof v !== 'object') return;
          const rid = (v.repairId || v.repair_id || '').toString().trim();
          if (!rid) return;
          const item = { ...v };
          if (!item.id) item.id = (v.id || `legacy_${idx}`);
          const normalized = RepairPartModel.normalize(rid, item);
          if (!normalized || normalized.isDeleted) return;
          if (!out[rid]) out[rid] = [];
          out[rid].push(normalized);
        });
        Object.keys(out).forEach(rid => {
          out[rid] = (out[rid] || []).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        });
      }
      return out;
    };

    // Firebase 優先
    if (this.ref) {
      try {
        const snap = await this.ref.once('value');
        const data = snap.val();
        if (data && typeof data === 'object') {
          const out = normalizeToByRepair(data);
          this.byRepair = out;
          this._touchItems();
          this._saveLocal();

          // 若偵測到舊扁平結構，做一次性自動遷移（覆寫成新結構，避免之後更新/刪除失效）
          try {
            const alreadyMigrated = localStorage.getItem(migratedKey) === '1';
            const topKeys = Object.keys(data || {});
            const looksFlat = topKeys.some(k => {
              const v = data[k];
              return v && typeof v === 'object' && !Array.isArray(v) && !!(v.repairId || v.repair_id);
            });
            if (looksFlat && !alreadyMigrated) {
              const rootObj = {};
              Object.keys(out || {}).forEach(rid => {
                const obj = {};
                (out[rid] || []).forEach(it => {
                  if (!it?.id) return;
                  obj[it.id] = it;
                });
                rootObj[rid] = obj;
              });
              await this.ref.set(rootObj);
              try { localStorage.setItem(migratedKey, '1'); } catch (_) {}
            }
          } catch (e) {
            console.warn('RepairPartsService migration skipped/failed:', e);
          }

          return;
        }
      } catch (e) {
        console.warn('RepairPartsService loadAll Firebase failed, fallback to local:', e);
      }
    }

    // localStorage
    try {
      const raw = localStorage.getItem(this._key());
      if (!raw) {
        this.byRepair = {};
        this._touchItems();
        return;
      }
      const data = JSON.parse(raw);
      this.byRepair = normalizeToByRepair(data);
      this._touchItems();
    } catch (e) {
      this.byRepair = {};
      this._touchItems();
    }
  }

  _saveLocal() {
    this._localDirty = true;
    const delay = (AppConfig?.system?.performance?.debounceDelay ?? 300);

    if (!this._localSaveHooked) {
      this._localSaveHooked = true;
      try {
        window.addEventListener('beforeunload', () => {
          try { this._flushLocalSave(); } catch (_) {}
        }, { capture: true });
      } catch (_) {}
      try {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            try { this._flushLocalSave(); } catch (_) {}
          }
        }, { capture: true });
      } catch (_) {}
    }

    try { if (this._localSaveTimer) clearTimeout(this._localSaveTimer); } catch (_) {}
    this._localSaveTimer = setTimeout(() => {
      this._localSaveTimer = null;
      try { this._saveLocalNow(); } catch (_) {}
    }, delay);
  }

  _flushLocalSave() {
    try { if (this._localSaveTimer) { clearTimeout(this._localSaveTimer); this._localSaveTimer = null; } } catch (_) {}
    try { this._saveLocalNow(); } catch (_) {}
  }

  _saveLocalNow() {
    if (!this._localDirty) return;
    this._localDirty = false;
    try {
      localStorage.setItem(this._key(), JSON.stringify(this.byRepair || {}));
    } catch (e) {
      console.warn('RepairPartsService saveLocal failed:', e);
    }
  }

  async _persistRepair(repairId) {
    this._saveLocal();
    if (this.ref) {
      try {
        const rid = (repairId || '').toString().trim();
        const obj = {};
        (this.byRepair[rid] || []).forEach(it => {
          if (!it?.id) return;
          obj[it.id] = it;
        });
        await this.ref.child(rid).set(obj);
      } catch (e) {
        console.warn('RepairPartsService persist Firebase failed:', e);
      }
    }
    // 通知其他 UI（例如：維修卡片 chips / 機台歷史頁）更新
    try {
      window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'repairParts', repairId: (repairId || '').toString() } }));
    } catch (_) {}

  }

  getForRepair(repairId) {
    const rid = (repairId || '').toString().trim();
    return (this.byRepair[rid] || []).filter(it => it && !it.isDeleted).slice();
  }

  // 相容：RepairUI / 舊版呼叫名稱
  // - 先前 UI 端使用 listForRepair(repairId)
  // - 本服務正式 API 為 getForRepair(repairId)
  listForRepair(repairId) {
    return this.getForRepair(repairId);
  }
  getAllItems() {
    const rev = this._itemsRev || 0;
    if (this._cacheAllItems && this._cacheAllItems.rev === rev) return this._cacheAllItems.arr;

    const out = [];
    Object.keys(this.byRepair || {}).forEach(rid => {
      (this.byRepair[rid] || []).forEach(it => {
        if (it && !it.isDeleted) out.push(it);
      });
    });

    // 依 updatedAt desc
    out.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

    this._cacheAllItems = { rev, arr: out };
    return out;
  }

  // 相容：提供 getAll() 介面給 LinkageHelper / 其他模組使用給 LinkageHelper / 其他模組使用
  getAll() {
    return this.getAllItems();
  }

  search(text) {
    const q = (text || '').toString().trim().toLowerCase();
    const rows = this.getAllItems();
    if (!q) return rows;
    return rows.filter(it => {
      const hay = `${it.partName || ''} ${it.mpn || ''} ${it.vendor || ''} ${it.status || ''} ${it.repairId || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  async add(repairId, item) {
    await this.init();
    const rid = (repairId || '').toString().trim();
    if (!rid) throw new Error('repairId is required');

    const normalized = RepairPartModel.normalize(rid, {
      ...item,
      id: item?.id || RepairPartModel.newId('rpart'),
      createdAt: RepairPartModel.nowIso(),
      updatedAt: RepairPartModel.nowIso()
    });

    this.byRepair[rid] = [normalized, ...(this.byRepair[rid] || [])];
    this._touchItems();
    await this._persistRepair(rid);
    return normalized;
  }

  async update(repairId, itemId, patch) {
    await this.init();
    const rid = (repairId || '').toString().trim();
    const id = (itemId || '').toString().trim();
    const arr = this.byRepair[rid] || [];
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return;

    const updated = RepairPartModel.normalize(rid, {
      ...arr[idx],
      ...patch,
      id,
      repairId: rid,
      updatedAt: RepairPartModel.nowIso()
    });
    arr[idx] = updated;
    this.byRepair[rid] = arr;
    this._touchItems();
    await this._persistRepair(rid);
    return updated;
  }

  async remove(repairId, itemId) {
    // 軟刪除，保留追溯
    return this.update(repairId, itemId, { isDeleted: true });
  }

  // 以「維修單/案例」為單位刪除：同一 repairId 下所有用料追蹤一併標記為刪除
  async removeAllForRepair(repairId) {
    await this.init();
    const rid = (repairId || '').toString().trim();
    if (!rid) throw new Error('repairId is required');

    const arr = (this.byRepair[rid] || []).slice();
    if (!arr.length) return;

    const now = (window.RepairPartModel && typeof window.RepairPartModel.nowIso === 'function')
      ? window.RepairPartModel.nowIso()
      : new Date().toISOString();

    this.byRepair[rid] = arr.map(it => {
      const x = RepairPartModel.normalize(rid, it);
      return RepairPartModel.normalize(rid, { ...x, isDeleted: true, updatedAt: now });
    });

    this._touchItems();
    await this._persistRepair(rid);
  }
}

// 全域
const partService = new PartService();
const repairPartsService = new RepairPartsService();

if (typeof window !== 'undefined') {
  window.PartService = partService;
  try { window.AppRegistry?.register?.('PartService', partService); } catch (_) {}
  window.RepairPartsService = repairPartsService;
  try { window.AppRegistry?.register?.('RepairPartsService', repairPartsService); } catch (_) {}
}

console.log('✅ Parts Services loaded');
