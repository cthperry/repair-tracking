/**
 * 機台保養管理（Maintenance）- Service
 * MNT-1（MVP）
 *
 * Firebase 儲存位置：data/<uid>/maintenance/{equipments,records,settings}
 * 本機快取：localStorage（依使用者 scope key 隔離）
 */

(function(){
  'use strict';

  const toStr = (v) => (v === null || v === undefined) ? '' : String(v);

  const DEFAULT_SETTINGS = Object.freeze({
    emailTo: '',
    // 預設提醒天數（可被設備層級 remindDays 覆寫）
    defaultRemindDays: [3, 7],
    // 是否優先使用設備的負責人 Email（ownerEmail）寄送提醒
    useOwnerEmail: false,
    // 額外抄送（可選）
    emailCc: '',

    // MNT-4：自動 Email（非 mailto）
    // - 需搭配 Cloud Functions / 外部排程實作真正寄信
    // - 前端仍保留 mailto 作為手動備援
    autoEmailEnabled: false,
    // 是否在提醒 Email 內包含「尚無紀錄」設備（建議：若會造成噪音可關閉）
    autoEmailIncludeNoRecord: true
  });

  function getUid(){
    try { return (window.AppState?.getUid?.() || window.currentUser?.uid || window.AuthSystem?.getCurrentUser?.()?.uid || '').toString(); } catch (_) { return ''; }
  }

  function getScopeKey(){
    try {
      if (window.AppState?.getScopeKey) return window.AppState.getScopeKey();
      if (window.getUserScopeKey) return window.getUserScopeKey();
      const uid = getUid();
      return uid || 'unknown';
    } catch (_) {
      return 'unknown';
    }
  }

  function dispatchChanged(type){
    try { window.dispatchEvent(new CustomEvent('data:changed', { detail: { module: 'maintenance', type: type || '' } })); } catch (_) {}
  }

  function ymdToDate(ymd){
    const s = toStr(ymd).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y,m,d] = s.split('-').map(n => parseInt(n,10));
    // 使用 local date (瀏覽器時區)；本系統以 Asia/Taipei 為主，local 在台灣使用通常一致
    const dt = new Date(y, (m||1)-1, d||1, 12, 0, 0, 0);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }

  function dateToYMD(dt){
    if (!(dt instanceof Date)) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const d = String(dt.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function addCycle(ymd, every, unit){
    const base = ymdToDate(ymd);
    if (!base) return '';
    const e = Math.max(1, parseInt(every,10) || 30);
    const u = toStr(unit).trim().toLowerCase();

    const dt = new Date(base.getTime());
    if (u === 'week') {
      dt.setDate(dt.getDate() + (7 * e));
    } else if (u === 'month') {
      const origDay = dt.getDate();
      dt.setMonth(dt.getMonth() + e);
      // 避免月末溢出（例如 1/31 + 1 month -> 3/3），做一次修正：
      if (dt.getDate() < origDay) {
        // 回到該月最後一天
        dt.setDate(0);
      }
    } else {
      dt.setDate(dt.getDate() + e);
    }
    return dateToYMD(dt);
  }

  function diffDays(fromYmd, toYmd){
    const a = ymdToDate(fromYmd);
    const b = ymdToDate(toYmd);
    if (!a || !b) return NaN;
    const ms = b.getTime() - a.getTime();
    return Math.floor(ms / 86400000);
  }

  class MaintenanceService {
    constructor(){
      this.isInitialized = false;
      this.isFirebase = false;
      this.db = null;
      this.rootRef = null;

      this.refs = { equipments: null, records: null, settings: null };
      this._listeners = [];

      this.data = {
        equipments: [],
        records: [],
        settings: Object.assign({}, DEFAULT_SETTINGS)
      };

      this._index = {
        equipments: new Map(),
        records: new Map()
      };

      this.cacheEnabled = true;
    }

    _key(){
      const prefix = window.AppConfig?.system?.storage?.prefix || 'repair_tracking_v161_';
      return `${prefix}maintenance_${getScopeKey()}`;
    }

    _metaKey(){
      const prefix = window.AppConfig?.system?.storage?.prefix || 'repair_tracking_v161_';
      return `${prefix}maintenance_meta_${getScopeKey()}`;
    }

    _normalizeList(obj){
      const out = [];
      if (!obj || typeof obj !== 'object') return out;
      for (const [id, v] of Object.entries(obj)) {
        if (!v) continue;
        const item = Object.assign({}, v);
        if (!item.id) item.id = id;
        out.push(item);
      }
      out.sort((a,b) => String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
      return out;
    }

    _rebuildIndex(kind){
      const k = toStr(kind).trim();
      const list = this.data[k] || [];
      const map = this._index[k] || new Map();
      map.clear();
      for (const it of list) {
        if (it && it.id) map.set(String(it.id), it);
      }
    }

    _setData(kind, list){
      const k = toStr(kind).trim();
      this.data[k] = Array.isArray(list) ? list : [];
      this._rebuildIndex(k);
    }

    loadFromLocalStorage(){
      try {
        const raw = localStorage.getItem(this._key());
        if (!raw) return false;
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== 'object') return false;
        this._setData('equipments', Array.isArray(obj.equipments) ? obj.equipments : []);
        this._setData('records', Array.isArray(obj.records) ? obj.records : []);
        this.data.settings = (obj.settings && typeof obj.settings === 'object') ? obj.settings : {};
        this._ensureSettingsDefaults();
        return true;
      } catch (_) {
        return false;
      }
    }

    saveToLocalStorage(){
      if (!this.cacheEnabled) return;
      try {
        const payload = {
          equipments: this.data.equipments || [],
          records: this.data.records || [],
          settings: this.data.settings || { emailTo: '' }
        };
        localStorage.setItem(this._key(), JSON.stringify(payload));
        localStorage.setItem(this._metaKey(), JSON.stringify({ savedAt: new Date().toISOString() }));
      } catch (_) {}
    }

    async init(){
      if (this.isInitialized) return;

      this.isFirebase = (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined');

      // 快取優先
      this.loadFromLocalStorage();
      this._ensureSettingsDefaults();

      if (this.isFirebase) {
        try {
          this.db = firebase.database();
          const uid = getUid();
          this.rootRef = this.db.ref('data').child(uid).child('maintenance');
          this.refs.equipments = this.rootRef.child('equipments');
          this.refs.records = this.rootRef.child('records');
          this.refs.settings = this.rootRef.child('settings');

          await this._loadFromFirebaseOnce();
          this._setupRealtime();
          this.saveToLocalStorage();
        } catch (e) {
          console.warn('MaintenanceService init firebase failed:', e);
        }
      }

      this.isInitialized = true;
      try { console.log('✅ MaintenanceService initialized'); } catch (_) {}
    }

    async _loadFromFirebaseOnce(){
      const keys = ['equipments','records'];
      for (const k of keys) {
        const ref = this.refs[k];
        if (!ref) continue;
        try {
          const snap = await ref.once('value');
          const list = this._normalizeList(snap.val());
          this._setData(k, list);
        } catch (e) {
          console.warn('Maintenance load failed:', k, e);
        }
      }

      // settings
      try {
        const sref = this.refs.settings;
        if (sref) {
          const snap = await sref.once('value');
          const v = snap.val();
          this.data.settings = (v && typeof v === 'object') ? v : {};
          this._ensureSettingsDefaults();
        }
      } catch (e) {
        console.warn('Maintenance settings load failed:', e);
      }
    }

    _setupRealtime(){
      this.teardownRealtimeListeners();
      const keys = ['equipments','records'];
      for (const k of keys) {
        const ref = this.refs[k];
        if (!ref || typeof ref.on !== 'function') continue;
        const cb = (snap) => {
          try {
            const list = this._normalizeList(snap.val());
            this._setData(k, list);
            this.saveToLocalStorage();
            dispatchChanged(k);
          } catch (e) {
            console.warn('Maintenance realtime failed:', k, e);
          }
        };
        try {
          ref.on('value', cb);
          this._listeners.push({ ref, cb });
        } catch (e) {
          console.warn('Maintenance attach listener failed:', k, e);
        }
      }

      // settings
      const sref = this.refs.settings;
      if (sref && typeof sref.on === 'function') {
        const cb = (snap) => {
          try {
            const v = snap.val();
            this.data.settings = (v && typeof v === 'object') ? v : {};
            this._ensureSettingsDefaults();
            this.saveToLocalStorage();
            dispatchChanged('settings');
          } catch (_) {}
        };
        try {
          sref.on('value', cb);
          this._listeners.push({ ref: sref, cb });
        } catch (_) {}
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
      this.isFirebase = false;
      this.db = null;
      this.rootRef = null;
      this.refs = { equipments: null, records: null, settings: null };
      this.data = { equipments: [], records: [], settings: Object.assign({}, DEFAULT_SETTINGS) };
      this._index = { equipments: new Map(), records: new Map() };
    }

    _ensureSettingsDefaults(){
      try {
        const cur = (this.data && this.data.settings && typeof this.data.settings === 'object') ? this.data.settings : {};
        const next = Object.assign({}, DEFAULT_SETTINGS, cur);

        // 正規化 defaultRemindDays
        const arr = Array.isArray(next.defaultRemindDays) ? next.defaultRemindDays : DEFAULT_SETTINGS.defaultRemindDays;
        const days = arr.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0);
        next.defaultRemindDays = days.length ? Array.from(new Set(days)).sort((a,b)=>a-b).slice(0, 3) : [3, 7];

        next.useOwnerEmail = !!next.useOwnerEmail;
        next.emailTo = toStr(next.emailTo).trim();
        next.emailCc = toStr(next.emailCc).trim();

        // MNT-4：自動 Email（Cloud Functions / 外部排程）
        next.autoEmailEnabled = !!next.autoEmailEnabled;
        next.autoEmailIncludeNoRecord = !!next.autoEmailIncludeNoRecord;

        this.data.settings = next;
      } catch (_) {
        this.data.settings = Object.assign({}, DEFAULT_SETTINGS);
      }
    }

    // =========================
    // Settings
    // =========================
    getSettings(){
      this._ensureSettingsDefaults();
      return this.data.settings || Object.assign({}, DEFAULT_SETTINGS);
    }

    async updateSettings(partial){
      const cur = this.getSettings();
      const next = Object.assign({}, cur, partial || {});
      this.data.settings = next;
      this._ensureSettingsDefaults();
      this.saveToLocalStorage();
      dispatchChanged('settings');

      if (this.isFirebase && this.refs.settings) {
        await this.refs.settings.set(next);
      }
      return next;
    }

    // =========================
    // Equipments
    // =========================
    getEquipments(){
      return (this.data.equipments || []).filter(x => x && !x.isDeleted);
    }

    getEquipmentById(id){
      const key = toStr(id).trim();
      if (!key) return null;
      return this._index.equipments.get(key) || null;
    }

    async upsertEquipment(input){
      await this.init();
      const exist = input?.id ? this.getEquipmentById(input.id) : null;
      const eq = window.MaintenanceModel?.normalizeEquipment
        ? window.MaintenanceModel.normalizeEquipment(input, exist)
        : Object.assign({}, exist||{}, input||{});

      // 簡單唯一性檢查：equipmentNo 不可重複（MVP）
      try {
        const no = toStr(eq.equipmentNo).trim();
        if (no) {
          const dup = this.getEquipments().find(x => x && x.equipmentNo === no && String(x.id) !== String(eq.id));
          if (dup) throw new Error('設備編號已存在');
        }
      } catch (e) {
        throw e;
      }

      this._upsertLocal('equipments', eq);
      this.saveToLocalStorage();
      dispatchChanged('equipments');

      if (this.isFirebase && this.refs.equipments) {
        await this.refs.equipments.child(eq.id).set(eq);
      }
      return eq;
    }

    async removeEquipment(id){
      await this.init();
      const exist = this.getEquipmentById(id);
      if (!exist) return;
      const eq = Object.assign({}, exist, { isDeleted: true, updatedAt: window.MaintenanceModel?.nowISO?.() || new Date().toISOString() });
      this._upsertLocal('equipments', eq);
      this.saveToLocalStorage();
      dispatchChanged('equipments');

      if (this.isFirebase && this.refs.equipments) {
        await this.refs.equipments.child(eq.id).set(eq);
      }
    }

    // =========================
    // Records
    // =========================
    getRecords(){
      return (this.data.records || []).filter(x => x && !x.isDeleted);
    }

    getRecordById(id){
      const key = toStr(id).trim();
      if (!key) return null;
      return this._index.records.get(key) || null;
    }

    async upsertRecord(input){
      await this.init();
      const exist = input?.id ? this.getRecordById(input.id) : null;

      const eq = input?.equipmentId ? this.getEquipmentById(input.equipmentId) : null;
      const rec = window.MaintenanceModel?.normalizeRecord
        ? window.MaintenanceModel.normalizeRecord(input, eq, exist)
        : Object.assign({}, exist||{}, input||{});

      if (!toStr(rec.equipmentId).trim()) {
        // 嘗試由 equipmentNo 找回 equipmentId
        const no = toStr(rec.equipmentNo).trim();
        if (no) {
          const match = this.getEquipments().find(x => x && x.equipmentNo === no);
          if (match) rec.equipmentId = match.id;
        }
      }

      this._upsertLocal('records', rec);
      this.saveToLocalStorage();
      dispatchChanged('records');

      if (this.isFirebase && this.refs.records) {
        await this.refs.records.child(rec.id).set(rec);
      }
      return rec;
    }

    async removeRecord(id){
      await this.init();
      const exist = this.getRecordById(id);
      if (!exist) return;
      const rec = Object.assign({}, exist, { isDeleted: true, updatedAt: window.MaintenanceModel?.nowISO?.() || new Date().toISOString() });
      this._upsertLocal('records', rec);
      this.saveToLocalStorage();
      dispatchChanged('records');

      if (this.isFirebase && this.refs.records) {
        await this.refs.records.child(rec.id).set(rec);
      }
    }

    // =========================
    // Reminders / Stats
    // =========================
    _lastRecordYMDForEquipment(eq){
      const id = eq?.id;
      if (!id) return '';
      const recs = this.getRecords().filter(r => r && (String(r.equipmentId||'') === String(id)));
      recs.sort((a,b) => String(b.performedAt||'').localeCompare(String(a.performedAt||'')));
      return toStr(recs[0]?.performedAt).trim();
    }

    getDueInfo(eq){
      const equipment = eq || {};
      const today = window.MaintenanceModel?.todayYMD ? window.MaintenanceModel.todayYMD() : (new Date().toISOString().slice(0,10));
      const lastYMD = this._lastRecordYMDForEquipment(equipment);

      const installYMD = toStr(equipment.installDate).trim();

      const settings = this.getSettings();
      const remindDays = this._getRemindDaysForEquipment(equipment, settings);
      const r1 = Number.isFinite(remindDays[0]) ? remindDays[0] : 3;
      const r2 = Number.isFinite(remindDays[1]) ? remindDays[1] : 7;

      const every = equipment.cycleEvery || 30;
      const unit = equipment.cycleUnit || 'day';

      // 基準日期：優先取「最近一次保養」；若尚無紀錄但有安裝日期，則以安裝日期作為基準；都沒有則回傳 noRecord
      const baseYMD = lastYMD || (installYMD && /^\d{4}-\d{2}-\d{2}$/.test(installYMD) ? installYMD : '');
      const hasRecord = !!lastYMD;

      if (!baseYMD) {
        return { status: 'noRecord', hasRecord: false, baseYMD: '', lastYMD: '', nextDue: '', diff: NaN, cycleEvery: every, cycleUnit: unit, remind1: r1, remind2: r2 };
      }

      const nextDue = addCycle(baseYMD, every, unit);
      const d = diffDays(today, nextDue); // today -> due

      let status = 'ok';
      if (Number.isFinite(d)) {
        if (d < 0) status = 'overdue';
        else if (d <= r1) status = 'dueSoon1';
        else if (d <= r2) status = 'dueSoon2';
      }

      return {
        status,
        hasRecord,
        baseYMD,
        lastYMD,
        nextDue,
        diff: d,
        cycleEvery: every,
        cycleUnit: unit,
        remind1: r1,
        remind2: r2,
        installDate: installYMD
      };
    }

    _getRemindDaysForEquipment(eq, settings){
      try {
        const list = Array.isArray(eq?.remindDays) ? eq.remindDays : (Array.isArray(settings?.defaultRemindDays) ? settings.defaultRemindDays : [3, 7]);
        const days = list.map(n => parseInt(n,10)).filter(n => Number.isFinite(n) && n >= 0);
        const uniq = Array.from(new Set(days)).sort((a,b)=>a-b);
        if (uniq.length === 0) return [3, 7];
        if (uniq.length === 1) return [uniq[0], Math.max(uniq[0], 7)];
        return uniq.slice(0, 3);
      } catch (_) {
        return [3, 7];
      }
    }

    getDueList(){
      const eqs = this.getEquipments();
      const rows = eqs.map(eq => ({ equipment: eq, due: this.getDueInfo(eq) }));

      const rank = (s) => {
        if (s === 'overdue') return 1;
        if (s === 'dueSoon1') return 2;
        if (s === 'dueSoon2') return 3;
        if (s === 'noRecord') return 4;
        return 9;
      };

      rows.sort((a,b) => {
        const ra = rank(a.due.status);
        const rb = rank(b.due.status);
        if (ra !== rb) return ra - rb;
        return String(a.due.nextDue || '9999-99-99').localeCompare(String(b.due.nextDue || '9999-99-99'));
      });

      return rows;
    }

    getStats(){
      const list = this.getDueList();
      const total = list.length;
      let overdue = 0, dueSoon = 0, noRecord = 0, ok = 0;
      for (const r of list) {
        const s = r?.due?.status;
        if (s === 'overdue') overdue++;
        else if (s === 'dueSoon1' || s === 'dueSoon2') dueSoon++;
        else if (s === 'noRecord') noRecord++;
        else ok++;
      }
      const compliance = total > 0 ? Math.round(((total - overdue - noRecord) / total) * 1000) / 10 : 0;
      return { total, overdue, dueSoon, noRecord, ok, compliance };
    }

    // =========================
    // Reports helpers (MNT-2)
    // =========================
    getLocationStats(){
      const rows = this.getDueList();
      const map = new Map();
      const push = (key, dueStatus) => {
        const k = toStr(key).trim() || '（未填）';
        if (!map.has(k)) map.set(k, { key: k, total: 0, overdue: 0, dueSoon: 0, noRecord: 0, ok: 0 });
        const it = map.get(k);
        it.total += 1;
        if (dueStatus === 'overdue') it.overdue += 1;
        else if (dueStatus === 'dueSoon1' || dueStatus === 'dueSoon2') it.dueSoon += 1;
        else if (dueStatus === 'noRecord') it.noRecord += 1;
        else it.ok += 1;
      };
      for (const r of rows) {
        push(r?.equipment?.location, r?.due?.status);
      }
      return Array.from(map.values()).sort((a,b)=>b.total - a.total || a.key.localeCompare(b.key));
    }

    getOwnerStats(){
      const rows = this.getDueList();
      const map = new Map();
      const push = (key, dueStatus) => {
        const k = toStr(key).trim() || '（未填）';
        if (!map.has(k)) map.set(k, { key: k, total: 0, overdue: 0, dueSoon: 0, noRecord: 0, ok: 0 });
        const it = map.get(k);
        it.total += 1;
        if (dueStatus === 'overdue') it.overdue += 1;
        else if (dueStatus === 'dueSoon1' || dueStatus === 'dueSoon2') it.dueSoon += 1;
        else if (dueStatus === 'noRecord') it.noRecord += 1;
        else it.ok += 1;
      };
      for (const r of rows) {
        push(r?.equipment?.owner, r?.due?.status);
      }
      return Array.from(map.values()).sort((a,b)=>b.total - a.total || a.key.localeCompare(b.key));
    }

    getMonthlyRecordCounts(months){
      const n = Math.max(1, parseInt(months, 10) || 6);
      const recs = this.getRecords();
      const now = new Date();
      const keys = [];
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1, 12, 0, 0, 0);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2,'0');
        keys.push(`${y}-${m}`);
      }
      const map = new Map(keys.map(k => [k, 0]));
      for (const r of recs) {
        const ymd = toStr(r?.performedAt).trim();
        const mk = ymd.slice(0, 7);
        if (map.has(mk)) map.set(mk, (map.get(mk) || 0) + 1);
      }
      return keys.map(k => ({ month: k, count: map.get(k) || 0 }));
    }

    // =========================
    // Internal
    // =========================
    _upsertLocal(kind, item){
      const k = toStr(kind).trim();
      const list = this.data[k] || [];
      const id = toStr(item?.id).trim();
      if (!id) return;
      const idx = list.findIndex(x => String(x?.id) === id);
      if (idx >= 0) list[idx] = item;
      else list.push(item);
      list.sort((a,b) => String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
      this.data[k] = list;
      this._rebuildIndex(k);
    }
  }

  const maintenanceService = new MaintenanceService();

  try { window.AppRegistry?.register?.('MaintenanceService', maintenanceService); } catch (_) {}
  try { console.log('✅ MaintenanceService loaded'); } catch (_) {}
})();
