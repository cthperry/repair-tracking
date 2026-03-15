/**
 * 儀表板 - UI
 * Phase 2 — Dashboard (首頁總覽)
 *
 * 資料來源：
 *   RepairService    → 維修統計 / 逾期維修
 *   QuoteService     → 待核准報價
 *   OrderService     → 待到貨訂單
 *   NotificationCenter → 通知清單
 */
(function () {
  'use strict';

  // === Helpers ===
  var esc = function (v) {
    var s = (v == null) ? '' : String(v);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  var _svc = function (name) {
    try { if (window.AppRegistry && typeof window.AppRegistry.get === 'function') return window.AppRegistry.get(name); } catch (_) {}
    try { if (typeof window._svc === 'function') return window._svc(name); } catch (_) {}
    return null;
};

  var daysSince = function (isoStr) {
    if (!isoStr) return NaN;
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return NaN;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  };

  var daysUntil = function (isoStr) {
    if (!isoStr) return NaN;
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return NaN;
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.floor((d.getTime() - now.getTime()) / 86400000);
  };

  var fmtDate = function (isoStr) {
    if (!isoStr) return '—';
    try {
      var d = new Date(isoStr);
      var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + dd;
    } catch (_) { return '—'; }
  };

  // === Data Collection ===

  function getRepairStats() {
    var svc = _svc('RepairService');
    if (!svc || typeof svc.getAll !== 'function') return { total: 0, active: 0, needParts: 0, completed: 0, avgAge: 0, overdue: [] };

    var all = (svc.getAll() || []).filter(function (r) { return r && !r.isDeleted; });
    var active = all.filter(function (r) { return r.status !== '已完成'; });
    var needParts = all.filter(function (r) { return r.status === '需要零件'; });
    var completed = all.filter(function (r) { return r.status === '已完成'; });

    // 逾期：進行中超過 14 天
    var overdue = active.filter(function (r) {
      var days = daysSince(r.createdDate || r.createdAt);
      return days >= 14;
    }).sort(function (a, b) {
      return daysSince(b.createdDate || b.createdAt) - daysSince(a.createdDate || a.createdAt);
    });

    var totalAge = 0;
    for (var i = 0; i < active.length; i++) {
      var d = daysSince(active[i].createdDate || active[i].createdAt);
      if (isFinite(d)) totalAge += d;
    }

    return {
      total: all.length,
      active: active.length,
      needParts: needParts.length,
      completed: completed.length,
      avgAge: active.length > 0 ? Math.round(totalAge / active.length) : 0,
      overdue: overdue.slice(0, 8)
    };
  }

  function getQuoteStats() {
    var svc = _svc('QuoteService');
    if (!svc || typeof svc.getAll !== 'function') return { total: 0, draft: 0, pending: 0, pendingList: [] };

    var all = (svc.getAll() || []).filter(function (q) { return q && !q.isDeleted; });
    var draft = all.filter(function (q) { return q.status === '草稿'; });
    var pending = all.filter(function (q) { return q.status === '已送出'; });

    return {
      total: all.length,
      draft: draft.length,
      pending: pending.length,
      pendingList: pending.slice(0, 5)
    };
  }

  function getOrderStats() {
    var svc = _svc('OrderService');
    if (!svc || typeof svc.getAll !== 'function') return { total: 0, ordered: 0, orderedList: [] };

    var all = (svc.getAll() || []).filter(function (o) { return o && !o.isDeleted; });
    var ordered = all.filter(function (o) { return o.status === '已下單'; });

    return {
      total: all.length,
      ordered: ordered.length,
      orderedList: ordered.slice(0, 5)
    };
  }

  function getThisWeekKPI() {
    var rs = _svc('RepairService');
    var qs = _svc('QuoteService');
    var os = _svc('OrderService');

    var repairs = (rs && typeof rs.getAll === 'function') ? (rs.getAll() || []).filter(function (r) { return r && !r.isDeleted; }) : [];
    var quotes = (qs && typeof qs.getAll === 'function') ? (qs.getAll() || []).filter(function (q) { return q && !q.isDeleted; }) : [];
    var orders = (os && typeof os.getAll === 'function') ? (os.getAll() || []).filter(function (o) { return o && !o.isDeleted; }) : [];

    var now = new Date();
    var day = now.getDay() || 7; // Mon=1
    var monday = new Date(now);
    monday.setDate(monday.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    var weekStart = monday.getTime();

    var created = 0, completed = 0;
    var mttrSum = 0, mttrCnt = 0;

    for (var i = 0; i < repairs.length; i++) {
      var r = repairs[i];
      var cTime = new Date(r.createdAt || 0).getTime();
      if (cTime >= weekStart) created++;

      if (r.status === '已完成' && r.completedAt) {
        var compTime = new Date(r.completedAt).getTime();
        if (compTime >= weekStart) {
          completed++;
          if (cTime > 0 && compTime > 0 && compTime >= cTime) {
            mttrSum += (compTime - cTime) / 86400000;
            mttrCnt++;
          }
        }
      }
    }

    // 報價 → 訂單轉單率（以本週建立的「非草稿報價」作為分母、以本週建立的訂單作為分子）
    var quotesSubmitted = 0;
    for (var j = 0; j < quotes.length; j++) {
      var q = quotes[j];
      if (q.status === '草稿') continue;
      var qt = new Date(q.createdAt || 0).getTime();
      if (qt >= weekStart) quotesSubmitted++;
    }

    var ordersCreated = 0;
    for (var k = 0; k < orders.length; k++) {
      var o = orders[k];
      var ot = new Date(o.createdAt || 0).getTime();
      if (ot >= weekStart) ordersCreated++;
    }

    var mttr = mttrCnt > 0 ? Math.round((mttrSum / mttrCnt) * 10) / 10 : 0;
    var conversion = quotesSubmitted > 0 ? Math.round((ordersCreated / quotesSubmitted) * 100) : 0;

    return {
      created: created,
      completed: completed,
      mttr: mttr,
      conversion: conversion,
      quotesSubmitted: quotesSubmitted,
      ordersCreated: ordersCreated
    };
  }


  function getBusinessActionStats() {
    var svc = _svc('RepairService');
    if (!svc || typeof svc.getAll !== 'function') {
      return {
        pendingChargeDecision: 0,
        pendingOrderDecision: 0,
        staleActive: [],
        staleCount: 0,
        chargeable: 0,
        free: 0,
        undecided: 0,
        ordered: 0,
        notOrdered: 0,
        unknownOrder: 0,
        stageCount: {},
        reasonCount: {}
      };
    }

    var all = (svc.getAll() || []).filter(function (r) { return r && !r.isDeleted; });
    var pendingChargeDecision = 0;
    var pendingOrderDecision = 0;
    var staleActive = [];
    var chargeable = 0;
    var free = 0;
    var undecided = 0;
    var ordered = 0;
    var notOrdered = 0;
    var unknownOrder = 0;
    var stageCount = {};
    var reasonCount = {};

    for (var i = 0; i < all.length; i++) {
      var r = all[i] || {};
      var billing = (r.billing && typeof r.billing === 'object') ? r.billing : {};
      var flow = (window.AppConfig && typeof window.AppConfig.getBillingFlowMeta === 'function')
        ? window.AppConfig.getBillingFlowMeta(billing)
        : null;

      if (flow) {
        if (flow.isChargeable) chargeable++;
        else if (flow.isFree) free++;
        else undecided++;

        if (flow.isOrdered) ordered++;
        else if (flow.isNotOrdered) {
          notOrdered++;
          var stageKey = (flow.stageCode || 'unknown').toString().toLowerCase();
          var reasonKey = (flow.reasonCode || 'unknown').toString().toLowerCase();
          stageCount[stageKey] = (stageCount[stageKey] || 0) + 1;
          reasonCount[reasonKey] = (reasonCount[reasonKey] || 0) + 1;
        } else if (flow.isChargeable) {
          unknownOrder++;
        }
      } else {
        if (billing.chargeable === true) chargeable++;
        else if (billing.chargeable === false) free++;
        else undecided++;
        if (billing.chargeable === true && billing.orderStatus === 'ordered') ordered++;
        else if (billing.chargeable === true && billing.orderStatus === 'not_ordered') notOrdered++;
        else if (billing.chargeable === true) unknownOrder++;
      }

      if (billing.chargeable !== true && billing.chargeable !== false) pendingChargeDecision++;
      if (billing.chargeable === true && billing.orderStatus !== 'ordered' && billing.orderStatus !== 'not_ordered') pendingOrderDecision++;
      if (r.status !== '已完成') {
        var staleDays = daysSince(r.updatedAt || r.createdAt || r.createdDate);
        if (isFinite(staleDays) && staleDays >= 3) {
          staleActive.push({
            id: r.id,
            customer: r.customer || '',
            machine: r.machine || '',
            staleDays: staleDays,
            repairNo: r.repairNo || r.id || ''
          });
        }
      }
    }

    staleActive.sort(function (a, b) { return b.staleDays - a.staleDays; });

    return {
      pendingChargeDecision: pendingChargeDecision,
      pendingOrderDecision: pendingOrderDecision,
      staleActive: staleActive.slice(0, 6),
      staleCount: staleActive.length,
      chargeable: chargeable,
      free: free,
      undecided: undecided,
      ordered: ordered,
      notOrdered: notOrdered,
      unknownOrder: unknownOrder,
      stageCount: stageCount,
      reasonCount: reasonCount
    };
  }


  function getFunnelStats() {
    var repairSvc = _svc('RepairService');
    var quoteSvc = _svc('QuoteService');
    var orderSvc = _svc('OrderService');

    var repairs = (repairSvc && typeof repairSvc.getAll === 'function') ? (repairSvc.getAll() || []).filter(function (r) { return r && !r.isDeleted; }) : [];
    var quotes = (quoteSvc && typeof quoteSvc.getAll === 'function') ? (quoteSvc.getAll() || []).filter(function (q) { return q && !q.isDeleted; }) : [];
    var orders = (orderSvc && typeof orderSvc.getAll === 'function') ? (orderSvc.getAll() || []).filter(function (o) { return o && !o.isDeleted; }) : [];

    var activeRepairs = repairs.filter(function (r) { return r.status !== '已完成'; }).length;
    var needParts = repairs.filter(function (r) { return r.status === '需要零件'; }).length;
    var quoteDraft = quotes.filter(function (q) { return q.status === '草稿'; }).length;
    var quoteSubmitted = quotes.filter(function (q) { return q.status === '已送出'; }).length;
    var quoteApproved = quotes.filter(function (q) { return q.status === '已核准'; }).length;
    var orderCreated = orders.filter(function (o) { return o.status === '建立'; }).length;
    var orderOrdered = orders.filter(function (o) { return o.status === '已下單'; }).length;
    var orderArrived = orders.filter(function (o) { return o.status === '已到貨'; }).length;
    var orderClosed = orders.filter(function (o) { return o.status === '已結案'; }).length;
    var chargeable = 0;
    var billingOrdered = 0;
    var billingPending = 0;

    for (var i = 0; i < repairs.length; i++) {
      var billing = (repairs[i] && repairs[i].billing && typeof repairs[i].billing === 'object') ? repairs[i].billing : {};
      var flow = (window.AppConfig && typeof window.AppConfig.getBillingFlowMeta === 'function')
        ? window.AppConfig.getBillingFlowMeta(billing)
        : null;
      if (flow ? flow.isChargeable : billing.chargeable === true) {
        chargeable++;
        if (flow ? flow.isOrdered : billing.orderStatus === 'ordered') billingOrdered++;
        else billingPending++;
      }
    }

    return {
      activeRepairs: activeRepairs,
      needParts: needParts,
      quoteDraft: quoteDraft,
      quoteSubmitted: quoteSubmitted,
      quoteApproved: quoteApproved,
      orderCreated: orderCreated,
      orderOrdered: orderOrdered,
      orderArrived: orderArrived,
      orderClosed: orderClosed,
      chargeable: chargeable,
      billingOrdered: billingOrdered,
      billingPending: billingPending
    };
  }

  function getOrderWatchStats() {
    var svc = _svc('OrderService');
    if (!svc || typeof svc.getAll !== 'function') {
      return { overdue: 0, dueSoon: 0, missingEta: 0, stalledOrdered: 0, watchList: [] };
    }

    var all = (svc.getAll() || []).filter(function (o) { return o && !o.isDeleted; });
    var overdue = 0;
    var dueSoon = 0;
    var missingEta = 0;
    var stalledOrdered = 0;
    var watchList = [];

    for (var i = 0; i < all.length; i++) {
      var o = all[i] || {};
      var status = o.status || '';
      var isTerminal = false;
      try {
        isTerminal = !!(window.AppConfig && typeof window.AppConfig.isTerminalBusinessStatus === 'function' && window.AppConfig.isTerminalBusinessStatus('order', status));
      } catch (_) {}
      if (isTerminal || status === '已結案' || status === '已取消' || status === '已到貨') continue;

      var eta = o.expectedAt || '';
      var etaDays = daysUntil(eta);
      var orderedDays = daysSince(o.orderedAt || o.createdAt);
      var tag = '';
      var tone = 'warn';
      if (!eta) {
        missingEta++;
        tag = '未設定 ETA';
        tone = 'neutral';
      } else if (isFinite(etaDays) && etaDays < 0) {
        overdue++;
        tag = '交期逾期';
        tone = 'danger';
      } else if (isFinite(etaDays) && etaDays <= 7) {
        dueSoon++;
        tag = '7 天內到貨';
      }
      if (status === '已下單' && isFinite(orderedDays) && orderedDays >= 7 && !o.receivedAt) {
        stalledOrdered++;
        if (!tag) {
          tag = '已下單超過 7 天';
          tone = 'warn';
        }
      }
      if (!tag) continue;
      watchList.push({
        id: o.id,
        orderNo: o.orderNo || o.id || '',
        vendor: o.vendor || '',
        expectedAt: eta,
        tag: tag,
        tagTone: tone
      });
    }

    watchList.sort(function (a, b) {
      if (a.tag === '交期逾期' && b.tag !== '交期逾期') return -1;
      if (a.tag !== '交期逾期' && b.tag === '交期逾期') return 1;
      return String(a.expectedAt || '').localeCompare(String(b.expectedAt || ''));
    });

    return {
      overdue: overdue,
      dueSoon: dueSoon,
      missingEta: missingEta,
      stalledOrdered: stalledOrdered,
      watchList: watchList.slice(0, 6)
    };
  }

  function getEngineerLoadStats() {
    var svc = _svc('RepairService');
    if (!svc || typeof svc.getAll !== 'function') return [];

    var all = (svc.getAll() || []).filter(function (r) { return r && !r.isDeleted && r.status !== '已完成'; });
    var map = {};
    for (var i = 0; i < all.length; i++) {
      var r = all[i] || {};
      var name = (r.ownerName || '').trim() || '未指派';
      if (!map[name]) map[name] = { name: name, active: 0, needParts: 0, stale: 0, urgent: 0 };
      map[name].active += 1;
      if (r.status === '需要零件') map[name].needParts += 1;
      var staleDays = daysSince(r.updatedAt || r.createdAt || r.createdDate);
      if (isFinite(staleDays) && staleDays >= 3) map[name].stale += 1;
      if ((r.priority || '').toString().toLowerCase() === 'urgent') map[name].urgent += 1;
    }

    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      if (b.active !== a.active) return b.active - a.active;
      if (b.needParts !== a.needParts) return b.needParts - a.needParts;
      return b.stale - a.stale;
    }).slice(0, 6);
  }

  function renderCommandCenter(repairs, quotes, orders, week, biz) {
    var urgentCount = (repairs.overdue ? repairs.overdue.length : 0) + (repairs.needParts || 0);
    var businessCount = (biz.pendingChargeDecision || 0) + (biz.pendingOrderDecision || 0) + (quotes.pending || 0);
    var staleCount = biz.staleCount || 0;

    var html = '<section class="dash-command-center">';
    html += '<div class="dash-command-head">';
    html += '<div><div class="dash-overline">RepairTracking</div><h2 class="dash-command-title">維修戰情室</h2><div class="dash-command-subtitle">先看要處理什麼，再決定去哪個模組。</div></div>';
    html += '<div class="dash-command-tags">';
    html += '<span class="dash-command-tag">進行中 ' + repairs.active + '</span>';
    html += '<span class="dash-command-tag">本週完成 ' + week.completed + '</span>';
    html += '<span class="dash-command-tag">待更新 ' + staleCount + '</span>';
    html += '</div></div>';

    html += '<div class="dash-focus-grid">';
    html += '<div class="dash-focus-card danger" data-action="dash-goto" data-route="repairs">';
    html += '<div class="dash-focus-label">立即處理</div>';
    html += '<div class="dash-focus-value">' + urgentCount + '</div>';
    html += '<div class="dash-focus-desc">維修逾期 ' + (repairs.overdue ? repairs.overdue.length : 0) + ' · 需要零件 ' + (repairs.needParts || 0) + '</div>';
    html += '</div>';

    html += '<div class="dash-focus-card warn" data-action="dash-goto" data-route="quotes">';
    html += '<div class="dash-focus-label">商務待確認</div>';
    html += '<div class="dash-focus-value">' + businessCount + '</div>';
    html += '<div class="dash-focus-desc">收費未決 ' + (biz.pendingChargeDecision || 0) + ' · 下單未決 ' + (biz.pendingOrderDecision || 0) + ' · 待核准報價 ' + (quotes.pending || 0) + '</div>';
    html += '</div>';

    html += '<div class="dash-focus-card cool">';
    html += '<div class="dash-focus-label">本週節奏</div>';
    html += '<div class="dash-focus-value">' + week.completed + '/' + week.created + '</div>';
    html += '<div class="dash-focus-desc">完成 / 新建 · MTTR ' + ((week && week.mttr) ? week.mttr + ' 天' : '—') + '</div>';
    html += '</div>';
    html += '</div>';
    html += '</section>';
    return html;
  }
  function renderFocusBoard(repairs, quotes, orders, week, biz) {
    var buckets = [
      {
        title: '維修追蹤',
        route: 'repairs',
        items: [
          { label: '逾期維修', value: repairs.overdue.length },
          { label: '需要零件', value: repairs.needParts },
          { label: '超過 3 天未更新', value: biz.staleCount || 0 }
        ]
      },
      {
        title: '商務流程',
        route: 'quotes',
        items: [
          { label: '待核准報價', value: quotes.pending },
          { label: '收費未決', value: biz.pendingChargeDecision || 0 },
          { label: '下單未決', value: biz.pendingOrderDecision || 0 }
        ]
      },
      {
        title: '訂單交期',
        route: 'orders',
        items: [
          { label: '待到貨訂單', value: orders.ordered },
          { label: '本週完成', value: week.completed || 0 },
          { label: '本週新建', value: week.created || 0 }
        ]
      }
    ];

    var html = '<section class="dash-section dash-focus-board"><div class="dash-section-title">🎯 行動分區</div><div class="dash-bucket-grid">';
    for (var i = 0; i < buckets.length; i++) {
      var bucket = buckets[i];
      html += '<div class="dash-bucket-card" data-action="dash-goto" data-route="' + bucket.route + '">';
      html += '<div class="dash-bucket-head"><div class="dash-bucket-title">' + bucket.title + '</div><div class="dash-bucket-arrow">›</div></div>';
      html += '<div class="dash-bucket-list">';
      for (var j = 0; j < bucket.items.length; j++) {
        var item = bucket.items[j];
        html += '<div class="dash-bucket-item"><span>' + item.label + '</span><strong>' + item.value + '</strong></div>';
      }
      html += '</div></div>';
    }
    html += '</div></section>';
    return html;
  }

  function renderBillingBoard(biz) {
    var stageEntries = Object.entries(biz.stageCount || {})
      .filter(function (entry) { return entry[1] > 0; })
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 4);
    var reasonEntries = Object.entries(biz.reasonCount || {})
      .filter(function (entry) { return entry[1] > 0; })
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 4);

    var resolveLabel = function (type, value, fallback) {
      try {
        if (window.AppConfig && typeof window.AppConfig.getBusinessStatusMeta === 'function') {
          var meta = window.AppConfig.getBusinessStatusMeta(type, value);
          if (meta && meta.label) return meta.label;
        }
      } catch (_) {}
      return fallback || value || '未填';
    };

    var stageHtml = stageEntries.length
      ? stageEntries.map(function (entry) {
          return '<div class="dash-billing-mini-row"><span>' + esc(resolveLabel('billing_stage', entry[0], '未填')) + '</span><strong>' + entry[1] + '</strong></div>';
        }).join('')
      : '<div class="dash-billing-empty">目前沒有未下單分布。</div>';

    var reasonHtml = reasonEntries.length
      ? reasonEntries.map(function (entry) {
          return '<div class="dash-billing-mini-row"><span>' + esc(resolveLabel('billing_reason', entry[0], '未填')) + '</span><strong>' + entry[1] + '</strong></div>';
        }).join('')
      : '<div class="dash-billing-empty">目前沒有未下單原因。</div>';

    var html = '<section class="dash-section dash-billing-board">';
    html += '<div class="dash-section-title">💰 收費 / 請款追蹤</div>';
    html += '<div class="dash-billing-grid">';
    html += '<div class="dash-billing-card">';
    html += '<div class="dash-billing-card-title">判定總覽</div>';
    html += '<div class="dash-billing-stat-grid">';
    html += '<div class="dash-billing-stat"><span>需收費</span><strong>' + (biz.chargeable || 0) + '</strong></div>';
    html += '<div class="dash-billing-stat"><span>不需收費</span><strong>' + (biz.free || 0) + '</strong></div>';
    html += '<div class="dash-billing-stat"><span>未決定</span><strong>' + (biz.undecided || 0) + '</strong></div>';
    html += '<div class="dash-billing-stat"><span>下單未確認</span><strong>' + (biz.unknownOrder || 0) + '</strong></div>';
    html += '</div></div>';
    html += '<div class="dash-billing-card">';
    html += '<div class="dash-billing-card-title">流程節點</div>';
    html += '<div class="dash-billing-stat-grid">';
    html += '<div class="dash-billing-stat"><span>已下單</span><strong>' + (biz.ordered || 0) + '</strong></div>';
    html += '<div class="dash-billing-stat"><span>未下單</span><strong>' + (biz.notOrdered || 0) + '</strong></div>';
    html += '<div class="dash-billing-stat"><span>收費未決</span><strong>' + (biz.pendingChargeDecision || 0) + '</strong></div>';
    html += '<div class="dash-billing-stat"><span>下單未決</span><strong>' + (biz.pendingOrderDecision || 0) + '</strong></div>';
    html += '</div></div>';
    html += '<div class="dash-billing-card">';
    html += '<div class="dash-billing-card-title">未下單狀態</div>';
    html += '<div class="dash-billing-mini-list">' + stageHtml + '</div>';
    html += '</div>';
    html += '<div class="dash-billing-card">';
    html += '<div class="dash-billing-card-title">未下單原因</div>';
    html += '<div class="dash-billing-mini-list">' + reasonHtml + '</div>';
    html += '</div>';
    html += '</div></section>';
    return html;
  }

  function renderFlowBoard(funnel) {
    var cards = [
      { title: '維修入口', major: funnel.activeRepairs, minor: '需要零件 ' + funnel.needParts, note: '所有待處理案件與需要採購零件的維修。', tone: 'primary', route: 'repairs' },
      { title: '報價決策', major: funnel.quoteSubmitted, minor: '草稿 ' + funnel.quoteDraft + ' · 已核准 ' + funnel.quoteApproved, note: '報價是否正在客戶確認，直接影響後續請購節奏。', tone: 'info', route: 'quotes' },
      { title: '訂單交期', major: funnel.orderOrdered, minor: '建立 ' + funnel.orderCreated + ' · 已到貨 ' + funnel.orderArrived, note: '訂單建立、已下單到已到貨的交期節點。', tone: 'warning', route: 'orders' },
      { title: '收費 / 下單', major: funnel.chargeable, minor: '已下單 ' + funnel.billingOrdered + ' · 未閉環 ' + funnel.billingPending, note: '需收費案件是否已實際進入商務與採購流程。', tone: 'success', route: 'analytics' }
    ];

    var html = '<section class="dash-section dash-flow-board"><div class="dash-section-head"><div class="dash-section-title">🧭 主流程漏斗</div><div class="dash-section-subtitle">將維修、報價、訂單與收費追蹤拉回同一個管理視角。</div></div><div class="dash-flow-grid">';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      html += '<article class="dash-flow-card tone-' + c.tone + '" data-action="dash-goto" data-route="' + c.route + '">';
      html += '<div class="dash-flow-card-head"><div class="dash-flow-card-title">' + c.title + '</div><div class="dash-flow-card-arrow">›</div></div>';
      html += '<div class="dash-flow-card-value">' + c.major + '</div>';
      html += '<div class="dash-flow-card-minor">' + c.minor + '</div>';
      html += '<div class="dash-flow-card-note">' + c.note + '</div>';
      html += '</article>';
    }
    html += '</div></section>';
    return html;
  }

  function renderDeliveryBoard(orderWatch) {
    var list = orderWatch.watchList || [];
    var listHtml = list.length ? list.map(function (item) {
      return '<button type="button" class="dash-watch-item tone-' + esc(item.tagTone) + '" data-action="dash-open-order" data-id="' + esc(item.id) + '">' +
        '<div class="dash-watch-copy"><div class="dash-watch-title">' + esc(item.orderNo) + (item.vendor ? ' · ' + esc(item.vendor) : '') + '</div><div class="dash-watch-meta">' + esc(item.expectedAt ? ('ETA ' + item.expectedAt) : '尚未指定 ETA') + '</div></div>' +
        '<span class="dash-watch-tag">' + esc(item.tag) + '</span>' +
      '</button>';
    }).join('') : '<div class="dash-watch-empty">目前沒有需要特別追蹤的交期案件。</div>';

    return '<section class="dash-section dash-delivery-board">' +
      '<div class="dash-section-head"><div class="dash-section-title">🚚 交期監控</div><div class="dash-section-subtitle">針對已下單但尚未到貨的案件，直接追蹤 ETA、逾期與無 ETA 風險。</div></div>' +
      '<div class="dash-delivery-grid">' +
        '<div class="dash-delivery-stat"><span>交期逾期</span><strong>' + (orderWatch.overdue || 0) + '</strong></div>' +
        '<div class="dash-delivery-stat"><span>7 天內到貨</span><strong>' + (orderWatch.dueSoon || 0) + '</strong></div>' +
        '<div class="dash-delivery-stat"><span>未設定 ETA</span><strong>' + (orderWatch.missingEta || 0) + '</strong></div>' +
        '<div class="dash-delivery-stat"><span>已下單超過 7 天</span><strong>' + (orderWatch.stalledOrdered || 0) + '</strong></div>' +
      '</div>' +
      '<div class="dash-watch-list">' + listHtml + '</div>' +
    '</section>';
  }

  function renderEngineerBoard(team) {
    var rows = team && team.length ? team.map(function (row, index) {
      return '<div class="dash-owner-row">' +
        '<div class="dash-owner-rank">' + (index + 1) + '</div>' +
        '<div class="dash-owner-main"><div class="dash-owner-name">' + esc(row.name) + '</div><div class="dash-owner-meta">進行中 ' + row.active + ' · 需要零件 ' + row.needParts + ' · 待更新 ' + row.stale + '</div></div>' +
        '<div class="dash-owner-side">' + (row.urgent > 0 ? '<span class="dash-owner-urgent">緊急 ' + row.urgent + '</span>' : '<span class="dash-owner-ok">穩定</span>') + '</div>' +
      '</div>';
    }).join('') : '<div class="dash-watch-empty">目前沒有進行中的工程師負載資料。</div>';

    return '<section class="dash-section dash-owner-board">' +
      '<div class="dash-section-head"><div class="dash-section-title">👤 工程師負載</div><div class="dash-section-subtitle">以目前進行中維修為準，集中看每位工程師的活躍案件、需要零件與待更新數量。</div></div>' +
      '<div class="dash-owner-list">' + rows + '</div>' +
    '</section>';
  }

  // === Render ===

  function renderKPI(repairs, quotes, orders, week) {
    var cards = [
      { label: '進行中', value: repairs.active, color: 'var(--module-accent, #2563eb)', route: 'repairs' },
      { label: '需要零件', value: repairs.needParts, color: '#f59e0b', route: 'repairs' },
      { label: '待核准報價', value: quotes.pending, color: '#4f46e5', route: 'quotes' },
      { label: '待到貨訂單', value: orders.ordered, color: '#d97706', route: 'orders' },
      { label: '逾期維修', value: repairs.overdue.length, color: '#ef4444', route: 'repairs' },
      { label: 'MTTR', value: (week && week.mttr) ? (week.mttr + ' 天') : '—', color: '#0ea5e9' },
      { label: '轉單率', value: (week && week.quotesSubmitted) ? (week.conversion + '%') : '—', color: '#10b981' }
    ];

    var html = '<div class="dash-kpi-grid">';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var urgent = (c.value > 0 && (c.label === '逾期維修' || c.label === '需要零件'));
      html += '<div class="dash-kpi-card' + (urgent ? ' urgent' : '') + '" data-action="dash-goto" data-route="' + c.route + '">';
      html += '<div class="dash-kpi-value" style="color:' + c.color + ';">' + c.value + '</div>';
      html += '<div class="dash-kpi-label">' + c.label + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // 本週摘要列
    html += '<div class="dash-week-summary">';
    html += '<span>📅 本週：新建 <strong>' + week.created + '</strong> 張、完成 <strong>' + week.completed + '</strong> 張';
    html += '　·　平均處理天數 <strong>' + repairs.avgAge + '</strong> 天';
    if (week && week.mttr) html += '　·　本週 MTTR <strong>' + week.mttr + '</strong> 天';
    if (week && week.quotesSubmitted) html += '　·　本週轉單率 <strong>' + week.conversion + '%</strong>' + '（' + week.ordersCreated + '/' + week.quotesSubmitted + '）';
    html += '</span>';
    html += '</div>';

    return html;
  }

  function renderActionItems(repairs, quotes, orders, biz) {
    var items = [];

    // 逾期維修
    for (var i = 0; i < repairs.overdue.length; i++) {
      var r = repairs.overdue[i];
      var age = daysSince(r.createdDate || r.createdAt);
      items.push({
        icon: '🔴', severity: 'high',
        text: '維修逾期 ' + age + ' 天：' + esc(r.customer || '') + ' — ' + esc(r.machine || '') + ' (' + esc(r.repairNo || r.id) + ')',
        action: 'dash-open-repair', id: r.id
      });
    }

    // 超過 3 天未更新
    for (var s = 0; s < (biz && biz.staleActive ? biz.staleActive.length : 0); s++) {
      var stale = biz.staleActive[s];
      items.push({
        icon: '🟠', severity: 'medium',
        text: '超過 ' + stale.staleDays + ' 天未更新：' + esc(stale.customer || '') + ' — ' + esc(stale.machine || '') + ' (' + esc(stale.repairNo || stale.id) + ')',
        action: 'dash-open-repair', id: stale.id
      });
    }

    // 待核准報價
    for (var j = 0; j < quotes.pendingList.length; j++) {
      var q = quotes.pendingList[j];
      items.push({
        icon: '🟡', severity: 'medium',
        text: '報價待核准：' + esc(q.quoteNo || q.id) + (q.customer ? ' — ' + esc(q.customer) : ''),
        action: 'dash-open-quote', id: q.id
      });
    }

    // 待到貨訂單
    for (var k = 0; k < orders.orderedList.length; k++) {
      var o = orders.orderedList[k];
      items.push({
        icon: '🟠', severity: 'medium',
        text: '訂單待到貨：' + esc(o.orderNo || o.id) + (o.vendor ? ' — ' + esc(o.vendor) : ''),
        action: 'dash-open-order', id: o.id
      });
    }

    if (items.length === 0) {
      return '<div class="dash-section"><div class="dash-section-title">✅ 待辦事項</div>' +
        '<div class="dash-empty">目前沒有需要處理的項目，做得好！</div></div>';
    }

    // sort: high first
    items.sort(function (a, b) {
      var r = { high: 0, medium: 1, low: 2 };
      return (r[a.severity] || 9) - (r[b.severity] || 9);
    });

    var html = '<div class="dash-section"><div class="dash-section-title">⚡ 待辦事項 <span class="dash-badge">' + items.length + '</span></div>';
    html += '<div class="dash-action-list">';
    for (var n = 0; n < items.length; n++) {
      var it = items[n];
      html += '<div class="dash-action-item ' + it.severity + '" data-action="' + it.action + '"';
      if (it.id) html += ' data-id="' + esc(it.id) + '"';
      if (it.route) html += ' data-route="' + esc(it.route) + '"';
      html += '>';
      html += '<span class="dash-action-icon">' + it.icon + '</span>';
      html += '<span class="dash-action-text">' + it.text + '</span>';
      html += '<span class="dash-action-arrow">›</span>';
      html += '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function renderNotifications() {
    if (!window.NotificationCenter || typeof window.NotificationCenter.getAll !== 'function') return '';

    var items = window.NotificationCenter.getAll();
    if (!items || items.length === 0) return '';

    var unread = items.filter(function (n) { return !n.read; });

    var html = '<div class="dash-section"><div class="dash-section-title">🔔 最新通知';
    if (unread.length > 0) html += ' <span class="dash-badge">' + unread.length + '</span>';
    html += '</div>';
    html += '<div class="dash-notification-list">';

    var shown = items.slice(0, 8);
    for (var i = 0; i < shown.length; i++) {
      var n = shown[i];
      html += '<div class="dash-notif-item' + (n.read ? '' : ' unread') + '" data-action="dash-notif-click" data-id="' + esc(n.id) + '">';
      html += '<span class="dash-notif-icon">' + (n.icon || '📌') + '</span>';
      html += '<div class="dash-notif-body">';
      html += '<div class="dash-notif-text">' + esc(n.text) + '</div>';
      html += '<div class="dash-notif-time">' + esc(n.timeLabel || fmtDate(n.createdAt)) + '</div>';
      html += '</div>';
      if (!n.read) html += '<span class="dash-notif-dot"></span>';
      html += '</div>';
    }

    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderQuickActions() {
    return '<div class="dash-section">' +
      '<div class="dash-section-title">🚀 快速操作</div>' +
      '<div class="dash-quick-grid">' +
        '<button class="dash-quick-btn" data-action="dash-new-repair">📋 新建維修單</button>' +
        '<button class="dash-quick-btn" data-action="dash-goto" data-route="weekly">📊 週報</button>' +
        '<button class="dash-quick-btn" data-action="dash-goto" data-route="machines">🖥️ 機台歷史</button>' +
        '<button class="dash-quick-btn" data-action="dash-goto" data-route="customers">👥 客戶管理</button>' +
      '</div>' +
    '</div>';
  }

  // === DashboardUI Class ===

  function DashboardUI() {
    this._containerId = null;
    this._delegated = false;
  }

  DashboardUI.prototype.render = function (containerId) {
    this._containerId = containerId;
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="dashboard-module" id="dashboard-root">' + this._buildHTML() + '</div>';
    this._bindEvents();
  };

  DashboardUI.prototype.refresh = function () {
    var root = document.getElementById('dashboard-root');
    if (!root) return;
    root.innerHTML = this._buildHTML();
  };

  DashboardUI.prototype._buildHTML = function () {
    var repairs = getRepairStats();
    var quotes = getQuoteStats();
    var orders = getOrderStats();
    var week = getThisWeekKPI();
    var biz = getBusinessActionStats();
    var funnel = getFunnelStats();
    var orderWatch = getOrderWatchStats();
    var team = getEngineerLoadStats();

    var html = '<div class="dash-container">';
    html += renderCommandCenter(repairs, quotes, orders, week, biz);
    html += renderFlowBoard(funnel);

    // KPI 卡片
    html += renderKPI(repairs, quotes, orders, week);
    html += renderBillingBoard(biz);

    html += '<div class="dash-two-col dash-two-col--ops">';
    html += '<div class="dash-col-main">';
    html += renderDeliveryBoard(orderWatch);
    html += renderActionItems(repairs, quotes, orders, biz);
    html += renderFocusBoard(repairs, quotes, orders, week, biz);
    html += '</div>';
    html += '<div class="dash-col-side">';
    html += renderEngineerBoard(team);
    html += renderNotifications();
    html += renderQuickActions();
    html += '</div>';
    html += '</div>';

    html += '</div>'; // container
    return html;
  };

  DashboardUI.prototype._bindEvents = function () {
    if (this._delegated) return;
    this._delegated = true;

    var self = this;
    document.addEventListener('click', function (e) {
      var el = e.target ? e.target.closest('[data-action]') : null;
      if (!el) return;
      // 確認在 dashboard 範圍內
      var root = document.getElementById('dashboard-root');
      if (!root || !root.contains(el)) return;

      var action = el.getAttribute('data-action');
      var id = el.getAttribute('data-id') || '';
      var route = el.getAttribute('data-route') || '';

      try {
        switch (action) {
          case 'dash-goto':
            if (route && window.AppRouter) window.AppRouter.navigate(route);
            break;

          case 'dash-new-repair':
            self._gotoAndDo('repairs', function () {
              // Repairs UI 採 static API（RepairUI.openForm / RepairUI.openDetail）
              if (!window.RepairUI || typeof window.RepairUI.openForm !== 'function') {
                throw new Error('RepairUI not ready');
              }
              window.RepairUI.openForm(null);
            });
            break;
          case 'dash-open-repair':
            (function (repairId) {
              self._gotoAndDoAsync('repairs', async function () {
                if (!repairId) throw new Error('missing repair id');

                // 1) 先確保 RepairService 已初始化並完成載入（避免第一次點只跳到列表）
                if (!window.AppRegistry || typeof window.AppRegistry.ensureReady !== 'function') {
                  throw new Error('AppRegistry not ready');
                }
                await window.AppRegistry.ensureReady(['RepairService']);

                var rs = null;
                try { rs = (typeof window._svc === 'function') ? window._svc('RepairService') : null; } catch (_) { rs = null; }
                if (!rs) throw new Error('RepairService not ready');

                // 若該筆資料仍未進入快取，嘗試觸發一次 loadData（不做 controller 分散 init，只補強資料就緒）
                if (typeof rs.get === 'function' && !rs.get(repairId) && typeof rs.loadData === 'function') {
                  await rs.loadData();
                }
                if (typeof rs.get === 'function' && !rs.get(repairId)) {
                  throw new Error('Repair data not loaded yet');
                }

                // 2) 確保 Repairs UI 已可用後再開啟詳情
                if (!window.RepairUI || typeof window.RepairUI.openDetail !== 'function') {
                  throw new Error('RepairUI not ready');
                }

                // 3) 修正：第一次導頁後 DOM 尚未渲染完成（modal 節點不存在）會導致 openDetail 無效
                var modal = document.getElementById('repair-modal');
                var content = document.getElementById('repair-modal-content');
                if (!modal || !content) {
                  throw new Error('Repair detail modal not ready');
                }

                window.RepairUI.openDetail(repairId);
              }, 6000, 90).catch(function (e) { console.error('dash-open-repair failed', e); });
            })(id);
            break;

          case 'dash-open-quote':
            self._gotoAndDo('quotes', function () {
              if (!id) throw new Error('missing quote id');
              if (!window.quotesUI || typeof window.quotesUI.openDetail !== 'function') {
                throw new Error('quotesUI not ready');
              }
              window.quotesUI.openDetail(id);
            });
            break;

          case 'dash-open-order':
            self._gotoAndDo('orders', function () {
              if (!id) throw new Error('missing order id');
              if (!window.ordersUI || typeof window.ordersUI.openDetail !== 'function') {
                throw new Error('ordersUI not ready');
              }
              window.ordersUI.openDetail(id);
            });
            break;

          case 'dash-notif-click':
            if (window.NotificationCenter && typeof window.NotificationCenter.handleClick === 'function') {
              window.NotificationCenter.handleClick(id);
            }
            break;
        }
      } catch (err) {
        console.error('Dashboard action failed:', action, err);
      }
    });
  };

  DashboardUI.prototype._gotoAndDo = function (route, fn) {
    if (!window.AppRouter) return;
    window.AppRouter.navigate(route);
    // 給模組時間載入：改成等待條件成立（避免慢機器/手機上 350ms 不夠）
    this._waitFor(fn, 2200, 80);
  };


  // async 版本：可等待 service/data 就緒（用於第一次點擊就能開詳情）
  DashboardUI.prototype._gotoAndDoAsync = function (route, fnAsync, timeoutMs, intervalMs) {
    if (!window.AppRouter) return Promise.reject(new Error('AppRouter not ready'));
    window.AppRouter.navigate(route);
    return this._waitForAsync(fnAsync, timeoutMs || 5000, intervalMs || 80);
  };

  DashboardUI.prototype._waitForAsync = function (fnAsync, timeoutMs, intervalMs) {
    var start = Date.now();
    var timeout = Math.max(500, timeoutMs || 5000);
    var interval = Math.max(50, intervalMs || 80);

    return new Promise(function (resolve, reject) {
      var lastErr = null;
      var tick = function () {
        Promise.resolve()
          .then(fnAsync)
          .then(function () { resolve(); })
          .catch(function (e) {
            lastErr = e;
            if (Date.now() - start >= timeout) {
              reject(lastErr || new Error('timeout'));
              return;
            }
            setTimeout(tick, interval);
          });
      };

      setTimeout(tick, interval);
    });
  };

/**
   * 等待條件成立後執行動作。
   * - 避免固定延遲在慢機器/手機上不夠
   * - 也避免無限等待
   */
  DashboardUI.prototype._waitFor = function (fn, timeoutMs, intervalMs) {
    var start = Date.now();
    var timeout = Math.max(300, timeoutMs || 2000);
    var interval = Math.max(50, intervalMs || 80);

    var tick = function () {
      try {
        fn();
        return;
      } catch (e) {
        // 若模組尚未載入（例如 window.repairUI 尚未建立），就等下一輪
      }

      if (Date.now() - start >= timeout) return;
      setTimeout(tick, interval);
    };

    setTimeout(tick, interval);
  };

  // === Export ===
  var dashboardUI = new DashboardUI();
  window.DashboardUI = DashboardUI;
  window.dashboardUI = dashboardUI;
  try { window.AppRegistry && window.AppRegistry.register('dashboardUI', dashboardUI); } catch (_) {}
  console.log('✅ DashboardUI loaded');
})();
