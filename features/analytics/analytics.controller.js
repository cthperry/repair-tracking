/**
 * Analytics Controller（資料分析面板）
 * 路由：analytics
 *
 * Phase 1 DoD 相容：
 * - 不允許 window[ServiceName] fallback
 * - Controller 不做分散 init（不呼叫 svc.init()）
 * - 統一用 AppRegistry.ensureReady + window._svc()
 */

class AnalyticsController {
  constructor() {
    this.isInitialized = false;
  }

  async _ensureServicesReady() {
    try {
      if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
        await window.AppRegistry.ensureReady(['RepairService', 'MaintenanceService'], { silent: true });
      }
    } catch (e) {
      // silent: analytics 不應阻斷
      console.warn('Analytics: ensureReady failed', e);
    }
  }

  async reload(containerId = 'main-content') {
    await this._ensureServicesReady();

    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      container.innerHTML = '<div class="analytics-loading">計算中…</div>';
      const data = this._compute();
      container.innerHTML = window.AnalyticsUI ? window.AnalyticsUI.render(data) : '<div class="msg-error">AnalyticsUI 未載入</div>';
      try { window.AnalyticsUI?.bindEvents?.(container); } catch (_) {}
      this.isInitialized = true;
    } catch (e) {
      console.error('Analytics reload failed:', e);
      container.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:#ef4444;">載入失敗：${e?.message || ''}</div>`;
    }
  }

  _getSvc(name) {
    try {
      if (typeof window._svc === 'function') return window._svc(name);
    } catch (_) {}
    return null;
  }

  _allRepairs() {
    try {
      const rs = this._getSvc('RepairService');
      if (!rs) return [];
      const all = (typeof rs.getAll === 'function') ? rs.getAll() : (rs.repairs || []);
      return (all || []).filter(r => r && !r.isDeleted);
    } catch (_) {
      return [];
    }
  }

  _toYM(dateStr) {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        const m = String(dateStr).match(/(\d{4})-(\d{2})/);
        return m ? `${m[1]}-${m[2]}` : '';
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch (_) {
      return '';
    }
  }

  _lastNMonths(n) {
    const months = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }

  _daysBetween(a, b) {
    try {
      const da = new Date(a).getTime();
      const db = new Date(b).getTime();
      if (isNaN(da) || isNaN(db)) return 0;
      return Math.max(0, Math.round((db - da) / 86400000));
    } catch (_) {
      return 0;
    }
  }

  _compute() {
    const repairs = this._allRepairs();
    const months = this._lastNMonths(6);

    // 1) 月別建立/完成
    const monthlyCreated = {};
    const monthlyCompleted = {};
    for (const m of months) { monthlyCreated[m] = 0; monthlyCompleted[m] = 0; }

    for (const r of repairs) {
      const cm = this._toYM(r.createdAt || r.createdDate);
      if (cm && monthlyCreated[cm] !== undefined) monthlyCreated[cm]++;
      if (r.status === '已完成' && r.completedAt) {
        const dm = this._toYM(r.completedAt);
        if (dm && monthlyCompleted[dm] !== undefined) monthlyCompleted[dm]++;
      }
    }

    const trend = months.map(m => ({
      month: m,
      label: m.slice(5),
      created: monthlyCreated[m] || 0,
      completed: monthlyCompleted[m] || 0
    }));

    // 2) 狀態分佈（未完成）
    const statusCount = {};
    const active = repairs.filter(r => r.status !== '已完成');
    for (const r of active) {
      const s = r.status || '未知';
      statusCount[s] = (statusCount[s] || 0) + 1;
    }

    // 3) 平均完成天數（月別）
    const completedRepairs = repairs.filter(r => r.status === '已完成' && r.completedAt && r.createdAt);
    const avgDaysByMonth = {};
    for (const m of months) avgDaysByMonth[m] = { total: 0, count: 0 };

    for (const r of completedRepairs) {
      const m = this._toYM(r.completedAt);
      if (m && avgDaysByMonth[m]) {
        const days = this._daysBetween(r.createdAt, r.completedAt);
        if (days >= 0) {
          avgDaysByMonth[m].total += days;
          avgDaysByMonth[m].count++;
        }
      }
    }

    const avgTrend = months.map(m => ({
      month: m,
      label: m.slice(5),
      avg: avgDaysByMonth[m].count ? Math.round(avgDaysByMonth[m].total / avgDaysByMonth[m].count * 10) / 10 : 0
    }));

    // 4) 客戶 Top 10
    const custCount = {};
    for (const r of repairs) {
      const c = (r.customer || '').trim();
      if (c) custCount[c] = (custCount[c] || 0) + 1;
    }
    const topCustomers = Object.entries(custCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 5) 設備 Top 10
    const machineCount = {};
    for (const r of repairs) {
      const m = (r.machine || '').trim();
      if (m) machineCount[m] = (machineCount[m] || 0) + 1;
    }
    const topMachines = Object.entries(machineCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 6) KPI
    const totalActive = active.length;
    const totalCompleted = completedRepairs.length;
    const totalAll = repairs.length;
    const overallAvgDays = completedRepairs.length
      ? Math.round(completedRepairs.reduce((s, r) => s + this._daysBetween(r.createdAt, r.completedAt), 0) / completedRepairs.length * 10) / 10
      : 0;

    // 7) 保養合規率（若可用）
    let maintenanceStats = null;
    try {
      const ms = this._getSvc('MaintenanceService');
      if (ms && typeof ms.getEquipments === 'function' && typeof ms.getDueInfo === 'function') {
        const eqs = ms.getEquipments() || [];
        let onTime = 0, overdue = 0, dueSoon = 0;
        for (const eq of eqs) {
          const info = ms.getDueInfo(eq) || {};
          const st = (info.status || '').toString();
          if (st === 'overdue') overdue++;
          else if (st.startsWith('dueSoon')) dueSoon++;
          else onTime++;
        }
        maintenanceStats = { total: eqs.length, onTime, overdue, dueSoon };
      }
    } catch (_) {}

    return {
      trend,
      avgTrend,
      statusCount,
      topCustomers,
      topMachines,
      totalActive,
      totalCompleted,
      totalAll,
      overallAvgDays,
      maintenanceStats
    };
  }

  destroy() {
    this.isInitialized = false;
  }
}

window.AnalyticsController = window.AnalyticsController || new AnalyticsController();
try { window.AppRegistry?.register?.('AnalyticsController', window.AnalyticsController); } catch (_) {}
