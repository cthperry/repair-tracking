/**
 * 週報系統 - 服務層
 * V161 - Weekly Module - Service Layer
 *
 * 職責：
 * - 彙整本週維修單（只讀）
 * - 管理下週計畫（可編輯，插入最上方，刪除不需 confirm）
 * - 讀取設定（收件人/簽名檔）
 */

class WeeklyService {
  constructor() {
    this.isInitialized = false;
    this.isFirebase = false;

    this.weekStart = '';
    this.weekEnd = '';

    this.nextPlans = [];

    this.db = null;
    this.ref = null;
  }

  async init() {
    if (this.isInitialized) return;

    this.isFirebase = (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined');
    if (this.isFirebase) {
      this.db = firebase.database();
      // 以 UID 隔離，避免互相覆寫
      const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || 'unknown');
      this.ref = this.db.ref(`weeklyPlans/${uid}`);
    }

    const { start, end } = WeeklyModel.getWeekRange(new Date());
    this.weekStart = start;
    this.weekEnd = end;

    await this.loadPlans();

    this.isInitialized = true;
    console.log('✅ WeeklyService initialized');
  }

  getWeekKey() {
    // 以週一日期作為 key
    return this.weekStart || WeeklyModel.getWeekRange(new Date()).start;
  }

  getLocalKey() {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || 'unknown');
    return `${prefix}weekly_plans_${uid}_${this.getWeekKey()}`;
  }

  async loadPlans() {
    // 優先 Firebase
    if (this.ref) {
      try {
        const snap = await this.ref.child(this.getWeekKey()).once('value');
        const data = snap.val();
        if (data && typeof data === 'object') {
          const arr = Array.isArray(data) ? data : Object.values(data);
          this.nextPlans = (arr || []).map(WeeklyModel.normalizePlan).filter(Boolean);
          this.savePlansToLocal();
          return;
        }
      } catch (e) {
        console.warn('WeeklyService load from Firebase failed, fallback to local:', e);
      }
    }

    // localStorage
    try {
      const raw = localStorage.getItem(this.getLocalKey());
      if (raw) {
        const arr = JSON.parse(raw);
        this.nextPlans = (arr || []).map(WeeklyModel.normalizePlan).filter(Boolean);
      } else {
        // 預設建立 1 筆空白
        this.nextPlans = [WeeklyModel.normalizePlan({ customer: '', project: '', plan: '' })];
      }
    } catch (e) {
      this.nextPlans = [WeeklyModel.normalizePlan({ customer: '', project: '', plan: '' })];
    }
  }

  savePlansToLocal() {
    try {
      localStorage.setItem(this.getLocalKey(), JSON.stringify(this.nextPlans || []));
    } catch (e) {
      console.warn('WeeklyService savePlansToLocal failed:', e);
    }
  }

  async persistPlans() {
    this.savePlansToLocal();
    if (this.ref) {
      try {
        // 用 array 直接存
        await this.ref.child(this.getWeekKey()).set(this.nextPlans || []);
      } catch (e) {
        console.warn('WeeklyService persistPlans to Firebase failed:', e);
      }
    }
  }

  async addPlanTop() {
    const item = WeeklyModel.normalizePlan({ customer: '', project: '', plan: '' });
    this.nextPlans = [item, ...(this.nextPlans || [])];
    await this.persistPlans();
    return item;
  }

  async deletePlan(id) {
    this.nextPlans = (this.nextPlans || []).filter(p => p.id !== id);
    if (this.nextPlans.length === 0) {
      this.nextPlans = [WeeklyModel.normalizePlan({ customer: '', project: '', plan: '' })];
    }
    await this.persistPlans();
  }

  async updatePlan(id, patch) {
    const idx = (this.nextPlans || []).findIndex(p => p.id === id);
    if (idx === -1) return;
    const updated = WeeklyModel.normalizePlan({ ...this.nextPlans[idx], ...patch, id, updatedAt: new Date().toISOString() });
    this.nextPlans[idx] = updated;
    await this.persistPlans();
  }


/**
 * 週報輸出專用：統一文字正規化
 */
_normalizeWeeklyLines(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n').map(l => l.replace(/\t/g, '    ').trimRight());
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const out = [];
  let empty = 0;
  for (const l of lines) {
    if (!l.trim()) {
      empty += 1;
      if (empty <= 1) out.push('');
    } else {
      empty = 0;
      out.push(l);
    }
  }
  return out;
}

_wrapWeeklyLine(line, maxWidth = 0) {
  const normalized = String(line || '').trim();
  const width = Number(maxWidth) || 0;
  if (!normalized) return [''];
  if (width <= 0 || normalized.length <= width) return [normalized];

  const chunks = [];
  let rest = normalized;
  const minFallback = Math.max(12, Math.floor(width * 0.55));
  const breakChars = ' ，。、；：,;:/|）)]}】';

  while (rest.length > width) {
    let cut = width;
    for (let i = width; i >= minFallback; i -= 1) {
      const ch = rest[i - 1];
      if (breakChars.includes(ch)) {
        cut = i;
        break;
      }
    }
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.length ? chunks : [''];
}

_wrapWeeklyTextLines(text, maxWidth = 0) {
  const normalized = this._normalizeWeeklyLines(text);
  if (!normalized.length) return [];
  const out = [];
  normalized.forEach(line => {
    if (!line.trim()) {
      out.push('');
      return;
    }
    out.push(...this._wrapWeeklyLine(line, maxWidth));
  });
  return out;
}

_formatWeeklyLabeledBlock(label, text, baseIndent = '   ', options = {}) {
  const lines = this._wrapWeeklyTextLines(text, options.wrapWidth || 0);
  const hasColon = /[：:]$/.test(label);
  const labelLine = `${baseIndent}${hasColon ? label : (label + '：')}`;
  if (!lines.length) return [labelLine, `${baseIndent}   （未填）`].join('\n');
  if (lines.length === 1) return `${labelLine}${lines[0]}`;
  const childIndent = baseIndent + '   ';
  return [labelLine, ...lines.map(l => (l && l.trim()) ? `${childIndent}${l}` : '')].join('\n');
}


_formatWeeklyDate(dateLike) {
  if (!dateLike) return '—';
  try {
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '—';
    return WeeklyModel.formatDateCN(WeeklyModel.toTaiwanDateString(d));
  } catch (_) {
    return '—';
  }
}

_formatWeeklyMonthDay(dateLike) {
  if (!dateLike) return '';
  try {
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '';
    return WeeklyModel.toTaiwanDateString(d).slice(5);
  } catch (_) {
    return '';
  }
}

_formatWeeklyDaysOpen(repair) {
  const start = String(repair?.createdDate || '').trim();
  if (!start) return null;
  try {
    const d0 = new Date(start + 'T00:00:00');
    const d1 = new Date();
    const ms = d1.getTime() - d0.getTime();
    if (!Number.isFinite(ms)) return null;
    return Math.max(0, Math.floor(ms / 86400000));
  } catch (_) {
    return null;
  }
}

_getPriorityLabel(priorityValue) {
  const list = Array.isArray(AppConfig?.business?.priority) ? AppConfig.business.priority : [];
  const found = list.find(item => item && item.value === priorityValue);
  return found?.label || String(priorityValue || '一般').trim() || '一般';
}


_getWeeklyBasisSetting() {
  const normalize = (value) => (String(value || '').trim() === 'created' ? 'created' : 'updated');
  const settingsSvc = (typeof window._svc === 'function') ? window._svc('SettingsService') : (window.AppRegistry?.get?.('SettingsService') || null);
  const svcValue = settingsSvc?.settings?.weeklyThisWeekBasis;
  if (svcValue) return normalize(svcValue);

  try {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || 'unknown');
    const raw = localStorage.getItem(`${prefix}settings_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalize(parsed?.weeklyThisWeekBasis);
    }
  } catch (_) {}

  return 'updated';
}

_getWeeklyBasisDate(repair, basis) {
  if ((basis || 'updated') === 'created') {
    const createdDate = String(repair?.createdDate || '').trim();
    if (createdDate) return createdDate;
    try {
      const createdAt = String(repair?.createdAt || '').trim();
      if (!createdAt) return '';
      return WeeklyModel.toTaiwanDateString(new Date(createdAt));
    } catch (_) {
      return '';
    }
  }

  try {
    const updatedAt = String(repair?.updatedAt || repair?.createdAt || '').trim();
    if (!updatedAt) return '';
    return WeeklyModel.toTaiwanDateString(new Date(updatedAt));
  } catch (_) {
    return '';
  }
}

_getWeeklyBasisSortKey(repair, basis) {
  return String((basis || 'updated') === 'created' ? (repair?.createdAt || repair?.updatedAt || '') : (repair?.updatedAt || repair?.createdAt || '')).trim();
}

_getWeeklyCaseDisplayConfig() {
  const cfg = (AppConfig?.weekly?.caseDisplay && typeof AppConfig.weekly.caseDisplay === 'object')
    ? AppConfig.weekly.caseDisplay
    : {};
  return {
    fallbackLabel: String(cfg.fallbackLabel || '未命名案件').trim() || '未命名案件',
    separator: String(cfg.separator || '｜').trim() || '｜',
    overviewTitle: String(cfg.overviewTitle || '本週案件總覽').trim() || '本週案件總覽',
    showSummarySection: cfg.showSummarySection === true,
    showBasisDateLine: cfg.showBasisDateLine === true,
    issueWrapWidth: Number(cfg.issueWrapWidth) || 0,
    workSummaryWrapWidth: Number(cfg.workSummaryWrapWidth) || 0,
    workSummaryLabel: String(cfg.workSummaryLabel || '本週處置').trim() || '本週處置'
  };
}

_dedupeWeeklyRepairs(list) {
  const out = [];
  const seen = new Set();
  (Array.isArray(list) ? list : []).forEach(item => {
    if (!item || typeof item !== 'object') return;
    const key = String(item.id || item.repairNo || `${item.createdAt || ''}__${item.customer || ''}__${item.machine || item.serialNumber || ''}`).trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

_isWeeklyNewRepair(repair, start, end) {
  const createdDate = String(repair?.createdDate || '').trim();
  if (createdDate) return createdDate >= start && createdDate <= end;
  try {
    const createdAt = String(repair?.createdAt || '').trim();
    if (!createdAt) return false;
    const d = WeeklyModel.toTaiwanDateString(new Date(createdAt));
    return d >= start && d <= end;
  } catch (_) {
    return false;
  }
}

_isWeeklyClosedRepair(repair, start, end) {
  if (String(repair?.status || '').trim() !== '已完成') return false;
  const iso = String(repair?.completedAt || repair?.updatedAt || '').trim();
  if (!iso) return false;
  try {
    const d = WeeklyModel.toTaiwanDateString(new Date(iso));
    return d >= start && d <= end;
  } catch (_) {
    return false;
  }
}

_buildWeeklyCaseLabel(repair) {
  const cfg = this._getWeeklyCaseDisplayConfig();
  const customer = String(repair?.customer || '').trim();
  const machine = String(repair?.machine || repair?.serialNumber || '').trim();
  const parts = [customer, machine].filter(Boolean);
  return parts.length ? parts.join(cfg.separator) : cfg.fallbackLabel;
}

_toWeeklyReportCase(repair, ctx = {}) {
  const repairLogs = Array.isArray(ctx.workLogsByRepair?.[repair?.id]) ? ctx.workLogsByRepair[repair.id] : [];
  const issueText = String(repair?.issue || '').trim() || '（未填）';
  return {
    caseLabel: this._buildWeeklyCaseLabel(repair),
    statusLabel: String(repair?.status || '進行中').trim() || '進行中',
    issueText,
    workSummaryText: this._getWeeklyWorkSummary(repair, repairLogs),
    partsSummaryText: this._getWeeklyPartsSummary(repair?.id, repair),
    billingSummaryText: this._getWeeklyBillingSummary(repair),
    basisDateText: this._formatWeeklyDate(ctx.weeklyBasis === 'created'
      ? (repair?.createdAt || (repair?.createdDate ? (repair.createdDate + 'T00:00:00') : ''))
      : (repair?.updatedAt || repair?.createdAt || '')),
    isNewThisWeek: this._isWeeklyNewRepair(repair, ctx.start, ctx.end),
    isClosedThisWeek: this._isWeeklyClosedRepair(repair, ctx.start, ctx.end),
    sortKey: this._getWeeklyBasisSortKey(repair, ctx.weeklyBasis)
  };
}

_hasWeeklyWorkLogs(repairId, workLogsByRepair = {}) {
  return !!(repairId && Array.isArray(workLogsByRepair?.[repairId]) && workLogsByRepair[repairId].length > 0);
}

_getWeeklyActivitySortKey(repair, workLogsByRepair = {}) {
  const logs = Array.isArray(workLogsByRepair?.[repair?.id]) ? workLogsByRepair[repair.id] : [];
  if (logs.length) {
    const latest = logs[logs.length - 1] || {};
    const latestKey = String(latest.updatedAt || latest.createdAt || '').trim();
    if (latestKey) return latestKey;
    const workDate = String(latest.workDate || '').trim();
    if (workDate) return `${workDate}T00:00:00`;
  }
  const createdAt = String(repair?.createdAt || '').trim();
  if (createdAt) return createdAt;
  const createdDate = String(repair?.createdDate || '').trim();
  if (createdDate) return `${createdDate}T00:00:00`;
  return '';
}

_getWeeklyContext() {
  const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || '');
  const start = this.weekStart;
  const end = this.weekEnd;
  const repairSvc = (typeof window._svc === 'function') ? window._svc('RepairService') : (window.AppRegistry?.get?.('RepairService') || null);
  const quoteSvc = (typeof window._svc === 'function') ? window._svc('QuoteService') : (window.AppRegistry?.get?.('QuoteService') || null);
  const orderSvc = (typeof window._svc === 'function') ? window._svc('OrderService') : (window.AppRegistry?.get?.('OrderService') || null);
  const repairPartSvc = (typeof window._svc === 'function') ? window._svc('RepairPartsService') : (window.AppRegistry?.get?.('RepairPartsService') || null);
  const repairs = (repairSvc && typeof repairSvc.getAll === 'function') ? repairSvc.getAll() : [];

  const ownRepairs = this._dedupeWeeklyRepairs((repairs || [])
    .filter(r => !r?.isDeleted)
    .filter(r => !uid || r.ownerUid === uid)
    .slice());

  let workLogsByRepair = {};
  try {
    const workLogSvc = (typeof window._svc === 'function') ? window._svc('WorkLogService') : (window.AppRegistry?.get?.('WorkLogService') || null);
    if (workLogSvc && workLogSvc.isInitialized) {
      const weekLogs = workLogSvc.getByDateRange(start, end);
      workLogsByRepair = WorkLogModel.groupByRepairId(weekLogs);
    }
  } catch (e) {
    console.warn('WeeklyService: WorkLog integration failed, fallback to content:', e);
  }

  const weeklyBasis = 'activity';
  const reportRows = this._dedupeWeeklyRepairs(ownRepairs
    .filter(r => this._isWeeklyNewRepair(r, start, end) || this._hasWeeklyWorkLogs(r.id, workLogsByRepair))
    .sort((a, b) => this._getWeeklyActivitySortKey(b, workLogsByRepair).localeCompare(this._getWeeklyActivitySortKey(a, workLogsByRepair))));

  const newRows = this._dedupeWeeklyRepairs(ownRepairs
    .filter(r => this._isWeeklyNewRepair(r, start, end))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));

  const closedRows = this._dedupeWeeklyRepairs(ownRepairs
    .filter(r => this._isWeeklyClosedRepair(r, start, end))
    .sort((a, b) => String(b.completedAt || b.updatedAt || '').localeCompare(String(a.completedAt || a.updatedAt || ''))));

  const activeRows = this._dedupeWeeklyRepairs(ownRepairs
    .filter(r => String(r?.status || '').trim() !== '已完成')
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))));

  const baseCtx = {
    start,
    end,
    weeklyBasis,
    workLogsByRepair,
    quoteSvc,
    orderSvc,
    repairPartSvc
  };

  const reportRowsView = reportRows.map(repair => this._toWeeklyReportCase(repair, baseCtx));

  return {
    uid,
    start,
    end,
    ownRepairs,
    weeklyBasis,
    reportRows,
    reportRowsView,
    newRows,
    closedRows,
    activeRows,
    workLogsByRepair,
    quoteSvc,
    orderSvc,
    repairPartSvc
  };
}

_getWeeklyWorkSummary(repair, repairLogs = []) {
  const cfg = this._getWeeklyCaseDisplayConfig();
  const label = `${cfg.workSummaryLabel}：`;
  if (Array.isArray(repairLogs) && repairLogs.length > 0) {
    const detailLines = repairLogs.flatMap(log => {
      const date = (log.workDate || '').slice(5) || this._formatWeeklyMonthDay(log.updatedAt || log.createdAt || '');
      const action = String(log.action || '').trim().slice(0, 240);
      const resultCfg = (window.WorkLogModel && window.WorkLogModel.getResultConfig)
        ? window.WorkLogModel.getResultConfig(log.result)
        : null;
      const tag = resultCfg ? resultCfg.label : '';
      const text = `${date || '--'} ${action || '（未填）'}${tag ? ' → ' + tag : ''}`.trim();
      return this._wrapWeeklyLine(text, cfg.workSummaryWrapWidth);
    });
    return this._formatWeeklyLabeledBlock(label, detailLines.join('\n'), '   ', { wrapWidth: cfg.workSummaryWrapWidth });
  }

  const workContent = String(repair?.content || '').trim();
  if (workContent) return this._formatWeeklyLabeledBlock(label, workContent, '   ', { wrapWidth: cfg.workSummaryWrapWidth });
  return ['   ' + label, '      （未填）'].join('\n');
}


_getWeeklyPartsSummary(repairId, repair) {
  try {
    const list = this._getWeeklyContextCache?.repairPartSvc?.getForRepair?.(repairId) || [];
    if (!list.length) {
      return repair?.needParts ? '需要零件（尚無用料追蹤明細）' : '無';
    }
    const count = list.length;
    const statusMap = new Map();
    list.forEach(it => {
      const status = String(it?.status || '未設定').trim() || '未設定';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const ordered = Array.from(statusMap.entries())
      .sort((a, b) => AppConfig.getBusinessStatusRank('part', a[0]) - AppConfig.getBusinessStatusRank('part', b[0]))
      .map(([status, qty]) => `${status}${qty > 1 ? '×' + qty : ''}`);
    return `共 ${count} 筆（${ordered.join('／')}）`;
  } catch (_) {
    return repair?.needParts ? '需要零件' : '無';
  }
}

_getWeeklyQuoteOrderSummary(repairId) {
  const quoteSummary = this._getWeeklyContextCache?.quoteSvc?.getSummaryForRepair?.(repairId) || { count: 0, latest: null };
  const orderSummary = this._getWeeklyContextCache?.orderSvc?.getSummaryForRepair?.(repairId) || { count: 0, latest: null };

  const quoteText = quoteSummary.count
    ? `報價 ${quoteSummary.count} 筆（最新：${quoteSummary.latest?.status || '未設定'}）`
    : '報價 0 筆';
  const orderText = orderSummary.count
    ? `訂單 ${orderSummary.count} 筆（最新：${orderSummary.latest?.status || '未設定'}）`
    : '訂單 0 筆';
  return `${quoteText}；${orderText}`;
}

_getWeeklyBillingSummary(repair) {
  const b = (repair?.billing && typeof repair.billing === 'object') ? repair.billing : {};
  const billingFlow = (window.AppConfig && typeof window.AppConfig.getBillingFlowMeta === 'function')
    ? window.AppConfig.getBillingFlowMeta(b)
    : null;
  if (billingFlow) {
    if (billingFlow.isOrdered) {
      return billingFlow.summaryLabel || '需收費 / 已下單';
    }
    if (billingFlow.isNotOrdered) {
      const tail = [billingFlow.stageMeta?.label || '', billingFlow.reasonMeta?.label || '', (billingFlow.note || '').trim()].filter(Boolean).join('｜');
      return (billingFlow.summaryLabel || '需收費 / 未下單') + (tail ? `（${tail}）` : '');
    }
    if (billingFlow.isChargeable && billingFlow.isOrderUnknown) {
      return billingFlow.summaryLabel || '需收費 / 尚未確認';
    }
    return billingFlow.chargeableMeta?.label || '尚未決定';
  }
  if (b.chargeable === true) return '需收費';
  if (b.chargeable === false) return '不需收費';
  return '未決定';
}

_buildWeeklyRepairBlock(item, seq = 1) {
  const cfg = this._getWeeklyCaseDisplayConfig();
  const status = String(item?.statusLabel || '進行中').trim() || '進行中';
  const caseLabel = String(item?.caseLabel || cfg.fallbackLabel).trim() || cfg.fallbackLabel;
  const title = `${seq}. [${status}] ${caseLabel}`;

  const blocks = [title];

  if (cfg.showBasisDateLine) {
    const basisDate = String(item?.basisDateText || '—').trim() || '—';
    blocks.push(`   依據日期：${basisDate}`);
  }

  const issueBlock = this._formatWeeklyLabeledBlock('問題摘要：', String(item?.issueText || '').trim(), '   ', { wrapWidth: cfg.issueWrapWidth });
  const workBlockRaw = String(item?.workSummaryText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
  const workBlock = workBlockRaw || ['   ' + cfg.workSummaryLabel + '：', '      （未填）'].join('\n');
  const billingBlock = this._formatWeeklyLabeledBlock('商務摘要：', String(item?.billingSummaryText || '未決定').trim() || '未決定', '   ', { wrapWidth: cfg.issueWrapWidth });
  const partsBlock = this._formatWeeklyLabeledBlock('料件摘要：', String(item?.partsSummaryText || '無').trim() || '無', '   ', { wrapWidth: cfg.issueWrapWidth });

  blocks.push(issueBlock, workBlock, billingBlock, partsBlock);
  return blocks.join('\n');
}


_buildWeeklySection(title, items, emptyText) {
  const header = `${title}`;
  if (!Array.isArray(items) || !items.length) {
    return [header, `（${emptyText}）`].join('\n');
  }
  return [header, ...items].join('\n\n');
}

_buildWeeklyExecutiveSummary(ctx) {
  const billingCounts = { chargeable: 0, free: 0, undecided: 0, ordered: 0, notOrdered: 0, orderUnknown: 0 };
  const stageCounts = new Map();
  (ctx.ownRepairs || []).forEach(r => {
    const meta = AppConfig?.getBillingFlowMeta?.(r.billing || {}) || null;
    if (!meta) return;
    if (meta.isChargeable) billingCounts.chargeable += 1;
    else if (meta.isFree) billingCounts.free += 1;
    else billingCounts.undecided += 1;
    if (meta.isOrdered) billingCounts.ordered += 1;
    if (meta.isNotOrdered) {
      billingCounts.notOrdered += 1;
      const label = meta.stageMeta?.label || '未分類';
      stageCounts.set(label, (stageCounts.get(label) || 0) + 1);
    }
    if (meta.isOrderUnknown) billingCounts.orderUnknown += 1;
  });

  const stageText = Array.from(stageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, qty]) => `${label}${qty > 1 ? '×' + qty : ''}`)
    .join('、');

  const scopeLabel = '本週新增維修單 / 工作紀錄';
  const lines = [
    `- 本週週報依${scopeLabel}統計 ${ctx.reportRowsView.length} 件；新增維修單 ${ctx.newRows.length} 件；結案 ${ctx.closedRows.length} 件；目前進行中 ${ctx.activeRows.length} 件。`,
    `- 收費判定：需收費 ${billingCounts.chargeable} 件／不需收費 ${billingCounts.free} 件／尚未決定 ${billingCounts.undecided} 件。`,
    `- 訂單決策：已下單 ${billingCounts.ordered} 件／未下單 ${billingCounts.notOrdered} 件／待確認 ${billingCounts.orderUnknown} 件。`
  ];
  if (stageText) lines.push(`- 未下單分布：${stageText}。`);
  return lines;
}

/**
 * 彙整本週維修單（只讀）
 */
getThisWeekRepairsText() {
  const ctx = this._getWeeklyContext();
  this._getWeeklyContextCache = ctx;

  const sections = [];
  const overviewTitle = this._getWeeklyCaseDisplayConfig().overviewTitle;
  if (this._getWeeklyCaseDisplayConfig().showSummarySection) {
    sections.push(this._buildWeeklySection('摘要', this._buildWeeklyExecutiveSummary(ctx), '本週無摘要資料'));
  }
  sections.push(this._buildWeeklySection(overviewTitle, (ctx.reportRowsView || []).map((item, i) => this._buildWeeklyRepairBlock(item, i + 1)), '本週無符合條件案件'));

  return sections.join('\n\n');
}


getNextWeekPlansText() {

    const items = (this.nextPlans || []).filter(p => (p.customer || p.project || p.plan));
    if (!items.length) return '';

    const normalizeLines = (text) => {
      const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = raw.split('\n').map(l => l.replace(/\t/g, '    ').trimRight());
      // trim leading/trailing empty lines
      while (lines.length && !lines[0].trim()) lines.shift();
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      // collapse excessive empty lines (>=2)
      const out = [];
      let empty = 0;
      for (const l of lines) {
        if (!l.trim()) {
          empty += 1;
          if (empty <= 1) out.push('');
        } else {
          empty = 0;
          out.push(l);
        }
      }
      return out;
    };

    const formatPlanBlock = (text) => {
      const lines = normalizeLines(text);
      if (!lines.length) return '   計畫內容：（未填）';
      if (lines.length === 1) return `   計畫內容：${lines[0]}`;
      const indent = '      '; // 6 spaces
      return ['   計畫內容：', ...lines.map(l => `${indent}${l}`)].join('\n');
    };

    return items.map((p, i) => {
      const title = `${i + 1}. ${(p.customer || '').trim()}${p.project ? ' - ' + (p.project || '').trim() : ''}`.trim();
      const body = formatPlanBlock((p.plan || '').trim());
      return [title, body].join('\n');
    }).join('\n\n');
  }

  async getRecipientsAndSignature() {
    const settingsSvc = (typeof window._svc === 'function') ? window._svc('SettingsService') : (window.AppRegistry?.get?.('SettingsService') || null);
    const settings = (settingsSvc && typeof settingsSvc.getSettings === 'function')
      ? await settingsSvc.getSettings()
      : null;

    const recipients = (settings && settings.weeklyRecipients)
      ? String(settings.weeklyRecipients).trim()
      : WeeklyModel.defaultRecipientText();

    const signature = (settings && settings.signature)
      ? String(settings.signature).trim()
      : '';

    return { recipients, signature };
  }

  async getEmail() {
    const u = (window.AppState?.getCurrentUser?.() || window.currentUser);
    const reporterName = u?.displayName || u?.email || '';
    const thisWeekText = this.getThisWeekRepairsText();
    const nextWeekPlansText = this.getNextWeekPlansText();
    const { recipients, signature } = await this.getRecipientsAndSignature();

    const email = WeeklyModel.buildEmail({
      reporterName,
      weekStart: this.weekStart,
      weekEnd: this.weekEnd,
      thisWeekText,
      nextWeekPlansText,
      signature
    });

    return { ...email, to: recipients };
  }
}

// 全域實例
const weeklyService = new WeeklyService();
try { window.AppRegistry?.register?.('WeeklyService', weeklyService); } catch (_) {}
console.log('✅ WeeklyService loaded');
