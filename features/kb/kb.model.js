/**
 * 知識庫（KB）- Model
 * KB-1（MVP）
 */

(function(){
  'use strict';

  const toStr = (v) => (v === null || v === undefined) ? '' : String(v);

  const TYPE_KEYS = {
    faq: 'faqs',
    failure: 'failureModes',
    sop: 'sops',
    case: 'cases'
  };

  function normalizeType(type){
    const t = toStr(type).trim().toLowerCase();
    if (t === 'faqs' || t === 'faq') return 'faq';
    if (t === 'failuremodes' || t === 'failure' || t === 'fm') return 'failure';
    if (t === 'sops' || t === 'sop') return 'sop';
    if (t === 'cases' || t === 'case') return 'case';
    return 'faq';
  }

  function typeToNode(type){
    const k = normalizeType(type);
    return TYPE_KEYS[k] || TYPE_KEYS.faq;
  }

  function nowISO(){
    try { return new Date().toISOString(); } catch (_) { return String(Date.now()); }
  }

  function makeId(prefix){
    const p = toStr(prefix).trim() || 'kb';
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

  function safeUserLabel(user){
    const u = user || (typeof window !== 'undefined' ? (window.currentUser || window.AuthSystem?.getCurrentUser?.() || {}) : {});
    const dn = toStr(u.displayName).trim();
    if (dn) return dn;
    const em = toStr(u.email).trim();
    if (em) return em;
    const uid = toStr(u.uid).trim();
    return uid || 'unknown';
  }

  function emptyByType(type){
    const t = normalizeType(type);
    if (t === 'faq') {
      return { id: '', type: 'faq', question: '', answer: '', title: '', summary: '', tags: [], relatedRepairNos: [], createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' };
    }
    if (t === 'failure') {
      return { id: '', type: 'failure', symptom: '', failureMode: '', rootCause: '', fix: '', title: '', summary: '', tags: [], relatedRepairNos: [], createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' };
    }
    if (t === 'sop') {
      return { id: '', type: 'sop', title: '', summary: '', steps: '', precautions: '', tags: [], createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' };
    }
    // case
    return { id: '', type: 'case', title: '', summary: '', problem: '', analysis: '', solution: '', outcome: '', tags: [], relatedRepairNos: [], createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' };
  }

  function build(type, raw, user){
    const t = normalizeType(type);
    const base = emptyByType(t);
    const r = raw || {};

    const id = toStr(r.id || base.id).trim() || makeId(`kb_${t}`);
    const createdAt = toStr(r.createdAt || base.createdAt).trim() || nowISO();
    const updatedAt = nowISO();

    const who = safeUserLabel(user);
    const createdBy = toStr(r.createdBy || base.createdBy).trim() || who;
    const updatedBy = who;

    const tags = normalizeTags(r.tags || base.tags);

    // 通用欄位：title/summary（方便列表呈現）
    let title = toStr(r.title || base.title).trim();
    let summary = toStr(r.summary || base.summary).trim();

    if (t === 'faq') {
      const question = toStr(r.question || base.question).trim();
      const answer = toStr(r.answer || base.answer).trim();
      if (!title) title = question || 'FAQ';
      if (!summary) summary = answer;
      const relatedRepairNos = Array.isArray(r.relatedRepairNos) ? r.relatedRepairNos : toStr(r.relatedRepairNos).split(/[,;\n]/g).map(s => s.trim()).filter(Boolean);
      const obj = { ...base, ...r, id, type: 'faq', title, summary, question, answer, tags, relatedRepairNos, createdAt, updatedAt, createdBy, updatedBy };
      obj._search = buildSearch(obj);
      return obj;
    }

    if (t === 'failure') {
      const symptom = toStr(r.symptom || base.symptom).trim();
      const failureMode = toStr(r.failureMode || base.failureMode).trim();
      const rootCause = toStr(r.rootCause || base.rootCause).trim();
      const fix = toStr(r.fix || base.fix).trim();
      if (!title) title = failureMode || symptom || '故障模式';
      if (!summary) summary = symptom || rootCause || fix;
      const relatedRepairNos = Array.isArray(r.relatedRepairNos) ? r.relatedRepairNos : toStr(r.relatedRepairNos).split(/[,;\n]/g).map(s => s.trim()).filter(Boolean);
      const obj = { ...base, ...r, id, type: 'failure', title, summary, symptom, failureMode, rootCause, fix, tags, relatedRepairNos, createdAt, updatedAt, createdBy, updatedBy };
      obj._search = buildSearch(obj);
      return obj;
    }

    if (t === 'sop') {
      const steps = toStr(r.steps || base.steps).trim();
      const precautions = toStr(r.precautions || base.precautions).trim();
      if (!title) title = 'SOP';
      if (!summary) summary = steps;
      const obj = { ...base, ...r, id, type: 'sop', title, summary, steps, precautions, tags, createdAt, updatedAt, createdBy, updatedBy };
      obj._search = buildSearch(obj);
      return obj;
    }

    // case
    const problem = toStr(r.problem || base.problem).trim();
    const analysis = toStr(r.analysis || base.analysis).trim();
    const solution = toStr(r.solution || base.solution).trim();
    const outcome = toStr(r.outcome || base.outcome).trim();
    if (!title) title = problem || '案例';
    if (!summary) summary = solution || analysis || outcome;
    const relatedRepairNos = Array.isArray(r.relatedRepairNos) ? r.relatedRepairNos : toStr(r.relatedRepairNos).split(/[,;\n]/g).map(s => s.trim()).filter(Boolean);
    const obj = { ...base, ...r, id, type: 'case', title, summary, problem, analysis, solution, outcome, tags, relatedRepairNos, createdAt, updatedAt, createdBy, updatedBy };
    obj._search = buildSearch(obj);
    return obj;
  }

  function buildSearch(obj){
    try {
      const parts = [];
      for (const k of Object.keys(obj || {})) {
        if (k === '_search') continue;
        const v = obj[k];
        if (Array.isArray(v)) parts.push(v.join(' '));
        else if (typeof v === 'string' || typeof v === 'number') parts.push(String(v));
      }
      return parts.join(' ').toLowerCase();
    } catch (_) {
      return '';
    }
  }

  const KBModel = {
    normalizeType,
    typeToNode,
    makeId,
    normalizeTags,
    emptyByType,
    build
  };

  if (typeof window !== 'undefined') {
    window.KBModel = KBModel;
    try { window.AppRegistry?.register?.('KBModel', KBModel); } catch (_) {}
  }

  try { console.log('✅ KBModel loaded'); } catch (_) {}
})();
