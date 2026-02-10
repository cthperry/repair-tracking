/**
 * 維修單模板 - Model
 * V161.114
 *
 * 注意：needParts 必須為 boolean，與維修單欄位一致。
 */
(function(){
  'use strict';

  function nowTs(){ return Date.now(); }

  // 建議欄位：只存「可套用到維修單」的欄位
  window.RepairTemplateModel = {
    create(data){
      const d = data || {};
      const id = (d.id || `tpl_${nowTs()}_${Math.random().toString(16).slice(2)}`);
      const toBool = (v)=>{
        if (v === true) return true;
        if (v === false) return false;
        if (v === 1 || v === '1') return true;
        if (v === 0 || v === '0') return false;
        if (typeof v === 'string') {
          const s = v.trim().toLowerCase();
          if (s === 'true' || s === 'yes' || s === 'y') return true;
          if (s === 'false' || s === 'no' || s === 'n') return false;
        }
        return !!v;
      };
      return {
        id,
        name: (d.name || '未命名模板').toString().trim(),
        enabled: (d.enabled !== false),
        // patch fields
        status: d.status ?? '',
        progress: (typeof d.progress === 'number') ? d.progress : (d.progress ? Number(d.progress) : 0),
        priority: d.priority ?? '',
        productLine: d.productLine ?? '',
        machine: d.machine ?? '',
        issue: d.issue ?? '',
        content: d.content ?? '',
        notes: d.notes ?? '',
        // V161.114: boolean
        needParts: toBool(d.needParts),
        // meta
        createdAt: d.createdAt || nowTs(),
        updatedAt: nowTs()
      };
    },
    normalize(t){
      if(!t) return null;
      const n = { ...t };
      n.enabled = (n.enabled !== false);
      n.progress = Math.max(0, Math.min(100, Number(n.progress||0)));
      n.name = (n.name || '未命名模板').toString().trim();
      // backward compatibility: old templates might store string
      n.needParts = (n.needParts === true) ? true : (n.needParts === false ? false : (String(n.needParts || '').trim() ? true : false));
      n.updatedAt = nowTs();
      return n;
    }
  };
})();
