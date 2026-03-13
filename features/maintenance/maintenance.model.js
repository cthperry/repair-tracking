/**
 * 機台保養管理（Maintenance）- Model
 * MNT-1（MVP）
 *
 * Firebase 位置：data/<uid>/maintenance/{equipments,records,settings}
 */

(function(){
  'use strict';

  const toStr = (v) => (v === null || v === undefined) ? '' : String(v);

  function nowISO(){
    try { return new Date().toISOString(); } catch (_) { return String(Date.now()); }
  }

  function todayYMD(){
    try {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${dd}`;
    } catch (_) {
      return '';
    }
  }

  function genId(prefix){
    const p = toStr(prefix).trim() || 'mnt';
    const rnd = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36);
    return `${p}_${ts}_${rnd}`;
  }

  function normalizeTags(input){
    const raw = Array.isArray(input)
      ? input
      : toStr(input).split(/[,;\n]/g);

    const out = [];
    const seen = new Set();
    for (const x of raw) {
      const v = toStr(x).trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out.slice(0, 20);
  }

  function safeUserLabel(){
    try {
      const u = window.currentUser || window.AuthSystem?.getCurrentUser?.() || {};
      const dn = toStr(u.displayName).trim();
      if (dn) return dn;
      const em = toStr(u.email).trim();
      if (em) return em;
      const uid = toStr(u.uid).trim();
      return uid || 'unknown';
    } catch (_) {
      return 'unknown';
    }
  }

  function normalizeCycle(every, unit){
    const e = Math.max(1, parseInt(every, 10) || 30);
    const u0 = toStr(unit).trim().toLowerCase();
    const u = (u0 === 'week' || u0 === 'month') ? u0 : 'day';
    return { every: e, unit: u };
  }

  function buildEquipmentSearch(eq){
    try {
      const parts = [];
      for (const k of ['equipmentNo','name','model','location','owner','ownerEmail','installDate']) {
        if (eq && eq[k]) parts.push(String(eq[k]));
      }
      if (Array.isArray(eq?.tags)) parts.push(eq.tags.join(' '));
      return parts.join(' ').toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function buildRecordSearch(r){
    try {
      const parts = [];
      for (const k of ['equipmentNo','equipmentName','equipmentModel','performer','abnormal','notes']) {
        if (r && r[k]) parts.push(String(r[k]));
      }
      if (Array.isArray(r?.checklist)) {
        for (const it of r.checklist) {
          if (it?.label) parts.push(String(it.label));
          if (it?.note) parts.push(String(it.note));
        }
      }
      if (Array.isArray(r?.parts)) {
        for (const p of r.parts) {
          if (p?.name) parts.push(String(p.name));
          if (p?.note) parts.push(String(p.note));
        }
      }
      if (Array.isArray(r?.tags)) parts.push(r.tags.join(' '));
      return parts.join(' ').toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function normalizeChecklist(list){
    const arr = Array.isArray(list) ? list : [];
    return arr.map(x => ({
      label: toStr(x?.label).trim(),
      ok: !!x?.ok,
      note: toStr(x?.note).trim()
    })).filter(x => x.label);
  }

  function normalizeParts(list){
    const arr = Array.isArray(list) ? list : [];
    return arr.map(x => ({
      name: toStr(x?.name).trim(),
      qty: Math.max(1, parseInt(x?.qty, 10) || 1),
      note: toStr(x?.note).trim()
    })).filter(x => x.name);
  }

  function normalizeEquipment(input, existing){
    const base = existing ? Object.assign({}, existing) : {};
    const who = safeUserLabel();

    const cyc = normalizeCycle(input?.cycleEvery ?? base.cycleEvery ?? 30, input?.cycleUnit ?? base.cycleUnit ?? 'day');

    const out = Object.assign(base, {
      id: base.id || toStr(input?.id).trim() || genId('eq'),
      equipmentNo: toStr(input?.equipmentNo ?? base.equipmentNo).trim(),
      name: toStr(input?.name ?? base.name).trim(),
      model: toStr(input?.model ?? base.model).trim(),
      location: toStr(input?.location ?? base.location).trim(),
      owner: toStr(input?.owner ?? base.owner).trim(),
      ownerEmail: toStr(input?.ownerEmail ?? base.ownerEmail).trim(),
      installDate: toStr(input?.installDate ?? base.installDate).trim(),
      cycleEvery: cyc.every,
      cycleUnit: cyc.unit,
      remindDays: Array.isArray(input?.remindDays) ? input.remindDays.map(n => parseInt(n,10)).filter(n => Number.isFinite(n) && n>=0) : (Array.isArray(base.remindDays) ? base.remindDays : [3,7]),
      checklistTemplate: Array.isArray(input?.checklistTemplate)
        ? input.checklistTemplate.map(x => ({ label: toStr(x?.label).trim() })).filter(x => x.label)
        : (Array.isArray(base.checklistTemplate) ? base.checklistTemplate : []),
      tags: normalizeTags(input?.tags ?? base.tags),
      isDeleted: !!(input?.isDeleted ?? base.isDeleted)
    });

    if (!out.createdAt) {
      out.createdAt = nowISO();
      out.createdBy = toStr(base.createdBy).trim() || who;
    }
    out.updatedAt = nowISO();
    out.updatedBy = who;

    out._search = buildEquipmentSearch(out);
    return out;
  }

  function normalizeRecord(input, equipmentSnapshot, existing){
    const base = existing ? Object.assign({}, existing) : {};
    const who = safeUserLabel();

    const eq = equipmentSnapshot || null;

    const performedAt = toStr(input?.performedAt ?? base.performedAt).trim() || todayYMD();

    const out = Object.assign(base, {
      id: base.id || toStr(input?.id).trim() || genId('mr'),
      equipmentId: toStr(input?.equipmentId ?? base.equipmentId).trim(),
      equipmentNo: toStr(input?.equipmentNo ?? base.equipmentNo ?? eq?.equipmentNo).trim(),
      equipmentName: toStr(input?.equipmentName ?? base.equipmentName ?? eq?.name).trim(),
      equipmentModel: toStr(input?.equipmentModel ?? base.equipmentModel ?? eq?.model).trim(),
      performedAt,
      performer: toStr(input?.performer ?? base.performer).trim(),
      checklist: normalizeChecklist(input?.checklist ?? base.checklist),
      abnormal: toStr(input?.abnormal ?? base.abnormal).trim(),
      parts: normalizeParts(input?.parts ?? base.parts),
      notes: toStr(input?.notes ?? base.notes).trim(),
      tags: normalizeTags(input?.tags ?? base.tags),
      isDeleted: !!(input?.isDeleted ?? base.isDeleted)
    });

    if (!out.createdAt) {
      out.createdAt = nowISO();
      out.createdBy = toStr(base.createdBy).trim() || who;
    }
    out.updatedAt = nowISO();
    out.updatedBy = who;

    out._search = buildRecordSearch(out);
    return out;
  }

  function summarizeChecklist(checklist){
    const list = Array.isArray(checklist) ? checklist : [];
    const total = list.length;
    const ok = list.filter(x => x && x.ok).length;
    return { total, ok, ng: Math.max(0, total - ok) };
  }

  window.MaintenanceModel = {
    genId,
    nowISO,
    todayYMD,
    normalizeTags,
    normalizeCycle,
    normalizeEquipment,
    normalizeRecord,
    summarizeChecklist,
    buildEquipmentSearch,
    buildRecordSearch,
  };

  try { window.AppRegistry?.register?.('MaintenanceModel', window.MaintenanceModel); } catch (_) {}
  try { console.log('✅ MaintenanceModel loaded'); } catch (_) {}
})();
