/**
 * Linkage Helper
 * - 整合 repairs / repairParts / quotes / orders
 * - 產出「可判讀」的狀態 chips / summary（避免只靠 progress 猜）
 */

class LinkageHelper {
  // ================================
  // 低階：狀態規格
  // ================================
  static partStages() {
    return [
      { key: 'quote', label: '待報價', match: (p) => (p.status === '需求提出') },
      { key: 'order', label: '待下單', match: (p) => (p.status === '已報價' && !p.orderId) },
      { key: 'arrival', label: '待到貨', match: (p) => (p.status === '已下單') || (p.status === '已報價' && !!p.orderId) },
      { key: 'replace', label: '待更換', match: (p) => (p.status === '已到貨') },
      { key: 'closed', label: '已結案', match: (p) => (p.status === '已更換') }
    ];
  }

  static quoteOrder() {
    // 越前面代表越需要注意
    return ['草稿', '已送出', '已核准', '已取消'];
  }

  static orderOrder() {
    return ['建立', '已下單', '已到貨', '已結案', '已取消'];
  }

  // ================================
  // 統計：repairParts
  // ================================
  static summarizeRepairParts(parts = []) {
    const valid = (parts || []).filter(p => p && !p.isDeleted && (p.status || '') !== '取消');
    const total = valid.length;

    const stages = this.partStages();
    const byStage = {};
    for (const s of stages) byStage[s.label] = 0;

    for (const p of valid) {
      for (const s of stages) {
        if (s.match(p)) {
          byStage[s.label] += 1;
          break;
        }
      }
    }

    // open items：排除已結案
    const openTotal = total - (byStage['已結案'] || 0);

    // primary：找最早期且 count>0 的 stage，否則已結案
    let primary = { label: '無', count: 0, total };
    if (total > 0) {
      const order = ['待報價', '待下單', '待到貨', '待更換'];
      const found = order.find(k => (byStage[k] || 0) > 0);
      if (found) {
        primary = { label: found, count: byStage[found] || 0, total };
      } else {
        primary = { label: '已結案', count: byStage['已結案'] || 0, total };
      }
    }

    return { total, openTotal, byStage, primary };
  }

  // ================================
  // 統計：quotes / orders
  // ================================
  static summarizeStatus(items = [], order = [], statusField = 'status') {
    const valid = (items || []).filter(x => x && !x.isDeleted);
    const total = valid.length;
    const byStatus = {};
    for (const k of order) byStatus[k] = 0;

    for (const x of valid) {
      const st = (x[statusField] || '').toString().trim();
      if (byStatus[st] === undefined) byStatus[st] = 0;
      byStatus[st] += 1;
    }

    let primary = { label: '未建立', count: 0, total };
    if (total > 0) {
      const picked = order.find(k => (byStatus[k] || 0) > 0) || Object.keys(byStatus).find(k => (byStatus[k] || 0) > 0);
      primary = { label: picked || '未建立', count: byStatus[picked] || total, total };
    }

    return { total, byStatus, primary };
  }

  // ================================
  // Repair-level summary（單一維修單卡片用）
  // ================================
  static getForRepair(repairId) {
    const rid = (repairId || '').toString().trim();

    // 重要效能修正：
    // 以前每張維修卡片都會對 quotes/orders 全量陣列做 filter（O(N*M)），
    // 當維修單/報價/訂單數量一多，列表渲染會明顯卡頓。
    // QuoteService / OrderService 已內建依 repairId 的索引（getForRepair），
    // 這裡改用索引，避免全量掃描。

    const repairPartsSvc = (typeof window._svc === 'function') ? window._svc('RepairPartsService') : null;
    const parts = (repairPartsSvc && typeof repairPartsSvc.getForRepair === 'function')
      ? repairPartsSvc.getForRepair(rid)
      : [];

    const quoteSvc = (typeof window._svc === 'function') ? window._svc('QuoteService') : null;
    let quotes = [];
    if (quoteSvc && typeof quoteSvc.getForRepair === 'function') {
      quotes = quoteSvc.getForRepair(rid) || [];
    } else {
      const quotesAll = (quoteSvc && typeof quoteSvc.getAll === 'function') ? quoteSvc.getAll() : [];
      quotes = (quotesAll || []).filter(q => (q && (q.repairId || '') === rid));
    }

    const orderSvc = (typeof window._svc === 'function') ? window._svc('OrderService') : null;
    let orders = [];
    if (orderSvc && typeof orderSvc.getForRepair === 'function') {
      orders = orderSvc.getForRepair(rid) || [];
    } else {
      const ordersAll = (orderSvc && typeof orderSvc.getAll === 'function') ? orderSvc.getAll() : [];
      orders = (ordersAll || []).filter(o => (o && (o.repairId || '') === rid));
    }

    const partSummary = this.summarizeRepairParts(parts);
    const quoteSummary = this.summarizeStatus(quotes, this.quoteOrder(), 'status');
    const orderSummary = this.summarizeStatus(orders, this.orderOrder(), 'status');

    return { parts: partSummary, quotes: quoteSummary, orders: orderSummary };
  }

  // ================================
  // Serial-level summary（機台歷史頁用）
  // ================================
  static getForSerial(serial, repairs = []) {
    const list = (repairs || []).filter(r => r && !r.isDeleted);
    const ids = list.map(r => r.id).filter(Boolean);

    // 最新維修單：改線性掃描（避免複製 + sort）
    let latest = null;
    let latestT = -1;
    for (const r of list) {
      const t = new Date(r.updatedAt || r.createdAt || 0).getTime();
      if (Number.isFinite(t) && t > latestT) {
        latestT = t;
        latest = r;
      }
    }

    const repairPartsSvc = (typeof window._svc === 'function') ? window._svc('RepairPartsService') : null;
    // RepairPartsService 有 byRepair 索引：用 getForRepair 收斂到「此序號」需要的資料
    let parts = [];
    if (repairPartsSvc && typeof repairPartsSvc.getForRepair === 'function') {
      for (const rid of ids) {
        const arr = repairPartsSvc.getForRepair(rid) || [];
        if (arr && arr.length) parts.push(...arr);
      }
    } else {
      const idSet = new Set(ids);
      const partsAll = (repairPartsSvc && typeof repairPartsSvc.getAll === 'function') ? repairPartsSvc.getAll() : [];
      parts = (partsAll || []).filter(p => p && idSet.has(p.repairId));
    }

    const quoteSvc = (typeof window._svc === 'function') ? window._svc('QuoteService') : null;
    let quotes = [];
    if (quoteSvc && typeof quoteSvc.getForRepair === 'function') {
      for (const rid of ids) {
        const arr = quoteSvc.getForRepair(rid) || [];
        if (arr && arr.length) quotes.push(...arr);
      }
    } else {
      const idSet = new Set(ids);
      const quotesAll = (quoteSvc && typeof quoteSvc.getAll === 'function') ? quoteSvc.getAll() : [];
      quotes = (quotesAll || []).filter(q => q && idSet.has(q.repairId));
    }

    const orderSvc = (typeof window._svc === 'function') ? window._svc('OrderService') : null;
    let orders = [];
    if (orderSvc && typeof orderSvc.getForRepair === 'function') {
      for (const rid of ids) {
        const arr = orderSvc.getForRepair(rid) || [];
        if (arr && arr.length) orders.push(...arr);
      }
    } else {
      const idSet = new Set(ids);
      const ordersAll = (orderSvc && typeof orderSvc.getAll === 'function') ? orderSvc.getAll() : [];
      orders = (ordersAll || []).filter(o => o && idSet.has(o.repairId));
    }

    const partSummary = this.summarizeRepairParts(parts);
    const quoteSummary = this.summarizeStatus(quotes, this.quoteOrder(), 'status');
    const orderSummary = this.summarizeStatus(orders, this.orderOrder(), 'status');

    return { serial: (serial || '').toString(), latest, repairs: list, parts: partSummary, quotes: quoteSummary, orders: orderSummary };
  }
}

if (typeof window !== 'undefined') {
  window.LinkageHelper = LinkageHelper;
}

console.log('✅ LinkageHelper loaded');

// ========================================
// Cross-module helpers
// ========================================
// 目的：避免「登出/切換帳號」後，沿用上一個使用者的記憶體快取或 localStorage 快取
// 造成看見他人資料。

if (typeof window !== 'undefined') {
  window.getUserScopeKey = function getUserScopeKey() {
    try {
      const u = (window.AppState && typeof window.AppState.getCurrentUser === 'function') ? window.AppState.getCurrentUser() : (window.currentUser || (window.AuthSystem && window.AuthSystem.getCurrentUser && window.AuthSystem.getCurrentUser()));
      const uid = (u && u.uid) ? String(u.uid) : '';
      if (uid) return uid;
      // fallback：在特殊狀況（例如尚未完成 user session restore）仍能產生穩定 key
      const email = (u && u.email) ? String(u.email) : '';
      if (email) return email.replace(/[^a-zA-Z0-9]/g, '_');
      return 'unknown';
    } catch (_) {
      return 'unknown';
    }
  };

  window.resetAllServices = function resetAllServices() {
    const regList = (window.AppRegistry && typeof window.AppRegistry.list === 'function')
      ? window.AppRegistry.list().map(n => window.AppRegistry.get(n)).filter(Boolean)
      : [];

    const list = [
      (typeof window._svc === 'function') ? window._svc('RepairService') : null,
      (typeof window._svc === 'function') ? window._svc('CustomerService') : null,
      (typeof window._svc === 'function') ? window._svc('PartService') : null,
      (typeof window._svc === 'function') ? window._svc('RepairPartsService') : null,
      (typeof window._svc === 'function') ? window._svc('QuoteService') : null,
      (typeof window._svc === 'function') ? window._svc('OrderService') : null,
      (typeof window._svc === 'function') ? window._svc('KBService') : null,
      (typeof window._svc === 'function') ? window._svc('MaintenanceService') : null,
      (typeof window._svc === 'function') ? window._svc('WeeklyService') : null,
      (typeof window._svc === 'function') ? window._svc('SettingsService') : null
    ].filter(Boolean);

    // registry 的物件優先（避免只靠 window.*）
    const merged = [...regList, ...list].filter(Boolean);
    const uniq = [];
    const seen = new Set();
    for (const s of merged) {
      if (!s) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      uniq.push(s);
    }

    for (const s of uniq) {
      try {
        if (typeof s.reset === 'function') s.reset();
        if (typeof s.teardownRealtimeListeners === 'function') s.teardownRealtimeListeners();
        // fallback cleanup when service has no explicit reset()
        if (typeof s.reset !== 'function') {
          try {
            const refs = ['repairsRef','historyRef','customersRef','partsRef','repairPartsRef','ref','countersRef','serialIndexRef','_streamRef','_userRootRef'];
            for (const k of refs) {
              if (s[k] && typeof s[k].off === 'function') s[k].off();
            }
          } catch (e) {}
          try {
            if ('isInitialized' in s) s.isInitialized = false;
            if ('_listenersReady' in s) s._listenersReady = false;
            if (Array.isArray(s.repairs)) s.repairs = [];
            if (Array.isArray(s.repairHistory)) s.repairHistory = [];
            if (Array.isArray(s.customers)) s.customers = [];
            if (Array.isArray(s.parts)) s.parts = [];
            if (Array.isArray(s.quotes)) s.quotes = [];
            if (Array.isArray(s.orders)) s.orders = [];
          } catch (e) {}
        }
      } catch (e) {
        // ignore
      }
    }

    try {
      // 清理可能殘留的全域狀態
      if (window.AppRouter && typeof window.AppRouter.destroy === 'function') {
        window.AppRouter.destroy();
      }
    } catch (_) {}
  };
}
