/**
 * SOP Hub - Data Model
 * SOP-1（MVP）
 *
 * 資料模型對齊 OrderSOPHub Phase 1：
 * - sops：title, category, scopeCustomerId, tags, abstract, latestVersion, createdAt, updatedAt
 * - versions：version, driveFileId, driveWebViewLink, changeLog, createdAt, createdByUid
 */

class SOPModel {
  static nowISO(){
    try { return new Date().toISOString(); } catch (_) { return '' + Date.now(); }
  }

  static makeId(prefix = 'sop'){
    const p = (prefix || 'sop').toString().trim();
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const ss = String(d.getSeconds()).padStart(2,'0');
    const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${p.toUpperCase()}_${y}${m}${dd}_${hh}${mm}${ss}_${rnd}`;
  }

  static normalizeCategory(v){
    const s = (v || '').toString().trim().toLowerCase();
    if (s === 'machine' || s === 'part' || s === 'repair' || s === 'general') return s;
    return 'general';
  }

  static normalizeTags(input){
    try {
      const arr = Array.isArray(input)
        ? input
        : String(input || '').split(/[,;\n\r]/g);
      const out = [];
      for (const t of arr) {
        const s = String(t || '').trim();
        if (!s) continue;
        if (!out.includes(s)) out.push(s);
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  static currentUser(){
    try {
      const u = (window.AppState?.getCurrentUser?.() || window.currentUser || window.AuthSystem?.getCurrentUser?.() || null);
      return {
        uid: (u?.uid || ''),
        email: (u?.email || ''),
        displayName: (u?.displayName || '')
      };
    } catch (_) {
      return { uid:'', email:'', displayName:'' };
    }
  }

  static createSop(data = {}){
    const now = this.nowISO();
    const u = this.currentUser();

    const id = (data.id || '').toString().trim() || this.makeId('SOP');
    const title = (data.title || '').toString().trim();
    const category = this.normalizeCategory(data.category);
    const scopeCustomerId = (data.scopeCustomerId === null || data.scopeCustomerId === undefined) ? null : String(data.scopeCustomerId || '').trim() || null;
    const tags = this.normalizeTags(data.tags);
    const abstractText = (data.abstract || '').toString().trim();
    const abstract = abstractText ? abstractText : null;

    const createdAt = (data.createdAt || now).toString();
    const updatedAt = (data.updatedAt || now).toString();

    const latestVersion = Number.isFinite(+data.latestVersion) ? Math.max(0, parseInt(data.latestVersion, 10)) : 0;

    return {
      id,
      title,
      category,
      scopeCustomerId,
      tags,
      abstract,
      latestVersion,
      // 方便列表快速開啟
      latestDriveFileId: (data.latestDriveFileId || '').toString(),
      latestDriveWebViewLink: (data.latestDriveWebViewLink || '').toString(),

      ownerUid: (data.ownerUid || u.uid || '').toString(),
      createdAt,
      updatedAt,
      isDeleted: (typeof data.isDeleted === 'boolean') ? data.isDeleted : false
    };
  }

  static createVersion(data = {}){
    const now = this.nowISO();
    const u = this.currentUser();

    const version = Number.isFinite(+data.version) ? Math.max(1, parseInt(data.version, 10)) : 1;

    return {
      version,
      driveFileId: (data.driveFileId || '').toString(),
      driveWebViewLink: (data.driveWebViewLink || '').toString(),
      fileName: (data.fileName || '').toString(),
      mimeType: (data.mimeType || '').toString(),
      changeLog: (data.changeLog || '').toString(),
      createdAt: (data.createdAt || now).toString(),
      createdByUid: (data.createdByUid || u.uid || '').toString()
    };
  }

  static validateSop(sop){
    const errors = [];
    const s = sop || {};
    if (!String(s.title || '').trim()) errors.push({ field:'title', message:'SOP 標題不可為空' });
    if (!String(s.id || '').trim()) errors.push({ field:'id', message:'SOP id 不可為空' });
    const cat = this.normalizeCategory(s.category);
    if (!cat) errors.push({ field:'category', message:'SOP 類別不正確' });
    return { isValid: errors.length === 0, errors };
  }
}

// 輸出到全域
if (typeof window !== 'undefined') {
  window.SOPModel = SOPModel;
}

try { console.log('✅ SOPModel loaded'); } catch (_) {}
