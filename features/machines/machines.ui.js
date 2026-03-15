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

  _emptyState(title, text, icon='ℹ️') {
    try {
      if (window.UI && typeof window.UI.emptyStateHTML === 'function') {
        return window.UI.emptyStateHTML({ icon, title, text, className: 'machines-empty-state' });
      }
    } catch (_) {}
    return `
      <div class="empty-state machines-empty-state">
        <div class="empty-icon" aria-hidden="true">${escapeHtml(icon)}</div>
        <div class="empty-title">${escapeHtml(title)}</div>
        <div class="empty-text">${escapeHtml(text)}</div>
      </div>
    `.trim();
  }

  _enterpriseStatHtml(label, value, options = {}) {
    try {
      if (window.UI && typeof window.UI.enterpriseStatHTML === 'function') {
        return window.UI.enterpriseStatHTML(label, value, options);
      }
    } catch (_) {}
    return `<div class="enterprise-mini-stat"><span>${escapeHtml(label || '')}</span><strong>${options.allowHtml ? String(value || '—') : escapeHtml(value || '—')}</strong></div>`;
  }

  _enterpriseOverviewItemHtml(label, value, options = {}) {
    try {
      if (window.UI && typeof window.UI.enterpriseOverviewItemHTML === 'function') {
        return window.UI.enterpriseOverviewItemHTML(label, value, options);
      }
    } catch (_) {}
    return `<div class="enterprise-detail-overview-item"><span>${escapeHtml(label || '')}</span><strong>${options.allowHtml ? String(value || '—') : escapeHtml(value || '—')}</strong></div>`;
  }

  _enterpriseOverviewNoteHtml(label, value, options = {}) {
    try {
      if (window.UI && typeof window.UI.enterpriseOverviewNoteHTML === 'function') {
        return window.UI.enterpriseOverviewNoteHTML(label, value, options);
      }
    } catch (_) {}
    return `<div class="enterprise-detail-overview-note"><span>${escapeHtml(label || '')}</span><div>${options.allowHtml ? String(value || '—') : escapeHtml(value || '—')}</div></div>`;
  }

  _enterpriseSectionHeaderHtml(options = {}) {
    try {
      if (window.UI && typeof window.UI.enterpriseSectionHeaderHTML === 'function') {
        return window.UI.enterpriseSectionHeaderHTML(options);
      }
    } catch (_) {}
    const title = (options.title || '').toString();
    const desc = (options.desc || '').toString();
    const eyebrow = (options.eyebrow || '').toString();
    const actionsHtml = (options.actionsHtml || '').toString();
    return `<div class="enterprise-section-head"><div class="enterprise-section-copy">${eyebrow ? `<div class="enterprise-section-eyebrow">${escapeHtml(eyebrow)}</div>` : ''}${title ? `<div class="enterprise-section-title">${escapeHtml(title)}</div>` : ''}${desc ? `<div class="enterprise-section-desc">${escapeHtml(desc)}</div>` : ''}</div>${actionsHtml ? `<div class="enterprise-section-actions">${actionsHtml}</div>` : ''}</div>`;
  }

  _chipHtml(label, options = {}) {
    try {
      if (window.UI && typeof window.UI.chipHTML === 'function') {
        return window.UI.chipHTML(label, options);
      }
    } catch (_) {}
    const tone = (options.tone || '').toString().trim();
    const extra = (options.className || '').toString().trim();
    const className = ['chip', options.static ? 'static' : '', options.active ? 'active' : '', tone ? `tone-${tone}` : '', extra].filter(Boolean).join(' ');
    const tagName = (options.tagName || 'span').toString().toLowerCase() === 'button' ? 'button' : 'span';
    const attrs = (options.attrs || '').toString().trim();
    return `<${tagName} class="${className}"${attrs ? ` ${attrs}` : ''}>${options.allowHtml ? String(label || '—') : escapeHtml(label || '—')}</${tagName}>`;
  }

  _toneForRepairStatus(status = '') {
    const value = (status || '').toString().trim();
    if (value === '已完成') return 'success';
    if (value === '需要零件') return 'warning';
    return 'primary';
  }

  _toneForPartsStage(label = '') {
    const value = (label || '').toString().trim();
    if (value === '已結案') return 'success';
    if (value === '待到貨') return 'info';
    if (value === '待更換') return 'secondary';
    if (value === '待報價' || value === '待下單') return 'warning';
    return 'primary';
  }

  _toneForBusinessStatus(label = '') {
    const value = (label || '').toString().trim();
    if (value === '已核准' || value === '已結案') return 'success';
    if (value === '已送出' || value === '已下單' || value === '已到貨') return 'info';
    if (value === '草稿' || value === '建立') return 'warning';
    if (value === '已取消') return 'neutral';
    return 'primary';
  }

  render(containerId = 'main-content') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="machines-module ops-module-shell">
        <div class="machines-header module-toolbar">
          <div class="module-toolbar-left">
            <div>
              <div class="ops-toolbar-title">
                <div class="ops-toolbar-heading">機台歷史</div>
              </div>
              <div class="ops-toolbar-summary">依序號快速檢視維修、零件、報價、訂單狀態（Desktop + Mobile 相容）</div>
            </div>
          </div>
          <div class="module-toolbar-right ops-actions">
            <button class="btn" data-action="reload">重新整理</button>
          </div>
        </div>

        <div class="machines-layout">
          <div class="machine-panel card">
            <div class="machine-panel-header ops-actions">
              <input
                class="input"
                id="machines-serial-query"
                placeholder="搜尋序號（支援模糊搜尋）"
                value="${escapeHtml(this.queryDraft || '')}"

              />
              <button class="btn" type="button" data-action="applyQuery">搜尋</button>
              <button class="btn ghost" type="button" data-action="clearQuery">清除</button>
            </div>
            <div class="serial-list" id="machines-serial-list"></div>
          </div>

          <div class="machine-panel card">
            <div class="machine-detail" id="machines-detail"></div>
          </div>
        </div>
      </div>
    `;

    this._bindDomHandlers(container);
    this.renderSerialList();
    this.renderDetail();
  }

  _bindDomHandlers(container) {
    if (!container || container.__machinesDomBound) return;
    container.__machinesDomBound = true;

    container.addEventListener('click', (event) => {
      const actionEl = event.target?.closest?.('[data-action]');
      if (!actionEl || !container.contains(actionEl)) return;
      const action = (actionEl.getAttribute('data-action') || '').toString();
      if (!action) return;
      if (action === 'reload') return MachinesUI.reload();
      if (action === 'applyQuery') return MachinesUI.applyQuery();
      if (action === 'clearQuery') return MachinesUI.clearQuery();
      if (action === 'selectSerial') return MachinesUI.selectSerial(actionEl.getAttribute('data-serial') || '');
      if (action === 'openRepair') return MachinesUI.openRepair(actionEl.getAttribute('data-repair-id') || '');
    });

    container.addEventListener('input', (event) => {
      if (event.target?.id === 'machines-serial-query') {
        MachinesUI.onQueryDraft(event.target.value);
      }
    });

    container.addEventListener('keydown', (event) => {
      if (event.target?.id === 'machines-serial-query') {
        MachinesUI.onQueryKeydown(event);
      }
    });
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
      listEl.innerHTML = this._emptyState('找不到序號', '請調整搜尋條件，或確認維修單已填寫「序號」欄位。', '🔎');
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
        <button class="serial-item ${active}" type="button" data-action="selectSerial" data-serial="${escapeHtml(serial)}">
          <div class="serial-top">
            <div class="serial-no">${escapeHtml(serial)}</div>
            ${this._chipHtml(statusText, { static: true, tone: this._toneForRepairStatus(latestStatus || "進行中") })}
          </div>
          <div class="serial-sub">
            <span>維修單：${arr.length} 筆</span>
            ${updatedText ? `<span>更新：${escapeHtml(updatedText)}</span>` : ''}
          </div>
        </button>
      `;
    }).join('');
  }

  renderDetail() {
    const detailEl = document.getElementById('machines-detail');
    if (!detailEl) return;

    const serial = (this.selectedSerial || '').toString().trim();
    if (!serial) {
      detailEl.innerHTML = this._emptyState('請先選擇序號', '左側清單選取序號後，即可查看狀態總覽與維修履歷。', '🧾');
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
    const historyFocusText = latest ? '已整合維修、零件、報價與訂單節點' : '尚無維修履歷';

    const heroStatsHtml = [
      this._enterpriseStatHtml('維修單數', `${repairs.length} 筆`),
      this._enterpriseStatHtml('最新進度', `${latestProgress}%`),
      this._enterpriseStatHtml('報價 / 訂單', (sum?.orders?.total ? this.formatStatusPrimary(sum.orders, '未建立') : this.formatStatusPrimary(sum?.quotes, '未建立'))),
      this._enterpriseStatHtml('最近更新', lastTimeText || '—')
    ].join('');

    const machineOverviewHtml = [
      this._enterpriseOverviewItemHtml('序號', serial),
      this._enterpriseOverviewItemHtml('客戶', latest ? (latest.customer || latest.customerName || '—') : '—'),
      this._enterpriseOverviewItemHtml('機台', latest ? (latest.machine || '—') : '—'),
      this._enterpriseOverviewItemHtml('最後更新', lastTimeText || '—'),
      this._enterpriseOverviewItemHtml('維修狀態', repairStatusLine),
      this._enterpriseOverviewItemHtml('最近焦點', historyFocusText)
    ].join('');

    const workflowNotesHtml = [
      this._enterpriseOverviewNoteHtml('零件追蹤', this.formatPartsPrimary(sum?.parts)),
      this._enterpriseOverviewNoteHtml('報價節點', this.formatStatusPrimary(sum?.quotes, '未建立')),
      this._enterpriseOverviewNoteHtml('訂單節點', this.formatStatusPrimary(sum?.orders, '未建立')),
      this._enterpriseOverviewNoteHtml('履歷焦點', historyFocusText)
    ].join('');

    const machineActionsHtml = [
      latest ? `<button class="btn" type="button" data-action="openRepair" data-repair-id="${escapeHtml(latest.id)}">開啟最新維修單</button>` : '',
      `<button class="btn ghost" type="button" data-action="clearQuery">返回清單</button>`
    ].filter(Boolean).join('');

    const historyHeaderHtml = this._enterpriseSectionHeaderHtml({
      eyebrow: 'Repair History',
      title: '維修履歷（最新在上）',
      desc: '同一序號的維修、零件與商務節點已收斂在同一個時間序列中。',
      actionsHtml: this._chipHtml(`共 ${repairs.length} 筆`, { static: true, tone: 'primary' })
    });

    detailEl.innerHTML = `
      <div class="machine-enterprise-detail">
        <section class="enterprise-detail-hero machine-detail-hero-enterprise">
          <div class="enterprise-detail-hero-copy">
            <div class="enterprise-detail-overline">Machine Timeline</div>
            <div class="enterprise-detail-title-row">
              <div>
                <h3 class="enterprise-detail-title">${escapeHtml(serial)}</h3>
                <p class="enterprise-detail-subtitle">整合維修、零件、報價與訂單節點的單機歷史視圖。</p>
              </div>
              <div class="enterprise-detail-title-aside">
                <span class="enterprise-detail-chip">序號視圖</span>
                <span class="enterprise-detail-chip is-muted">${escapeHtml(repairStatusLine)}</span>
              </div>
            </div>
            <div class="enterprise-detail-chip-row">
              ${lastTimeText ? `<span class="enterprise-detail-chip">最後更新 ${escapeHtml(lastTimeText)}</span>` : '<span class="enterprise-detail-chip is-muted">尚無更新時間</span>'}
              <span class="enterprise-detail-chip is-muted">${escapeHtml(historyFocusText)}</span>
            </div>
          </div>
          <div class="enterprise-detail-hero-stats">${heroStatsHtml}</div>
        </section>

        <section class="enterprise-detail-overview-board machine-detail-overview-board">
          <article class="enterprise-detail-overview-card enterprise-detail-overview-card-primary">
            <div class="enterprise-detail-overview-card-head">
              <div>
                <div class="enterprise-detail-overview-eyebrow">Machine Overview</div>
                <div class="enterprise-detail-overview-title">單機狀態總覽</div>
              </div>
              <div class="enterprise-detail-overview-signal-row">
                <span class="enterprise-detail-overview-chip tone-primary">維修 ${repairs.length} 筆</span>
                <span class="enterprise-detail-overview-chip tone-primary">歷史視圖</span>
              </div>
            </div>
            <div class="enterprise-detail-overview-grid enterprise-detail-overview-grid-2">${machineOverviewHtml}</div>
          </article>

          <article class="enterprise-detail-overview-card">
            <div class="enterprise-detail-overview-card-head">
              <div>
                <div class="enterprise-detail-overview-eyebrow">Flow Summary</div>
                <div class="enterprise-detail-overview-title">流程節點摘要</div>
              </div>
            </div>
            <div class="enterprise-detail-overview-grid enterprise-detail-overview-grid-2">${workflowNotesHtml}</div>
          </article>

          <article class="enterprise-detail-overview-card">
            <div class="enterprise-detail-overview-card-head">
              <div>
                <div class="enterprise-detail-overview-eyebrow">Linked Actions</div>
                <div class="enterprise-detail-overview-title">快速處置</div>
              </div>
            </div>
            <div class="machine-detail-actions ops-actions">${machineActionsHtml}</div>
          </article>
        </section>

        <section class="machine-history enterprise-detail-overview-card">
          ${historyHeaderHtml}
          <div class="history-list">
            ${repairs.map(r => this.renderHistoryCard(r)).join('')}
          </div>
        </section>
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
      return this._chipHtml('無', { static: true, tone: 'neutral' });
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
      chips.push(this._chipHtml(`${label} ${c}/${total}`, { static: true, tone: this._toneForBusinessStatus(label) }));
    }

    // 若全都 0，代表都已結案
    if (chips.length === 0) {
      return this._chipHtml(`已結案 ${total}/${total}`, { static: true, tone: 'success' });
    }

    return chips.join('');
  }

  renderStatusCountChips(summary, order) {
    if (!summary || !summary.total) {
      return this._chipHtml('無', { static: true, tone: 'neutral' });
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
      chips.push(this._chipHtml(`${label} ${c}/${total}`, { static: true, tone: this._toneForPartsStage(label) }));
    }

    // 其他未知狀態也列出（但不干擾排序）
    for (const [k, v] of Object.entries(by)) {
      if (order.includes(k)) continue;
      if (v <= 0) continue;
      chips.push(this._chipHtml(`${k} ${v}/${total}`, { static: true, tone: this._toneForBusinessStatus(k) }));
    }

    return chips.length ? chips.join('') : this._chipHtml('—', { static: true, tone: 'neutral' });
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
      <button class="history-card" type="button" data-action="openRepair" data-repair-id="${escapeHtml(repair.id)}">
        <div class="history-top">
          <div class="history-no">${no}</div>
          ${this._chipHtml(`${status} ${progress}%`, { static: true, tone: this._toneForRepairStatus(repair.status) })}
        </div>
        <div class="history-sub">
          <span>${customer}</span>
          <span>${machine}</span>
          ${timeText ? `<span>時間：${escapeHtml(timeText)}</span>` : ''}
        </div>
        <div class="history-chips">
          ${this._chipHtml(`🧩 ${partsText}`, { static: true, tone: 'warning' })}
          ${this._chipHtml(`🧾 ${quotesText}`, { static: true, tone: 'info' })}
          ${this._chipHtml(`📦 ${ordersText}`, { static: true, tone: 'secondary' })}
        </div>
      </button>
    `;
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
}

if (typeof window !== 'undefined') {
  window.MachinesUI = MachinesUI;
  if (!window.machinesUI) window.machinesUI = new MachinesUI();
}

console.log('✅ MachinesUI loaded');
