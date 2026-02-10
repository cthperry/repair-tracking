/**
 * NotificationCenter — 通知/提醒中心
 * Phase 2
 *
 * 設計原則：
 * - 純前端計算，不新增 Firebase 節點（讀取既有 Service 資料即可）
 * - 每次 refresh 從 RepairService/QuoteService/OrderService/MaintenanceService 彙算
 * - 通知的「已讀」狀態存 localStorage（輕量）
 * - Dashboard / Header badge 皆可讀取
 */
(function () {
  'use strict';

  var _notifications = [];
  var _readSet = new Set();
  var _listeners = [];
  var _refreshTimer = null;
  var _LS_KEY = '';

  // === Helpers ===

  var _svc = function (name) {
    try { if (window.AppRegistry && typeof window.AppRegistry.get === 'function') return window.AppRegistry.get(name); } catch (_) {}
    try { if (typeof window._svc === 'function') return window._svc(name); } catch (_) {}
    return null;
};

  var _scopeKey = function () {
    try {
      if (typeof window.getUserScopeKey === 'function') return window.getUserScopeKey();
    } catch (_) {}
    try {
      var u = (window.AppState && window.AppState.getCurrentUser) ? window.AppState.getCurrentUser() : window.currentUser;
      return (u && u.uid) ? u.uid : 'unknown';
    } catch (_) { return 'unknown'; }
  };

  var _daysSince = function (isoStr) {
    if (!isoStr) return NaN;
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return NaN;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  };

  var _fmtDate = function (isoStr) {
    if (!isoStr) return '';
    try {
      var d = new Date(isoStr);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    } catch (_) { return ''; }
  };

  var _timeLabel = function (isoStr) {
    var days = _daysSince(isoStr);
    if (!isFinite(days)) return '';
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return days + ' 天前';
    return _fmtDate(isoStr);
  };

  // === Load / Save read state ===

  function _loadReadState() {
    _LS_KEY = 'notif_read_' + _scopeKey();
    try {
      var raw = localStorage.getItem(_LS_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        _readSet = new Set(Array.isArray(arr) ? arr : []);
      }
    } catch (_) {}
  }

  function _saveReadState() {
    try {
      localStorage.setItem(_LS_KEY, JSON.stringify(Array.from(_readSet)));
    } catch (_) {}
  }

  // === Notification Generators ===

  function _genRepairOverdue() {
    var svc = _svc('RepairService');
    if (!svc || typeof svc.getAll !== 'function') return [];

    var all = (svc.getAll() || []).filter(function (r) { return r && !r.isDeleted && r.status !== '已完成'; });
    var out = [];

    for (var i = 0; i < all.length; i++) {
      var r = all[i];
      var days = _daysSince(r.createdDate || r.createdAt);
      if (!isFinite(days) || days < 14) continue;

      var thresholds = [30, 21, 14];
      for (var t = 0; t < thresholds.length; t++) {
        if (days >= thresholds[t]) {
          out.push({
            id: 'repair-overdue-' + r.id + '-' + thresholds[t],
            type: 'repair-overdue',
            severity: thresholds[t] >= 30 ? 'high' : 'medium',
            icon: '⏰',
            text: '維修單 ' + (r.repairNo || r.id) + '（' + (r.customer || '') + '）已逾期 ' + days + ' 天',
            createdAt: r.createdAt,
            timeLabel: _timeLabel(r.createdAt),
            route: 'repairs',
            targetId: r.id
          });
          break; // 同一張只取最高層級
        }
      }
    }
    return out;
  }

  function _genQuotePending() {
    var svc = _svc('QuoteService');
    if (!svc || typeof svc.getAll !== 'function') return [];

    var all = (svc.getAll() || []).filter(function (q) { return q && !q.isDeleted && q.status === '已送出'; });
    var out = [];

    for (var i = 0; i < all.length; i++) {
      var q = all[i];
      var days = _daysSince(q.updatedAt || q.createdAt);
      if (!isFinite(days) || days < 3) continue;

      out.push({
        id: 'quote-pending-' + q.id,
        type: 'quote-pending',
        severity: days >= 7 ? 'high' : 'medium',
        icon: '📝',
        text: '報價 ' + (q.quoteNo || q.id) + ' 已送出 ' + days + ' 天，尚未核准',
        createdAt: q.updatedAt || q.createdAt,
        timeLabel: _timeLabel(q.updatedAt || q.createdAt),
        route: 'quotes',
        targetId: q.id
      });
    }
    return out;
  }

  function _genOrderWaiting() {
    var svc = _svc('OrderService');
    if (!svc || typeof svc.getAll !== 'function') return [];

    var all = (svc.getAll() || []).filter(function (o) { return o && !o.isDeleted && o.status === '已下單'; });
    var out = [];

    for (var i = 0; i < all.length; i++) {
      var o = all[i];
      var days = _daysSince(o.updatedAt || o.createdAt);
      if (!isFinite(days) || days < 5) continue;

      out.push({
        id: 'order-waiting-' + o.id,
        type: 'order-waiting',
        severity: days >= 14 ? 'high' : 'medium',
        icon: '📦',
        text: '訂單 ' + (o.orderNo || o.id) + ' 已下單 ' + days + ' 天，尚未到貨',
        createdAt: o.updatedAt || o.createdAt,
        timeLabel: _timeLabel(o.updatedAt || o.createdAt),
        route: 'orders',
        targetId: o.id
      });
    }
    return out;
  }

  function _genMaintenanceDue() {
    var svc = _svc('MaintenanceService');
    if (!svc || typeof svc.getDueList !== 'function') return [];

    var list = svc.getDueList() || [];
    var out = [];

    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      var eq = row.equipment || {};
      var due = row.due || {};

      if (due.status !== 'overdue' && due.status !== 'dueSoon1') continue;

      var label = due.status === 'overdue' ? '已逾期' : '即將到期';
      out.push({
        id: 'maint-due-' + (eq.id || i),
        type: 'maintenance-due',
        severity: due.status === 'overdue' ? 'high' : 'medium',
        icon: '🛠️',
        text: '設備 ' + (eq.equipmentNo || '') + ' ' + (eq.name || '') + ' 保養' + label + (due.nextDue ? '（到期 ' + due.nextDue + '）' : ''),
        createdAt: new Date().toISOString(),
        timeLabel: due.nextDue || '',
        route: 'maintenance',
        targetId: eq.id
      });
    }
    return out;
  }

  function _genPartsNeeded() {
    var svc = _svc('RepairPartsService');
    if (!svc || typeof svc.getAll !== 'function') return [];

    var all = (svc.getAll() || []).filter(function (p) { return p && !p.isDeleted; });
    var out = [];

    // 零件狀態為「需求提出」超過 7 天
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      if (p.status !== '需求提出') continue;
      var days = _daysSince(p.createdAt);
      if (!isFinite(days) || days < 7) continue;

      out.push({
        id: 'parts-stale-' + p.id,
        type: 'parts-stale',
        severity: days >= 14 ? 'high' : 'medium',
        icon: '🧩',
        text: '零件「' + (p.partName || p.name || '未命名') + '」需求已提出 ' + days + ' 天，尚未報價/下單',
        createdAt: p.createdAt,
        timeLabel: _timeLabel(p.createdAt),
        route: 'parts',
        targetId: p.id
      });
    }
    return out;
  }

  // === Core API ===

  function refresh() {
    _loadReadState();

    var all = [];
    try { all = all.concat(_genRepairOverdue()); } catch (_) {}
    try { all = all.concat(_genQuotePending()); } catch (_) {}
    try { all = all.concat(_genOrderWaiting()); } catch (_) {}
    try { all = all.concat(_genMaintenanceDue()); } catch (_) {}
    try { all = all.concat(_genPartsNeeded()); } catch (_) {}

    // 標記已讀
    for (var i = 0; i < all.length; i++) {
      all[i].read = _readSet.has(all[i].id);
    }

    // 排序：未讀 > severity high > medium > time desc
    all.sort(function (a, b) {
      if (a.read !== b.read) return a.read ? 1 : -1;
      var sev = { high: 0, medium: 1, low: 2 };
      var sa = sev[a.severity] != null ? sev[a.severity] : 9;
      var sb = sev[b.severity] != null ? sev[b.severity] : 9;
      if (sa !== sb) return sa - sb;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });

    _notifications = all;
    _notifyListeners();
    _updateBadge();

    try { window.dispatchEvent(new Event("notif:changed")); } catch (_) {}
  }

  function getAll() {
    return _notifications;
  }

  function getUnreadCount() {
    var c = 0;
    for (var i = 0; i < _notifications.length; i++) {
      if (!_notifications[i].read) c++;
    }
    return c;
  }

  function markRead(id) {
    _readSet.add(id);
    _saveReadState();
    for (var i = 0; i < _notifications.length; i++) {
      if (_notifications[i].id === id) _notifications[i].read = true;
    }
    _notifyListeners();
    _updateBadge();
  }

  function markAllRead() {
    for (var i = 0; i < _notifications.length; i++) {
      _readSet.add(_notifications[i].id);
      _notifications[i].read = true;
    }
    _saveReadState();
    _notifyListeners();
    _updateBadge();
  }

  function handleClick(id) {
    var notif = null;
    for (var i = 0; i < _notifications.length; i++) {
      if (_notifications[i].id === id) { notif = _notifications[i]; break; }
    }
    if (!notif) return;

    markRead(id);

    // 跳轉
    if (notif.route && window.AppRouter) {
      window.AppRouter.navigate(notif.route);
      // 延遲開啟明細
      if (notif.targetId) {
        setTimeout(function () {
          try {
            switch (notif.route) {
              case 'repairs':
                if (window.repairUI && typeof window.repairUI.openDetail === 'function') window.repairUI.openDetail(notif.targetId);
                break;
              case 'quotes':
                if (window.quotesUI && typeof window.quotesUI.openDetail === 'function') window.quotesUI.openDetail(notif.targetId);
                break;
              case 'orders':
                if (window.ordersUI && typeof window.ordersUI.openDetail === 'function') window.ordersUI.openDetail(notif.targetId);
                break;
            }
          } catch (_) {}
        }, 400);
      }
    }
  }

  function onChange(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
  }

  function _notifyListeners() {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](_notifications); } catch (_) {}
    }
  }

  // === Header Badge ===

  function _updateBadge() {
    var count = getUnreadCount();
    var badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  // === Auto-refresh (監聽資料變更) ===

  function _setupAutoRefresh() {
    window.addEventListener('data:changed', function () {
      if (_refreshTimer) return;
      _refreshTimer = setTimeout(function () {
        _refreshTimer = null;
        refresh();
      }, 500);
    });

    // 也監聽各模組就緒
    var events = ['repairs:ready', 'quotes:ready', 'orders:ready', 'machines:ready', 'maintenance:ready'];
    for (var i = 0; i < events.length; i++) {
      window.addEventListener(events[i], function () {
        setTimeout(refresh, 200);
      });
    }
  }

  // === Init ===

  function init() {
    _loadReadState();
    _setupAutoRefresh();
    // 初次延遲 refresh（等 Service init 完）
    setTimeout(refresh, 800);
  }

  // === Export ===

  window.NotificationCenter = {
    init: init,
    refresh: refresh,
    getAll: getAll,
    getUnreadCount: getUnreadCount,
    markRead: markRead,
    markAllRead: markAllRead,
    handleClick: handleClick,
    onChange: onChange
  };

  try { window.AppRegistry && window.AppRegistry.register('NotificationCenter', window.NotificationCenter); } catch (_) {}
  console.log('✅ NotificationCenter loaded');
})();
