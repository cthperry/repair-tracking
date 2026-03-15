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
        await window.AppRegistry.ensureReady(['RepairService', 'QuoteService', 'OrderService'], { silent: true });
      }
    } catch (e) {
      // silent: analytics 不應阻斷
      console.warn('Analytics: ensureReady failed', e);
    }
  }

  async reload(containerId = 'main-content', months = 6) {
    await this._ensureServicesReady();

    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      container.innerHTML = '<div class="analytics-loading">計算中…</div>';
      const data = this._compute(months);
      container.innerHTML = window.AnalyticsUI ? window.AnalyticsUI.render(data, months) : '<div class="msg-error">AnalyticsUI 未載入</div>';
      try { window.AnalyticsUI?.bindEvents?.(container, months); } catch (_) {}
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

  _compute(periodMonths = 6) {
    const repairs = this._allRepairs();
    const quoteSvc = this._getSvc('QuoteService');
    const orderSvc = this._getSvc('OrderService');
    const quotes = quoteSvc && typeof quoteSvc.getAll === 'function' ? (quoteSvc.getAll() || []).filter(q => q && !q.isDeleted) : [];
    const orders = orderSvc && typeof orderSvc.getAll === 'function' ? (orderSvc.getAll() || []).filter(o => o && !o.isDeleted) : [];
    const months = this._lastNMonths(periodMonths);

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

    // 6.5) 收費/下單統計
    const billingStats = {
      chargeable: 0,
      free: 0,
      undecided: 0,
      ordered: 0,
      notOrdered: 0,
      unknownOrder: 0,
      stageCount: { quote_pending: 0, procurement: 0, reviewing: 0, budget_review: 0, on_hold: 0, other: 0, unknown: 0 },
      reasonCount: { price: 0, budget: 0, internal: 0, spec: 0, other: 0, unknown: 0 }
    };
    for (const r of repairs) {
      const b = (r.billing && typeof r.billing === 'object') ? r.billing : {};
      const flow = (window.AppConfig && typeof window.AppConfig.getBillingFlowMeta === 'function')
        ? window.AppConfig.getBillingFlowMeta(b)
        : null;
      if (flow ? flow.isChargeable : b.chargeable === true) {
        billingStats.chargeable++;
        if (flow ? flow.isOrdered : b.orderStatus === 'ordered') billingStats.ordered++;
        else if (flow ? flow.isNotOrdered : b.orderStatus === 'not_ordered') {
          billingStats.notOrdered++;
          const stageKey = (flow ? flow.stageCode : (((b.notOrdered && typeof b.notOrdered === 'object') ? b.notOrdered.stageCode : '') || 'unknown')).toString().toLowerCase() || 'unknown';
          const reasonKey = (flow ? flow.reasonCode : (((b.notOrdered && typeof b.notOrdered === 'object') ? b.notOrdered.reasonCode : b.notOrderedReason) || 'unknown')).toString().toLowerCase() || 'unknown';
          if (billingStats.stageCount[stageKey] !== undefined) billingStats.stageCount[stageKey]++;
          else billingStats.stageCount.other++;
          if (billingStats.reasonCount[reasonKey] !== undefined) billingStats.reasonCount[reasonKey]++;
          else billingStats.reasonCount.other++;
        } else {
          billingStats.unknownOrder++;
        }
      } else if (flow ? flow.isFree : b.chargeable === false) {
        billingStats.free++;
      } else {
        billingStats.undecided++;
      }
    }
    billingStats.conversionRate = (billingStats.chargeable > 0)
      ? Math.round((billingStats.ordered / billingStats.chargeable) * 100)
      : 0;

    // 6.6) 主流程漏斗 / 交期 / 風險
    const activeNeedsParts = active.filter(r => r.status === '需要零件').length;
    const quoteDraft = quotes.filter(q => q.status === '草稿').length;
    const quoteSubmitted = quotes.filter(q => q.status === '已送出').length;
    const quoteApproved = quotes.filter(q => q.status === '已核准').length;
    const orderCreated = orders.filter(o => o.status === '建立').length;
    const orderOrdered = orders.filter(o => o.status === '已下單').length;
    const orderArrived = orders.filter(o => o.status === '已到貨').length;
    const orderClosed = orders.filter(o => o.status === '已結案').length;

    const funnelStats = {
      activeRepairs: totalActive,
      needParts: activeNeedsParts,
      quoteDraft,
      quoteSubmitted,
      quoteApproved,
      orderCreated,
      orderOrdered,
      orderArrived,
      orderClosed,
      chargeable: billingStats.chargeable,
      billingOrdered: billingStats.ordered,
      billingPending: billingStats.notOrdered + billingStats.unknownOrder
    };

    const agingBuckets = { d0_3: 0, d4_7: 0, d8_14: 0, d15p: 0 };
    const staleRepairs = [];
    let repairOverdue = 0;
    const todayIso = new Date().toISOString();
    for (const r of active) {
      const age = this._daysBetween(r.createdAt || r.createdDate, todayIso);
      if (age <= 3) agingBuckets.d0_3++;
      else if (age <= 7) agingBuckets.d4_7++;
      else if (age <= 14) agingBuckets.d8_14++;
      else agingBuckets.d15p++;
      if (age >= 14) repairOverdue++;

      const updatedAge = this._daysBetween(r.updatedAt || r.createdAt || r.createdDate, todayIso);
      if (updatedAge >= 3) {
        staleRepairs.push({
          id: r.id,
          repairNo: r.repairNo || r.id || '',
          customer: r.customer || '',
          machine: r.machine || '',
          staleDays: updatedAge
        });
      }
    }
    staleRepairs.sort((a, b) => b.staleDays - a.staleDays);

    let orderOverdue = 0;
    let orderDueSoon = 0;
    let orderMissingEta = 0;
    for (const o of orders) {
      const status = o.status || '';
      const isTerminal = (window.AppConfig && typeof window.AppConfig.isTerminalBusinessStatus === 'function')
        ? window.AppConfig.isTerminalBusinessStatus('order', status)
        : (status === '已結案' || status === '已取消');
      if (isTerminal || status === '已到貨') continue;
      if (!o.expectedAt) {
        orderMissingEta++;
        continue;
      }
      const etaDays = this._daysBetween(todayIso, o.expectedAt);
      if (etaDays < 0) orderOverdue++;
      else if (etaDays <= 7) orderDueSoon++;
    }

    const riskStats = {
      repairOverdue,
      needParts: activeNeedsParts,
      quotePending: quoteSubmitted,
      businessPending: billingStats.undecided + billingStats.unknownOrder,
      orderOverdue,
      orderDueSoon,
      orderMissingEta
    };

    // 7) 工程師負載 Top 10（依 ownerName）
    const ownerCount = {};
    const ownerActive = {};
    for (const r of repairs) {
      const o = (r.ownerName || '').trim();
      if (!o) continue;
      ownerCount[o] = (ownerCount[o] || 0) + 1;
      if (r.status !== '已完成') ownerActive[o] = (ownerActive[o] || 0) + 1;
    }
    const topEngineers = Object.entries(ownerCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, total]) => ({ name, count: total, active: ownerActive[name] || 0 }));

    // 8) 優先級分佈（進行中）
    const priorityCount = {};
    for (const r of active) {
      const p = (r.priority || '一般').toString();
      priorityCount[p] = (priorityCount[p] || 0) + 1;
    }

    // 9) MoM 成長（本月 vs 上月 新增單）
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const thisMoCount = repairs.filter(r => this._toYM(r.createdAt || r.createdDate) === thisMonth).length;
    const prevMoCount = repairs.filter(r => this._toYM(r.createdAt || r.createdDate) === prevMonth).length;
    const momDelta = thisMoCount - prevMoCount;
    const momPct = prevMoCount > 0 ? Math.round((momDelta / prevMoCount) * 100) : null;

    return {
      trend,
      avgTrend,
      statusCount,
      topCustomers,
      topMachines,
      topEngineers,
      priorityCount,
      momDelta,
      momPct,
      thisMoCount,
      totalActive,
      totalCompleted,
      totalAll,
      overallAvgDays,
      billingStats,
      funnelStats,
      agingBuckets,
      staleRepairs: staleRepairs.slice(0, 6),
      staleRepairCount: staleRepairs.length,
      riskStats,
      periodMonths
    };
  }

  destroy() {
    this.isInitialized = false;
  }
}

window.AnalyticsController = window.AnalyticsController || new AnalyticsController();
try { window.AppRegistry?.register?.('AnalyticsController', window.AnalyticsController); } catch (_) {}
