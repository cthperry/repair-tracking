/**
 * 儀表板 - UI
 * Phase 2 — Dashboard (首頁總覽)
 *
 * 資料來源：
 *   RepairService    → 維修統計 / 逾期維修
 *   QuoteService     → 待核准報價
 *   OrderService     → 待到貨訂單
 *   MaintenanceService → 逾期保養
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

  function getMaintenanceStats() {
    var svc = _svc('MaintenanceService');
    if (!svc || typeof svc.getStats === 'function') {
      try {
        if (svc && !svc.isInitialized && typeof svc.init === 'function') {
          // 非同步 init 已在 controller 處理，這裡直接讀
        }
        var stats = svc && svc.getStats ? svc.getStats() : null;
        var dueList = svc && svc.getDueList ? svc.getDueList() : [];
        var urgent = dueList.filter(function (r) {
          var s = r && r.due ? r.due.status : '';
          return s === 'overdue' || s === 'dueSoon1';
        });
        return {
          total: stats ? stats.total : 0,
          overdue: stats ? stats.overdue : 0,
          dueSoon: stats ? stats.dueSoon : 0,
          compliance: stats ? stats.compliance : 0,
          urgentList: urgent.slice(0, 5)
        };
      } catch (_) {}
    }
    return { total: 0, overdue: 0, dueSoon: 0, compliance: 0, urgentList: [] };
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

  // === Render ===

  function renderKPI(repairs, quotes, orders, maint, week) {
    var cards = [
      { label: '進行中', value: repairs.active, color: 'var(--module-accent, #2563eb)', route: 'repairs' },
      { label: '需要零件', value: repairs.needParts, color: '#f59e0b', route: 'repairs' },
      { label: '待核准報價', value: quotes.pending, color: '#4f46e5', route: 'quotes' },
      { label: '待到貨訂單', value: orders.ordered, color: '#d97706', route: 'orders' },
      { label: '保養逾期', value: maint.overdue, color: '#ef4444', route: 'maintenance' },
      { label: '保養即將到期', value: maint.dueSoon, color: '#f59e0b', route: 'maintenance' }
    ,
      { label: 'MTTR', value: (week && week.mttr) ? (week.mttr + ' 天') : '—', color: '#0ea5e9' },
      { label: '轉單率', value: (week && week.quotesSubmitted) ? (week.conversion + '%') : '—', color: '#10b981' }
    ];

    var html = '<div class="dash-kpi-grid">';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var urgent = (c.value > 0 && (c.label === '保養逾期' || c.label === '需要零件'));
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

  function renderActionItems(repairs, quotes, orders, maint) {
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

    // 保養逾期/即將到期
    for (var m = 0; m < maint.urgentList.length; m++) {
      var eq = maint.urgentList[m].equipment || {};
      var due = maint.urgentList[m].due || {};
      var tag = due.status === 'overdue' ? '逾期' : '即將到期';
      items.push({
        icon: due.status === 'overdue' ? '🔴' : '🟡',
        severity: due.status === 'overdue' ? 'high' : 'medium',
        text: '保養' + tag + '：' + esc(eq.equipmentNo || '') + ' ' + esc(eq.name || '') + (due.nextDue ? '（到期 ' + esc(due.nextDue) + '）' : ''),
        action: 'dash-goto', route: 'maintenance'
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
    var maint = getMaintenanceStats();
    var week = getThisWeekKPI();

    var html = '<div class="dash-container">';

    // KPI 卡片
    html += renderKPI(repairs, quotes, orders, maint, week);

    // 兩欄佈局
    html += '<div class="dash-two-col">';

    // 左欄：待辦事項
    html += '<div class="dash-col-main">';
    html += renderActionItems(repairs, quotes, orders, maint);
    html += '</div>';

    // 右欄：通知 + 快速操作
    html += '<div class="dash-col-side">';
    html += renderNotifications();
    html += renderQuickActions();
    html += '</div>';

    html += '</div>'; // two-col
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
