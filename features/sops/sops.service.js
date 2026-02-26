/**
 * SOP Hub - Service
 * SOP-1（MVP）
 *
 * Firebase RTDB 位置（依使用者 scope 隔離）：
 * - data/<uid>/sophub/sops/{sopId}
 * - data/<uid>/sophub/versions/{sopId}/{version}
 *
 * 注意：versions 以「按需載入」為主，避免一次拉全量。
 */

class SOPService {
  constructor(){
    this.isInitialized = false;
    this.isFirebase = false;
    this.db = null;
    this.rootRef = null;

    this.sopsRef = null;
    this.versionsRef = null;

    this.sops = [];
    this._index = new Map();

    this._versionsCache = new Map(); // sopId -> { list:[], loadedAt:iso }
    this._listeners = [];

    this.cacheEnabled = true;

    // 雲端寫入逾時：避免 UI 卡住（毫秒）
    this.syncTimeoutMs = 3500;
  }

  _scope(){
    try {
      return (window.getUserScopeKey ? window.getUserScopeKey() : (window.currentUser?.uid || 'unknown'));
    } catch (_) {
      return 'unknown';
    }
  }

  _key(){
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_v161_';
    return `${prefix}sophub_${this._scope()}`;
  }

  _metaKey(){
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_v161_';
    return `${prefix}sophub_meta_${this._scope()}`;
  }

  _now(){
    try { return new Date().toISOString(); } catch (_) { return '' + Date.now(); }
  }

  _normalizeList(obj){
    const out = [];
    if (!obj || typeof obj !== 'object') return out;
    for (const [id, v] of Object.entries(obj)) {
      if (!v) continue;
      const item = Object.assign({}, v);
      if (!item.id) item.id = id;
      // search index
      try {
        if (!item._search) {
          const parts = [];
          for (const k of ['title','abstract','category','scopeCustomerId']) {
            if (item[k]) parts.push(String(item[k]));
          }
          if (Array.isArray(item.tags)) parts.push(item.tags.join(' '));
          item._search = parts.join(' ').toLowerCase();
        }
      } catch (_) {}
      out.push(item);
    }
    // updatedAt desc
    out.sort((a,b) => String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
    return out;
  }

  _rebuildIndex(){
    this._index.clear();
    for (const it of (this.sops || [])) {
      if (!it || !it.id) continue;
      this._index.set(String(it.id), it);
    }
  }

  loadFromLocalStorage(){
    if (!this.cacheEnabled) return false;
    try {
      const raw = localStorage.getItem(this._key());
      if (!raw) return false;
      const obj = JSON.parse(raw);
      const list = this._normalizeList(obj?.sops || {});
      this.sops = list;
      this._rebuildIndex();
      return true;
    } catch (_) {
      return false;
    }
  }

  saveToLocalStorage(){
    if (!this.cacheEnabled) return;
    try {
      const payload = { sops: {} };
      for (const it of (this.sops || [])) {
        if (!it || !it.id) continue;
        const copy = Object.assign({}, it);
        delete copy._search;
        payload.sops[it.id] = copy;
      }
      localStorage.setItem(this._key(), JSON.stringify(payload));
      localStorage.setItem(this._metaKey(), JSON.stringify({ savedAt: this._now() }));
    } catch (_) {}
  }

  async init(){
    if (this.isInitialized) return;

    this.isFirebase = (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined');
    if (this.isFirebase) {
      this.db = firebase.database();
      const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || window.AuthSystem?.getCurrentUser?.()?.uid || '').toString();
      const root = this.db.ref('data').child(uid).child('sophub');
      this.rootRef = root;
      this.sopsRef = root.child('sops');
      this.versionsRef = root.child('versions');
    }

    // 先用快取
    this.loadFromLocalStorage();

    if (this.isFirebase && this.sopsRef) {
      await this._loadSopsOnce();
      this._setupRealtime();
      this.saveToLocalStorage();
    }

    this.isInitialized = true;
    try { console.log('✅ SOPService initialized'); } catch (_) {}
  }

  async loadAll(){
    // SOP-1：init 已涵蓋；保留介面以符合 AppRegistry.ensureReady。
    return true;
  }

  async _loadSopsOnce(){
    try {
      const snap = await this.sopsRef.once('value');
      this.sops = this._normalizeList(snap.val());
      this._rebuildIndex();
    } catch (e) {
      console.warn('SOPService load sops failed:', e);
    }
  }

  _setupRealtime(){
    this.teardownRealtimeListeners();
    if (!this.sopsRef || typeof this.sopsRef.on !== 'function') return;

    const cb = (snap) => {
      try {
        this.sops = this._normalizeList(snap.val());
        this._rebuildIndex();
        this.saveToLocalStorage();
        try { window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'sops' } })); } catch (_) {}
      } catch (e) {
        console.warn('SOPService realtime handler failed:', e);
      }
    };

    try {
      this.sopsRef.on('value', cb);
      this._listeners.push({ ref: this.sopsRef, cb });
    } catch (e) {
      console.warn('SOPService attach listener failed:', e);
    }
  }

  teardownRealtimeListeners(){
    try {
      for (const it of (this._listeners || [])) {
        try { it.ref.off('value', it.cb); } catch (_) {}
      }
    } catch (_) {}
    this._listeners = [];
  }

  getAll(){
    return (this.sops || []).filter(s => !s?.isDeleted);
  }

  list(){
    return this.getAll();
  }

  get(id){
    const key = (id || '').toString().trim();
    if (!key) return null;
    return this._index.get(key) || null;
  }

  search(q){
    const kw = (q || '').toString().trim().toLowerCase();
    if (!kw) return this.getAll();
    return this.getAll().filter(s => String(s._search || '').includes(kw));
  }

  async upsertSop(data){
    const sop = window.SOPModel ? window.SOPModel.createSop(data) : (data || {});
    const v = window.SOPModel?.validateSop ? window.SOPModel.validateSop(sop) : { isValid: true, errors: [] };
    if (!v.isValid) throw new Error(v.errors.map(e => e.message).join(', '));

    const id = sop.id;
    if (this.sopsRef) {
      const p = this.sopsRef.child(id).set(sop);
      this._syncWithTimeout(p, { op: 'upsertSop', id, label: 'SOP 雲端同步' });
    }

    // 更新本地
    const idx = (this.sops || []).findIndex(x => x && x.id === id);
    if (idx >= 0) this.sops[idx] = Object.assign({}, sop);
    else this.sops.unshift(Object.assign({}, sop));
    this._rebuildIndex();
    this.saveToLocalStorage();

    try { window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'sops' } })); } catch (_) {}
    return sop;
  }

  async patchSop(id, patch){
    const key = (id || '').toString().trim();
    if (!key) throw new Error('缺少 sopId');

    const existing = this.get(key) || { id: key };
    const merged = Object.assign({}, existing, patch || {}, { id: key, updatedAt: this._now() });

    // 保持欄位一致
    const sop = window.SOPModel ? window.SOPModel.createSop(merged) : merged;

    if (this.sopsRef) {
      const p = this.sopsRef.child(key).update(sop);
      this._syncWithTimeout(p, { op: 'patchSop', id: key, label: 'SOP 雲端同步' });
    }

    const idx = (this.sops || []).findIndex(x => x && x.id === key);
    if (idx >= 0) this.sops[idx] = Object.assign({}, sop);
    else this.sops.unshift(Object.assign({}, sop));
    this._rebuildIndex();
    this.saveToLocalStorage();

    try { window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'sops' } })); } catch (_) {}
    return sop;
  }

  async removeSop(id){
    const key = (id || '').toString().trim();
    if (!key) return false;
    return await this.patchSop(key, { isDeleted: true });
  }

  async listVersions(sopId, { forceReload = false } = {}){
    const sid = (sopId || '').toString().trim();
    if (!sid) return [];

    const cached = this._versionsCache.get(sid);
    if (cached && !forceReload) return cached.list || [];

    if (!this.versionsRef) {
      this._versionsCache.set(sid, { list: [], loadedAt: this._now() });
      return [];
    }

    try {
      const snap = await this.versionsRef.child(sid).once('value');
      const obj = snap.val() || {};
      const list = [];
      for (const [k, v] of Object.entries(obj)) {
        if (!v) continue;
        const item = Object.assign({}, v);
        const ver = Number.isFinite(+item.version) ? parseInt(item.version, 10) : (Number.isFinite(+k) ? parseInt(k,10) : 0);
        item.version = ver || 0;
        list.push(item);
      }
      list.sort((a,b) => (b.version||0) - (a.version||0));
      this._versionsCache.set(sid, { list, loadedAt: this._now() });
      return list;
    } catch (e) {
      console.warn('SOPService listVersions failed:', e);
      this._versionsCache.set(sid, { list: [], loadedAt: this._now() });
      return [];
    }
  }

  async addVersion(sopId, versionData){
    const sid = (sopId || '').toString().trim();
    if (!sid) throw new Error('缺少 sopId');

    const vObj = window.SOPModel ? window.SOPModel.createVersion(versionData) : (versionData || {});
    const ver = Number.isFinite(+vObj.version) ? parseInt(vObj.version, 10) : 1;

    if (this.versionsRef) {
      await this.versionsRef.child(sid).child(String(ver)).set(vObj);
    }

    // 更新 sop latest
    const sop = this.get(sid);
    const latestVersion = Math.max(ver, Number.isFinite(+sop?.latestVersion) ? parseInt(sop.latestVersion, 10) : 0);

    const patch = {
      latestVersion,
      latestDriveFileId: (vObj.driveFileId || ''),
      latestDriveWebViewLink: (vObj.driveWebViewLink || ''),
      updatedAt: this._now()
    };

    await this.patchSop(sid, patch);

    // 更新 versions cache
    try {
      const list = await this.listVersions(sid, { forceReload: true });
      this._versionsCache.set(sid, { list, loadedAt: this._now() });
    } catch (_) {}

    return vObj;
  }
}

// 建立全域實例
const sopService = new SOPService();

// 輸出到全域
if (typeof window !== 'undefined') {
  try { window.AppRegistry?.register?.('SOPService', sopService); } catch (_) {}
}

try { console.log('✅ SOPService loaded'); } catch (_) {}
