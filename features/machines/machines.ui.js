/**
 * 機台歷史（序號追蹤） - UI
 * - Desktop：左清單右明細
 * - Mobile：上搜尋下明細（單欄堆疊）
 */

const escapeHtml = (window.StringUtils && typeof window.StringUtils.escapeHTML === 'function')
  ? window.StringUtils.escapeHTML
  : function escapeHtmlFallback(input) {
      const s = (input === null || input === undefined) ? '' : String(input);
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

const escapeJsString = function(input){
  const s = (input === null || input === undefined) ? '' : String(input);
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
};

// Phase 1：統一 Service 存取走 window._svc（registry-first），避免直接 window.XxxService

class MachinesUI {
  constructor() {
    this.query = '';
    this.queryDraft = '';
    this.selectedSerial = '';
  }

  render(containerId = 'main-content') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="machines-module">
        <div class="machines-header module-toolbar">
          <div class="module-toolbar-left">
            <div class="page-title">
              <h2>機台歷史</h2>
              <span class="muted">依序號快速檢視維修、零件、報價、訂單狀態（Desktop + Mobile 相容）</span>
            </div>
          </div>
          <div class="module-toolbar-right">
            <button class="btn" onclick="MachinesUI.reload()">重新整理</button>
          </div>
        </div>

        <div class="machines-layout">
          <div class="machine-panel card">
            <div class="machine-panel-header" style="display:flex;gap:8px;align-items:center;">
              <input
                class="input"
                id="machines-serial-query"
                placeholder="搜尋序號（支援模糊搜尋）"
                value="${escapeHtml(this.queryDraft || '')}"
                oninput="MachinesUI.onQueryDraft(this.value)"
                onkeydown="MachinesUI.onQueryKeydown(event)"
              />
              <button class="btn" type="button" onclick="MachinesUI.applyQuery()">搜尋</button>
              <button class="btn ghost" type="button" onclick="MachinesUI.clearQuery()">清除</button>
            </div>
            <div class="serial-list" id="machines-serial-list"></div>
          </div>

          <div class="machine-panel card">
            <div class="machine-detail" id="machines-detail"></div>
          </div>
        </div>
      </div>
    `;

    this.renderSerialList();
    this.renderDetail();
  }

  getAllRepairsWithSerial() {
    const rs = window._svc('RepairService');
    const all = (rs && typeof rs.getAll === 'function') ? rs.getAll() : [];

    return all
      .filter(r => !r?.isDeleted)
      .filter(r => (r?.serialNumber || '').toString().trim())
      .map(r => ({ ...r, serialNumber: (r.serialNumber || '').toString().trim() }));
  }

  buildSerialIndex(repairs) {
    const map = new Map();
    for (const r of repairs) {
      const serial = r.serialNumber;
      if (!map.has(serial)) map.set(serial, []);
      map.get(serial).push(r);
    }

    // 每個 serial 內部排序：最新在前
    for (const [serial, arr] of map.entries()) {
      arr.sort((a, b) => {
        const aT = a.updatedAt || a.createdAt || '';
        const bT = b.updatedAt || b.createdAt || '';
        return (bT > aT) ? 1 : (bT < aT) ? -1 : 0;
      });
      map.set(serial, arr);
    }

    return map;
  }

  renderSerialList() {
    const listEl = document.getElementById('machines-serial-list');
    if (!listEl) return;

    const repairs = this.getAllRepairsWithSerial();
    const index = this.buildSerialIndex(repairs);

    const q = (this.query || '').toString().trim().toLowerCase();
    const serials = Array.from(index.keys())
      .filter(serial => !q || serial.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b));

    if (serials.length === 0) {
      listEl.innerHTML = `
        <div class="machines-empty">
          <div style="font-size:40px;margin-bottom:10px;">🔎</div>
          <div style="font-weight:700;margin-bottom:6px;">找不到序號</div>
          <div class="muted">請調整搜尋條件，或確認維修單已填寫「序號」欄位。</div>
        </div>
      `;
      return;
    }

    // 若尚未選擇，預設選第一筆（提升效率）
    if (!this.selectedSerial || !index.has(this.selectedSerial)) {
      this.selectedSerial = serials[0];
    }

    listEl.innerHTML = serials.map(serial => {
      const arr = index.get(serial) || [];
      const latest = arr[0] || {};
      const latestStatus = (latest.status || '').toString().trim();
      const latestProgress = typeof latest.progress === 'number' ? latest.progress : parseInt(latest.progress || 0, 10) || 0;
      const statusText = (latestStatus === '已完成')
        ? `已完成（${latestProgress}%）`
        : `維修中（${latestProgress}%）`;

      const updated = (latest.updatedAt || latest.createdAt || '').toString();
      const updatedText = updated ? window.RepairModel?.formatDateTime?.(updated) : '';

      const active = (serial === this.selectedSerial) ? 'active' : '';
      return `
        <div class="serial-item ${active}" onclick="MachinesUI.selectSerial('${escapeJsString(serial)}')">
          <div class="serial-top">
            <div class="serial-no">${escapeHtml(serial)}</div>
            <span class="chip static" style="--chip-color: var(--module-accent);">${escapeHtml(statusText)}</span>
          </div>
          <div class="serial-sub">
            <span>維修單：${arr.length} 筆</span>
            ${updatedText ? `<span>更新：${escapeHtml(updatedText)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  renderDetail() {
    const detailEl = document.getElementById('machines-detail');
    if (!detailEl) return;

    const serial = (this.selectedSerial || '').toString().trim();
    if (!serial) {
      detailEl.innerHTML = `
        <div class="machines-empty">
          <div style="font-size:42px;margin-bottom:10px;">🧾</div>
          <div style="font-weight:700;margin-bottom:6px;">請先選擇序號</div>
          <div class="muted">左側清單選取序號後，即可查看狀態總覽與維修履歷。</div>
        </div>
      `;
      return;
    }

    const repairs = this.getAllRepairsWithSerial().filter(r => r.serialNumber === serial);
    repairs.sort((a, b) => {
      const aT = (a.completedAt || a.updatedAt || a.createdAt || '').toString();
      const bT = (b.completedAt || b.updatedAt || b.createdAt || '').toString();
      return (bT > aT) ? 1 : (bT < aT) ? -1 : 0;
    });

    const latest = repairs[0] || null;

    const sum = (window.LinkageHelper && typeof window.LinkageHelper.getForSerial === 'function')
      ? window.LinkageHelper.getForSerial(serial, repairs)
      : null;

    const latestStatus = latest ? (latest.status || '').toString().trim() : '';
    const latestProgress = latest ? (typeof latest.progress === 'number' ? latest.progress : parseInt(latest.progress || 0, 10) || 0) : 0;
    const repairStatusLine = latest
      ? (latestStatus === '已完成' ? `已完成（${latestProgress}%）` : `維修中（${latestProgress}%）`)
      : '無資料';

    const lastTime = latest ? (latest.completedAt || latest.updatedAt || latest.createdAt || '') : '';
    const lastTimeText = lastTime ? (window.RepairModel?.formatDateTime?.(lastTime) || lastTime) : '';

    detailEl.innerHTML = `
      <div class="machine-summary">
        <div class="summary-title">
          <h3>${escapeHtml(serial)}</h3>
          <div class="muted">最後更新：${escapeHtml(lastTimeText || '-') }</div>
        </div>

        <div class="summary-grid">
          <div class="summary-box">
            <div class="box-title">🔧 維修</div>
            <div class="box-main">${escapeHtml(repairStatusLine)}</div>
            <div class="muted">${latest ? `${escapeHtml((latest.customer || latest.customerName || '-')) } · ${escapeHtml(latest.machine || '-') }` : '—'}</div>
          </div>

          <div class="summary-box">
            <div class="box-title">🧩 零件</div>
            <div class="box-main">${escapeHtml(this.formatPartsPrimary(sum?.parts))}</div>
            <div class="summary-chips">${this.renderPartsStageChips(sum?.parts)}</div>
          </div>

          <div class="summary-box">
            <div class="box-title">🧾 報價</div>
            <div class="box-main">${escapeHtml(this.formatStatusPrimary(sum?.quotes, '未建立'))}</div>
            <div class="summary-chips">${this.renderStatusCountChips(sum?.quotes, ['草稿','已送出','已核准','已取消'])}</div>
          </div>

          <div class="summary-box">
            <div class="box-title">📦 訂單</div>
            <div class="box-main">${escapeHtml(this.formatStatusPrimary(sum?.orders, '未建立'))}</div>
            <div class="summary-chips">${this.renderStatusCountChips(sum?.orders, ['建立','已下單','已到貨','已結案','已取消'])}</div>
          </div>

          ${this.renderMaintenanceSummaryBox(serial, latest)}
        </div>
      </div>

      <div class="machine-history">
        <div class="machine-history-header">
          <h4>維修履歷（最新在上）</h4>
          <div class="muted">共 ${repairs.length} 筆</div>
        </div>
        <div class="history-list">
          ${repairs.map(r => this.renderHistoryCard(r)).join('')}
        </div>
      </div>
    `;
  }

  formatPartsPrimary(partsSummary) {
    if (!partsSummary || !partsSummary.total) return '無';
    const p = partsSummary.primary || { label: '—', count: 0 };
    return `${p.label} ${p.count}/${partsSummary.total}`;
  }

  formatStatusPrimary(summary, emptyText = '未建立') {
    if (!summary || !summary.total) return emptyText;
    const p = summary.primary || { label: '—', count: 0 };
    return `${p.label} ${p.count}/${summary.total}`;
  }

  renderPartsStageChips(partsSummary) {
    if (!partsSummary || !partsSummary.total) {
      return `<span class="chip static" style="--chip-color: #64748b;">無</span>`;
    }

    const total = partsSummary.total;
    const byStage = partsSummary.byStage || {};

    // 相容：舊版欄位 stageCounts
    const stageCounts = partsSummary.stageCounts || byStage || {};

    const order = ['待報價','待下單','待到貨','待更換','已結案'];
    const colors = {
      '待報價': 'var(--color-warning)',
      '待下單': 'var(--color-warning)',
      '待到貨': 'var(--color-accent)',
      '待更換': 'var(--color-secondary)',
      '已結案': 'var(--color-success)'
    };

    const chips = [];
    for (const label of order) {
      const c = stageCounts[label] || 0;
      if (c <= 0) continue;
      const color = colors[label] || 'var(--module-accent)';
      chips.push(`<span class="chip static" style="--chip-color: ${color};">${escapeHtml(label)} ${c}/${total}</span>`);
    }

    // 若全都 0，代表都已結案
    if (chips.length === 0) {
      return `<span class="chip static" style="--chip-color: var(--color-success);">已結案 ${total}/${total}</span>`;
    }

    return chips.join('');
  }

  renderStatusCountChips(summary, order) {
    if (!summary || !summary.total) {
      return `<span class="chip static" style="--chip-color: #64748b;">無</span>`;
    }

    const total = summary.total;
    const by = summary.byStatus || {};

    const colors = {
      '草稿': 'var(--color-warning)',
      '已送出': 'var(--color-accent)',
      '已核准': 'var(--color-success)',
      '已取消': '#64748b',
      '建立': 'var(--color-warning)',
      '已下單': 'var(--color-accent)',
      '已到貨': 'var(--color-secondary)',
      '已結案': 'var(--color-success)',
      '已取消': '#64748b'
    };

    const chips = [];
    for (const label of order) {
      const c = by[label] || 0;
      if (c <= 0) continue;
      const color = colors[label] || 'var(--module-accent)';
      chips.push(`<span class="chip static" style="--chip-color: ${color};">${escapeHtml(label)} ${c}/${total}</span>`);
    }

    // 其他未知狀態也列出（但不干擾排序）
    for (const [k, v] of Object.entries(by)) {
      if (order.includes(k)) continue;
      if (v <= 0) continue;
      chips.push(`<span class="chip static" style="--chip-color: var(--module-accent);">${escapeHtml(k)} ${v}/${total}</span>`);
    }

    return chips.length ? chips.join('') : `<span class="chip static" style="--chip-color: #64748b;">—</span>`;
  }

  renderHistoryCard(repair) {
    const display = window.RepairModel ? window.RepairModel.toDisplay(repair) : repair;
    const no = escapeHtml(repair.repairNo || repair.id);
    const customer = escapeHtml((repair.customer || repair.customerName || '-'));
    const machine = escapeHtml(repair.machine || '-');
    const status = escapeHtml(repair.status || '-');
    const progress = (typeof repair.progress === 'number' ? repair.progress : parseInt(repair.progress || 0, 10) || 0);

    const timeStr = (repair.completedAt || repair.updatedAt || repair.createdAt || '').toString();
    const timeText = timeStr ? (window.RepairModel?.formatDateTime?.(timeStr) || timeStr) : '';

    const linkage = (window.LinkageHelper && typeof window.LinkageHelper.getForRepair === 'function')
      ? window.LinkageHelper.getForRepair(repair.id)
      : null;

    const partsText = linkage?.parts
      ? (linkage.parts.total ? `${linkage.parts.primary.label} ${linkage.parts.primary.count}/${linkage.parts.total}` : '無')
      : '—';

    const quotesText = linkage?.quotes
      ? (linkage.quotes.total ? `${linkage.quotes.primary.label} ${linkage.quotes.primary.count}/${linkage.quotes.total}` : '未建立')
      : '—';

    const ordersText = linkage?.orders
      ? (linkage.orders.total ? `${linkage.orders.primary.label} ${linkage.orders.primary.count}/${linkage.orders.total}` : '未建立')
      : '—';

    return `
      <div class="history-card" onclick="MachinesUI.openRepair('${escapeJsString(repair.id)}')">
        <div class="history-top">
          <div class="history-no">${no}</div>
          <span class="chip static" style="--chip-color: var(--module-accent);">${status} ${progress}%</span>
        </div>
        <div class="history-sub">
          <span>${customer}</span>
          <span>${machine}</span>
          ${timeText ? `<span>時間：${escapeHtml(timeText)}</span>` : ''}
        </div>
        <div class="history-chips">
          <span class="chip static" style="--chip-color: var(--color-warning);">🧩 ${escapeHtml(partsText)}</span>
          <span class="chip static" style="--chip-color: var(--color-accent);">🧾 ${escapeHtml(quotesText)}</span>
          <span class="chip static" style="--chip-color: var(--color-secondary);">📦 ${escapeHtml(ordersText)}</span>
        </div>
      </div>
    `;
  }


  // ================================
  // Maintenance（機台保養）整合 - MNT-3
  // ================================
  _getMaintenanceService() {
    return window._svc('MaintenanceService');
  }

  async _ensureMaintenanceInit() {
    // 深連結情境：避免直接 svc.init；走 ensureReady
    try {
      if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
        await window.AppRegistry.ensureReady(['MaintenanceService'], { loadAll: false });
      }
    } catch (e) {
      console.warn('MaintenanceService ensureReady failed:', e);
    }
    return this._getMaintenanceService();
  }

  _getLatestRepairForSerial(serial) {
    const sn = (serial || '').toString().trim();
    if (!sn) return null;
    const repairs = this.getAllRepairsWithSerial().filter(r => r.serialNumber === sn);
    repairs.sort((a, b) => {
      const aT = (a.completedAt || a.updatedAt || a.createdAt || '').toString();
      const bT = (b.completedAt || b.updatedAt || b.createdAt || '').toString();
      return (bT > aT) ? 1 : (bT < aT) ? -1 : 0;
    });
    return repairs[0] || null;
  }

  _buildMaintenancePrefill(serial, latestRepair) {
    const sn = (serial || '').toString().trim();
    const r = latestRepair || null;
    const pf = {
      equipmentNo: sn,
      name: r?.machine || '',
      model: r?.productLine || '',
      location: r?.customer || '',
      owner: r?.ownerName || '',
      ownerEmail: r?.ownerEmail || '',
      installDate: '',
      cycleEvery: 30,
      cycleUnit: 'day',
      remindDays: [],
      tags: []
    };
    // tags：優先 productLine，其次 customer
    const tags = [];
    if (pf.model) tags.push(pf.model);
    if (pf.location) tags.push(pf.location);
    pf.tags = tags.slice(0, 5);
    return pf;
  }

  renderMaintenanceSummaryBox(serial, latestRepair) {
    const sn = (serial || '').toString().trim();
    const svc = this._getMaintenanceService();

    // 服務不存在
    if (!svc) {
      return `
        <div class="summary-box">
          <div class="box-title">🛠️ 保養</div>
          <div class="box-main">未載入</div>
          <div class="muted">MaintenanceService 未載入（請確認模組已整合）</div>
          <div class="summary-chips"><span class="chip static" style="--chip-color:#64748b;">—</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
            <button class="btn" onclick="MachinesUI.openMaintenance('${escapeJsString(sn)}')">開啟</button>
          </div>
        </div>
      `;
    }

    // 尚未初始化：先顯示載入中（Phase 1：UI 不直接呼叫 svc.init；統一走 AppRegistry.ensureReady）
    if (!svc.isInitialized) {
      try {
        if (!svc.__machinesReadyRequested && window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
          svc.__machinesReadyRequested = true;
          window.AppRegistry.ensureReady('MaintenanceService').then(() => {
            try { delete svc.__machinesReadyRequested; } catch (_) { svc.__machinesReadyRequested = false; }
            try { window.machinesUI?.renderDetail?.(); } catch (_) {}
          }).catch(() => {
            try { delete svc.__machinesReadyRequested; } catch (_) { svc.__machinesReadyRequested = false; }
          });
        }
      } catch (_) {}
      return `
        <div class="summary-box">
          <div class="box-title">🛠️ 保養</div>
          <div class="box-main">載入中…</div>
          <div class="muted">正在載入保養資料</div>
          <div class="summary-chips"><span class="chip static" style="--chip-color:#64748b;">—</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
            <button class="btn" onclick="MachinesUI.openMaintenance('${escapeJsString(sn)}')">開啟</button>
          </div>
        </div>
      `;
    }

    const eqs = (typeof svc.getEquipments === 'function') ? (svc.getEquipments() || []) : [];
    const eq = eqs.find(e => (e?.equipmentNo || '').toString().trim() === sn) || null;

    const chip = (label, color) => `<span class="chip static" style="--chip-color:${color};">${escapeHtml(label)}</span>`;

    if (!eq) {
      const pf = this._buildMaintenancePrefill(sn, latestRepair);
      const pfText = (pf.name || pf.model) ? `${escapeHtml(pf.name || '')}${pf.model ? ' · ' + escapeHtml(pf.model) : ''}` : '—';
      return `
        <div class="summary-box">
          <div class="box-title">🛠️ 保養</div>
          <div class="box-main">未建立</div>
          <div class="muted">${pfText}</div>
          <div class="summary-chips">
            ${chip('未建立設備', '#64748b')}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
            <button class="btn" onclick="MachinesUI.openMaintenance('${escapeJsString(sn)}')">開啟</button>
            <button class="btn" onclick="MachinesUI.createMaintenanceEquipment('${escapeJsString(sn)}')">建立設備</button>
            <button class="btn" onclick="MachinesUI.addMaintenanceRecord('${escapeJsString(sn)}')">＋ 建紀錄</button>
          </div>
        </div>
      `;
    }

    const due = (typeof svc.getDueInfo === 'function') ? (svc.getDueInfo(eq) || {}) : {};
    const st = (due.status || 'ok').toString();
    const nextDue = (due.nextDue || '').toString();
    const lastYMD = (due.lastYMD || '').toString();

    let primary = '正常';
    let color = 'var(--color-success)';
    if (st == 'overdue') { primary = `逾期（到期：${nextDue || '—'}）`; color = 'var(--color-error)'; }
    else if (st == 'dueSoon1') { primary = `即將到期（${nextDue || '—'}）`; color = 'var(--color-warning)'; }
    else if (st == 'dueSoon2') { primary = `即將到期（${nextDue || '—'}）`; color = 'var(--color-accent)'; }
    else if (st == 'noRecord') { primary = '尚無紀錄'; color = '#64748b'; }
    else { primary = `正常（下次：${nextDue || '—'}）`; color = 'var(--color-success)'; }

    const cycleLabel = (window.MaintenanceModel && typeof window.MaintenanceModel.cycleLabel === 'function')
      ? window.MaintenanceModel.cycleLabel(eq.cycleEvery, eq.cycleUnit)
      : `${eq.cycleEvery || 30}${(eq.cycleUnit || 'day') === 'month' ? '月' : ((eq.cycleUnit||'day')==='week'?'週':'天')}`;

    return `
      <div class="summary-box">
        <div class="box-title">🛠️ 保養</div>
        <div class="box-main">${escapeHtml(primary)}</div>
        <div class="muted">上次：${escapeHtml(lastYMD || '—')} · 週期：${escapeHtml(cycleLabel)}</div>
        <div class="summary-chips">
          ${chip(st === 'overdue' ? '逾期' : (st === 'dueSoon1' || st === 'dueSoon2' ? '即將到期' : (st === 'noRecord' ? '尚無紀錄' : '正常')), color)}
          ${lastYMD ? chip(`上次 ${lastYMD}`, 'var(--module-accent)') : ''}
          ${nextDue ? chip(`下次 ${nextDue}`, 'var(--module-accent)') : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <button class="btn" onclick="MachinesUI.openMaintenance('${escapeJsString(sn)}')">開啟</button>
          <button class="btn" onclick="MachinesUI.addMaintenanceRecord('${escapeJsString(sn)}')">＋ 建紀錄</button>
          <button class="btn ghost" onclick="MachinesUI.editMaintenanceEquipment('${escapeJsString(sn)}')">編輯設備</button>
        </div>
      </div>
    `;
  }

  async openMaintenance(serial) {
    const sn = (serial || '').toString().trim();
    if (!sn) return;

    const latest = this._getLatestRepairForSerial(sn);
    const prefill = this._buildMaintenancePrefill(sn, latest);

    const svc = await this._ensureMaintenanceInit();
    const eqs = (svc && typeof svc.getEquipments === 'function') ? (svc.getEquipments() || []) : [];
    const eq = eqs.find(e => (e?.equipmentNo || '').toString().trim() === sn) || null;

    // 深連結：若已存在 → 列表篩選；若不存在 → 開啟新增設備 modal（預填）
    window.__maintenanceDeepLink = eq
      ? { tab: 'equipments', searchEquip: sn }
      : { tab: 'equipments', searchEquip: sn, action: { type: 'createEquipment', prefill } };

    if (window.AppRouter?.navigate) {
      await window.AppRouter.navigate('maintenance');
    }
  }

  async createMaintenanceEquipment(serial) {
    const sn = (serial || '').toString().trim();
    if (!sn) return;

    const latest = this._getLatestRepairForSerial(sn);
    const prefill = this._buildMaintenancePrefill(sn, latest);

    const svc = await this._ensureMaintenanceInit();
    if (!svc || typeof svc.getEquipments !== 'function' || typeof svc.upsertEquipment !== 'function') {
      window.UI?.toast?.('MaintenanceService 未就緒', { type: 'error' });
      return;
    }

    const eqs = svc.getEquipments() || [];
    let eq = eqs.find(e => (e?.equipmentNo || '').toString().trim() === sn) || null;
    try {
      if (!eq) {
        eq = await svc.upsertEquipment(prefill);
      }
    } catch (e) {
      console.error(e);
      window.UI?.toast?.(e?.message || '建立設備失敗', { type: 'error' });
      return;
    }

    window.__maintenanceDeepLink = { tab: 'equipments', searchEquip: sn, action: { type: 'editEquipment', equipmentId: eq?.id || '' } };
    if (window.AppRouter?.navigate) {
      await window.AppRouter.navigate('maintenance');
    }
  }

  async editMaintenanceEquipment(serial) {
    const sn = (serial || '').toString().trim();
    if (!sn) return;

    const svc = await this._ensureMaintenanceInit();
    const eqs = (svc && typeof svc.getEquipments === 'function') ? (svc.getEquipments() || []) : [];
    const eq = eqs.find(e => (e?.equipmentNo || '').toString().trim() === sn) || null;

    if (!eq) {
      await this.createMaintenanceEquipment(sn);
      return;
    }

    window.__maintenanceDeepLink = { tab: 'equipments', searchEquip: sn, action: { type: 'editEquipment', equipmentId: eq.id } };
    if (window.AppRouter?.navigate) {
      await window.AppRouter.navigate('maintenance');
    }
  }

  async addMaintenanceRecord(serial) {
    const sn = (serial || '').toString().trim();
    if (!sn) return;

    const latest = this._getLatestRepairForSerial(sn);
    const prefill = this._buildMaintenancePrefill(sn, latest);

    const svc = await this._ensureMaintenanceInit();
    if (!svc || typeof svc.getEquipments !== 'function' || typeof svc.upsertEquipment !== 'function') {
      window.UI?.toast?.('MaintenanceService 未就緒', { type: 'error' });
      return;
    }

    const eqs = svc.getEquipments() || [];
    let eq = eqs.find(e => (e?.equipmentNo || '').toString().trim() === sn) || null;
    try {
      if (!eq) {
        eq = await svc.upsertEquipment(prefill);
      }
    } catch (e) {
      console.error(e);
      window.UI?.toast?.(e?.message || '建立設備失敗', { type: 'error' });
      return;
    }

    window.__maintenanceDeepLink = { tab: 'records', filterEquipmentId: eq?.id || '', action: { type: 'createRecord', equipmentId: eq?.id || '' } };
    if (window.AppRouter?.navigate) {
      await window.AppRouter.navigate('maintenance');
    }
  }

  onQueryDraft(value) {
    this.queryDraft = (value || '').toString();
  }

  onQueryKeydown(ev){
    const k = ev?.key || ev?.keyCode;
    if (k === 'Enter' || k === 13) {
      try { ev.preventDefault(); } catch (_) {}
      this.applyQuery();
    }
  }

  applyQuery(){
    this.query = (this.queryDraft || '').toString();
    this.renderSerialList();
    // 若搜尋後清單中不含選取序號，renderSerialList 會自動選第一筆
    this.renderDetail();
  }

  clearQuery(){
    this.queryDraft = '';
    this.query = '';
    try { const inp = document.getElementById('machines-serial-query'); if (inp) inp.value = ''; } catch (_) {}
    this.renderSerialList();
    this.renderDetail();
  }

  selectSerial(serial) {
    this.selectedSerial = (serial || '').toString();
    this.renderSerialList();
    this.renderDetail();
  }

  async reload() {
    // Phase 1：集中化初始化（registry-first）
    try {
      if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
        await window.AppRegistry.ensureReady([
          'RepairService',
          'RepairPartsService',
          'QuoteService',
          'OrderService'
        ], { loadAll: false });
      }
    } catch (e) {
      console.warn('MachinesUI reload ensureReady failed:', e);
    }

    this.renderSerialList();
    this.renderDetail();
  }

  async openRepair(repairId) {
    try {
      if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
        await window.AppRouter.navigate('repairs');
        setTimeout(() => {
          try { window.RepairUI?.openDetail?.(repairId); } catch (_) {}
        }, 80);
      } else {
        window.RepairUI?.openDetail?.(repairId);
      }
    } catch (e) {
      console.error('openRepair failed',
        e
      );
    }
  }

  // ================================
  // Static bridge
  // ================================
  static render(containerId = 'main-content') {
    if (!window.machinesUI) window.machinesUI = new MachinesUI();
    window.machinesUI.render(containerId);
  }

  static onQueryDraft(value) {
    window.machinesUI?.onQueryDraft(value);
  }

  static onQueryKeydown(ev){
    window.machinesUI?.onQueryKeydown(ev);
  }

  static applyQuery(){
    window.machinesUI?.applyQuery();
  }

  static clearQuery(){
    window.machinesUI?.clearQuery();
  }

  static selectSerial(serial) {
    window.machinesUI?.selectSerial(serial);
  }

  static async reload() {
    await window.machinesUI?.reload();
  }

  static async openRepair(repairId) {
    await window.machinesUI?.openRepair(repairId);
  }

  static async openMaintenance(serial) {
    await window.machinesUI?.openMaintenance(serial);
  }

  static async createMaintenanceEquipment(serial) {
    await window.machinesUI?.createMaintenanceEquipment(serial);
  }

  static async editMaintenanceEquipment(serial) {
    await window.machinesUI?.editMaintenanceEquipment(serial);
  }

  static async addMaintenanceRecord(serial) {
    await window.machinesUI?.addMaintenanceRecord(serial);
  }
}

if (typeof window !== 'undefined') {
  window.MachinesUI = MachinesUI;
  if (!window.machinesUI) window.machinesUI = new MachinesUI();
}

console.log('✅ MachinesUI loaded');
