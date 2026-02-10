/**
 * 知識庫（KB）- Service
 * KB-1（MVP）
 *
 * Firebase 儲存位置：data/<uid>/kb/{faqs,failureModes,sops,cases}
 * 本機快取：localStorage（依使用者 scope key 隔離）
 */


class KBService {
  constructor(){
    this.isInitialized = false;
    this.isFirebase = false;
    this.db = null;
    this.rootRef = null;

    this.refs = { faqs: null, failureModes: null, sops: null, cases: null };
    this._listeners = [];

    this.data = {
      faqs: [],
      failureModes: [],
      sops: [],
      cases: []
    };

    this._index = {
      faqs: new Map(),
      failureModes: new Map(),
      sops: new Map(),
      cases: new Map()
    };

    this.cacheEnabled = true;
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
    return `${prefix}kb_${this._scope()}`;
  }

  _metaKey(){
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_v161_';
    return `${prefix}kb_meta_${this._scope()}`;
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
      // 建立搜尋索引（避免 UI 每次計算）
      try {
        if (!item._search) {
          const parts = [];
          for (const k of ['title','question','answer','symptom','rootCause','solution','content','steps','notes']) {
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

  _rebuildIndex(key){
    const k = (key || '').toString();
    const list = this.data[k] || [];
    const map = this._index[k] || new Map();
    map.clear();
    for (const it of list) {
      if (!it || !it.id) continue;
      map.set(String(it.id), it);
    }
  }

  _setData(key, list){
    const k = (key || '').toString();
    this.data[k] = Array.isArray(list) ? list : [];
    this._rebuildIndex(k);
  }

  loadFromLocalStorage(){
    try {
      const raw = localStorage.getItem(this._key());
      if (!raw) return false;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return false;
      for (const k of ['faqs','failureModes','sops','cases']) {
        this._setData(k, Array.isArray(obj[k]) ? obj[k] : []);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  saveToLocalStorage(){
    if (!this.cacheEnabled) return;
    try {
      const payload = {
        faqs: this.data.faqs || [],
        failureModes: this.data.failureModes || [],
        sops: this.data.sops || [],
        cases: this.data.cases || []
      };
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
      const root = this.db.ref('data').child(uid).child('kb');
      this.rootRef = root;
      this.refs.faqs = root.child('faqs');
      this.refs.failureModes = root.child('failureModes');
      this.refs.sops = root.child('sops');
      this.refs.cases = root.child('cases');
    }

    // 先用本機快取（畫面更快可用）
    this.loadFromLocalStorage();

    if (this.isFirebase && this.rootRef) {
      await this._loadFromFirebaseOnce();
      this._setupRealtime();
      this.saveToLocalStorage();
    }

    this.isInitialized = true;
    try { console.log('✅ KBService initialized'); } catch (_) {}
  }

  async _loadFromFirebaseOnce(){
    const keys = ['faqs','failureModes','sops','cases'];
    for (const k of keys) {
      const ref = this.refs[k];
      if (!ref) continue;
      try {
        const snap = await ref.once('value');
        const list = this._normalizeList(snap.val());
        this._setData(k, list);
      } catch (e) {
        console.warn('KBService load failed:', k, e);
      }
    }
  }

  _setupRealtime(){
    this.teardownRealtimeListeners();
    const keys = ['faqs','failureModes','sops','cases'];
    for (const k of keys) {
      const ref = this.refs[k];
      if (!ref || typeof ref.on !== 'function') continue;
      const cb = (snap) => {
        try {
          const list = this._normalizeList(snap.val());
          this._setData(k, list);
          this.saveToLocalStorage();
          try { window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'kb', type: k } })); } catch (_) {}
        } catch (e) {
          console.warn('KB realtime handler failed:', k, e);
        }
      };
      try {
        ref.on('value', cb);
        this._listeners.push({ ref, cb });
      } catch (e) {
        console.warn('KB attach listener failed:', k, e);
      }
    }
  }

  teardownRealtimeListeners(){
    try {
      for (const it of this._listeners) {
        try { it.ref && it.cb && it.ref.off('value', it.cb); } catch (_) {}
      }
    } catch (_) {}
    this._listeners = [];
  }

  reset(){
    try { this.teardownRealtimeListeners(); } catch (_) {}
    this.isInitialized = false;
    this.db = null;
    this.rootRef = null;
    this.refs = { faqs: null, failureModes: null, sops: null, cases: null };
    this.data = { faqs: [], failureModes: [], sops: [], cases: [] };
    this._index = { faqs: new Map(), failureModes: new Map(), sops: new Map(), cases: new Map() };
  }

  // =========================
  // Query helpers
  // =========================
  _mapKey(type){
    const t = (type || '').toString().trim().toLowerCase();
    if (t === 'faq' || t === 'faqs') return 'faqs';
    if (t === 'failure' || t === 'failuremodes' || t === 'failureModes') return 'failureModes';
    if (t === 'sop' || t === 'sops') return 'sops';
    if (t === 'case' || t === 'cases') return 'cases';
    return 'faqs';
  }

  getAll(type){
    const k = this._mapKey(type);
    return (this.data[k] || []).slice();
  }

  getById(type, id){
    const k = this._mapKey(type);
    const m = this._index[k];
    if (!m) return null;
    return m.get(String(id)) || null;
  }

  getTags(type){
    const k = this._mapKey(type);
    const set = new Set();
    const list = this.data[k] || [];
    for (const it of list) {
      const tags = Array.isArray(it.tags) ? it.tags : [];
      for (const t of tags) {
        const s = String(t || '').trim();
        if (s) set.add(s);
      }
    }
    return Array.from(set).sort((a,b) => a.localeCompare(b,'zh-Hant'));
  }

  // =========================
  // CRUD
  // =========================
  _newId(){
    const p = 'KB';
    const rnd = Math.random().toString(16).slice(2, 8).toUpperCase();
    const ts = Date.now().toString(36).toUpperCase();
    return `${p}-${ts}-${rnd}`;
  }

  _who(){
    try {
      const u = window.currentUser || window.AuthSystem?.getCurrentUser?.() || window.AppState?.getCurrentUser?.();
      return (u?.displayName || u?.email || u?.uid || 'unknown').toString();
    } catch (_) {
      return 'unknown';
    }
  }

  _normalizeTags(input){
    const raw = (input || '').toString().split(',').map(s => s.trim()).filter(Boolean);
    const set = new Set();
    raw.forEach(t => set.add(t));
    return Array.from(set);
  }

  _buildSearch(item){
    try {
      const parts = [];
      for (const k of ['title','question','answer','symptom','rootCause','solution','content','steps','notes']) {
        if (item[k]) parts.push(String(item[k]));
      }
      if (Array.isArray(item.tags)) parts.push(item.tags.join(' '));
      return parts.join(' ').toLowerCase();
    } catch (_) {
      return '';
    }
  }

  async upsert(type, payload){
    const k = this._mapKey(type);
    const id = (payload && payload.id) ? String(payload.id) : this._newId();
    const now = this._now();
    const prev = this.getById(k, id);

    const item = Object.assign({}, prev || {}, payload || {});
    item.id = id;
    item.updatedAt = now;
    if (!item.createdAt) item.createdAt = now;
    if (!item.createdBy) item.createdBy = this._who();
    item.updatedBy = this._who();

    // tags
    if (typeof item.tags === 'string') item.tags = this._normalizeTags(item.tags);
    if (!Array.isArray(item.tags)) item.tags = [];

    item._search = this._buildSearch(item);

    // 寫入 Firebase
    if (this.isFirebase && this.refs[k]) {
      await this.refs[k].child(id).set(item);
    } else {
      // 本機模式：直接更新記憶體
      const list = this.data[k] || [];
      const idx = list.findIndex(x => x && String(x.id) === id);
      if (idx >= 0) list[idx] = item;
      else list.unshift(item);
      list.sort((a,b) => String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
      this._setData(k, list);
      this.saveToLocalStorage();
      try { window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'kb', type: k } })); } catch (_) {}
    }

    return item;
  }

  async remove(type, id){
    const k = this._mapKey(type);
    const rid = String(id || '').trim();
    if (!rid) return;

    if (this.isFirebase && this.refs[k]) {
      await this.refs[k].child(rid).remove();
      return;
    }

    const list = this.data[k] || [];
    const next = list.filter(x => x && String(x.id) !== rid);
    this._setData(k, next);
    this.saveToLocalStorage();
    try { window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'kb', type: k } })); } catch (_) {}
  }
}

const kbService = new KBService();
if (typeof window !== 'undefined') {

  try { window.AppRegistry?.register?.('KBService', kbService); } catch (_) {}
}

try { console.log('✅ KBService loaded'); } catch (_) {}
