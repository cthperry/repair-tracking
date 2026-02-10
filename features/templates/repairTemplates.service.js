/**
 * 維修單模板 - Service
 * V161.105
 * Storage:
 *   RTDB: data/<uid>/meta/repairTemplates
 *   localStorage: RT_<userScope>_repairTemplates
 */
(function(){
  'use strict';

  class RepairTemplatesService {
    constructor(){
      this._uid = null;
      this._ref = null;
      this._cache = []; // array of templates
      this._byId = new Map();
      this._unsub = null;
      this._onChange = new Set();
      this._lsKey = null;
      this._ready = false;
    }

    get uid(){ return this._uid; }
    get ready(){ return this._ready; }

    _scopeKey(){
      try{
        if(typeof window.getUserScopeKey === 'function') return window.getUserScopeKey();
      }catch(_){}
      const u = (window.AppState?.getCurrentUser?.() || window.currentUser);
      return (u && u.uid) ? u.uid : 'unknown';
    }

    _buildLsKey(){
      return `RT_${this._scopeKey()}_repairTemplates`;
    }

    async init(){
      const u = (window.AppState?.getCurrentUser?.() || window.currentUser);
      this._uid = (u && u.uid) ? u.uid : null;
      this._lsKey = this._buildLsKey();
      this._ready = false;

      await this._loadFromLocal();

      if(window.firebase && this._uid){
        this._ref = firebase.database().ref(`data/${this._uid}/meta/repairTemplates`);
        this._setupRealtime();
      }
      this._ready = true;
      this._emit();
    }

    reset(){
      this._uid = null;
      this._ref = null;
      this._cache = [];
      this._byId = new Map();
      this._ready = false;
      this._teardownRealtime();
      this._emit();
    }

    teardownRealtimeListeners(){
      this._teardownRealtime();
    }

    _teardownRealtime(){
      try{
        if(this._unsub && this._ref) this._ref.off('value', this._unsub);
      }catch(_){}
      this._unsub = null;
    }

    _setupRealtime(){
      if(!this._ref) return;
      this._teardownRealtime();
      this._unsub = (snap)=>{
        const v = snap.val() || {};
        const arr = Object.keys(v).map(k => ({...v[k], id:k}));
        this._setCache(arr, true);
      };
      this._ref.on('value', this._unsub);
    }

    _setCache(arr, fromRemote){
      const list = (arr||[]).map(t => window.RepairTemplateModel.normalize(t)).filter(Boolean);
      // keep stable sort by updatedAt desc
      list.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
      this._cache = list;
      this._byId = new Map(list.map(x=>[x.id,x]));
      if(!fromRemote) this._saveToLocal();
      this._emit();
    }

    _saveToLocal(){
      try{
        if(!this._lsKey) this._lsKey = this._buildLsKey();
        localStorage.setItem(this._lsKey, JSON.stringify(this._cache));
      }catch(_){}
    }

    async _loadFromLocal(){
      try{
        if(!this._lsKey) this._lsKey = this._buildLsKey();
        const raw = localStorage.getItem(this._lsKey);
        if(raw){
          const arr = JSON.parse(raw);
          if(Array.isArray(arr)){
            this._setCache(arr, true);
          }
        }
      }catch(_){}
    }

    onChange(fn){
      if(typeof fn==='function') this._onChange.add(fn);
      return ()=>this._onChange.delete(fn);
    }

    _emit(){
      for(const fn of Array.from(this._onChange)){
        try{ fn(this._cache); }catch(_){}
      }
    }

    getAll(){
      return this._cache.slice();
    }

    getEnabled(){
      return this._cache.filter(t=>t.enabled);
    }

    getById(id){
      return this._byId.get(id) || null;
    }

    async upsert(template){
      const t = window.RepairTemplateModel.normalize(template);
      if(!t) return null;

      // local update first (optimistic)
      const next = this._cache.filter(x=>x.id!==t.id);
      next.unshift(t);
      this._setCache(next, false);

      // remote
      if(this._ref){
        const payload = {...t};
        delete payload.id; // id as key
        await this._ref.child(t.id).set(payload);
      }
      return t;
    }

    async remove(id){
      if(!id) return;
      const next = this._cache.filter(x=>x.id!==id);
      this._setCache(next, false);
      if(this._ref){
        await this._ref.child(id).remove();
      }
    }

    async clone(id){
      const t = this.getById(id);
      if(!t) return null;
      const copy = window.RepairTemplateModel.create({
        ...t,
        id: null,
        name: `${t.name} (複製)`,
        createdAt: Date.now(),
        enabled: true
      });
      return await this.upsert(copy);
    }

    async toggleEnabled(id){
      const t = this.getById(id);
      if(!t) return;
      return await this.upsert({ ...t, enabled: !t.enabled });
    }
  }

  const reg = (typeof window !== 'undefined') ? window.AppRegistry : null;
  let svc = (reg && typeof reg.get === 'function') ? reg.get('RepairTemplatesService') : null;
  if (!svc) svc = new RepairTemplatesService();
  try { reg?.register?.('RepairTemplatesService', svc); } catch (_) {}
})();
