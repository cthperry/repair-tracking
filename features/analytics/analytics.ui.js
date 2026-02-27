/**
 * Analytics UI（資料分析面板 - UI 層）
 *
 * 使用純 CSS bar chart + SVG 圓餅圖，不依賴外部 chart library。
 */
(function () {
  'use strict';

  const esc = (s) => {
    const t = (s === null || s === undefined) ? '' : String(s);
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  // ─── KPI Cards ───
  function _renderKPIs(data) {
    // MoM delta badge
    const momBadge = (data.momPct !== null && data.momPct !== undefined)
      ? (() => {
          const sign = data.momDelta >= 0 ? '+' : '';
          const color = data.momDelta > 0 ? '#ef4444' : data.momDelta < 0 ? '#16a34a' : '#64748b';
          return `<span class="ana-kpi-delta" style="color:${color}">${sign}${data.momPct}%</span>`;
        })()
      : '';

    const cards = [
      { label: '全部維修單', value: data.totalAll, icon: '📋', sub: '' },
      { label: '進行中', value: data.totalActive, icon: '🔧', accent: data.totalActive > 0, sub: '' },
      { label: '本月新增', value: data.thisMoCount ?? '—', icon: '📅', sub: momBadge },
      { label: '已完成', value: data.totalCompleted, icon: '✅', sub: '' },
      { label: '平均處理天數', value: (data.overallAvgDays ?? 0) + ' 天', icon: '⏱️', sub: '' }
    ];

    return `
      <div class="ana-kpi-grid">
        ${cards.map(c => `
          <div class="ana-kpi ${c.accent ? 'ana-kpi-accent' : ''}">
            <div class="ana-kpi-icon">${c.icon}</div>
            <div class="ana-kpi-val">${c.value}${c.sub || ''}</div>
            <div class="ana-kpi-label">${esc(c.label)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── Billing / Conversion ───
  function _renderBilling(stats) {
    if (!stats) return '';
    const total = (stats.chargeable || 0) + (stats.free || 0) + (stats.undecided || 0);
    const conv = stats.conversionRate || 0;
    const reasonMap = { price: '價格過高', budget: '客戶預算不足', internal: '客戶內部流程/延後', other: '其他', unknown: '未填' };
    const reasons = Object.entries(stats.reasonCount || {})
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${reasonMap[k] || k}：${v}`)
      .join('、');

    return `
      <div class="card ana-chart-card">
        <div class="ana-chart-title">💰 收費 / 轉單</div>
        <div class="ana-billing-grid">
          <div class="ana-billing-kpi">
            <div class="ana-billing-kpi-val">${conv}%</div>
            <div class="ana-billing-kpi-label">需收費 → 已下單轉單率</div>
          </div>
          <div class="ana-billing-list">
            <div class="ana-billing-row"><span class="muted">需收費</span><b>${stats.chargeable}</b></div>
            <div class="ana-billing-row"><span class="muted">不需收費</span><b>${stats.free}</b></div>
            <div class="ana-billing-row"><span class="muted">未決定</span><b>${stats.undecided}</b></div>
            <div class="ana-billing-row"><span class="muted">已下單</span><b>${stats.ordered}</b></div>
            <div class="ana-billing-row"><span class="muted">未下單</span><b>${stats.notOrdered}</b></div>
            <div class="ana-billing-row"><span class="muted">下單未確認</span><b>${stats.unknownOrder}</b></div>
          </div>
        </div>
        ${reasons ? `<div class="muted" style="margin-top:10px;">未下單原因：${esc(reasons)}</div>` : ''}
      </div>
    `;
  }

  // ─── Bar Chart (CSS-based) ───
  function _renderBarChart(title, data, options = {}) {
    if (!data.length) return '';
    const maxVal = Math.max(...data.map(d => Math.max(d.created || 0, d.completed || 0, d.avg || 0, d.count || 0, 1)));
    const showDual = data[0].created !== undefined;
    const showAvg = data[0].avg !== undefined;
    const showCount = data[0].count !== undefined;

    const bars = data.map(d => {
      if (showDual) {
        const h1 = Math.round((d.created / maxVal) * 100);
        const h2 = Math.round((d.completed / maxVal) * 100);
        return `
          <div class="ana-bar-col">
            <div class="ana-bar-pair">
              <div class="ana-bar ana-bar-1" style="height:${h1}%" title="建立：${d.created}"><span class="ana-bar-val">${d.created || ''}</span></div>
              <div class="ana-bar ana-bar-2" style="height:${h2}%" title="完成：${d.completed}"><span class="ana-bar-val">${d.completed || ''}</span></div>
            </div>
            <div class="ana-bar-label">${esc(d.label)}</div>
          </div>
        `;
      } else if (showAvg) {
        const h = Math.round((d.avg / maxVal) * 100);
        return `
          <div class="ana-bar-col">
            <div class="ana-bar-pair">
              <div class="ana-bar ana-bar-3" style="height:${h}%" title="${d.avg} 天"><span class="ana-bar-val">${d.avg || ''}</span></div>
            </div>
            <div class="ana-bar-label">${esc(d.label)}</div>
          </div>
        `;
      } else if (showCount) {
        const h = Math.round((d.count / maxVal) * 100);
        return `
          <div class="ana-bar-col ana-bar-h">
            <div class="ana-bar-h-bar" style="width:${h}%"></div>
            <span class="ana-bar-h-name">${esc(d.name)}</span>
            <span class="ana-bar-h-val">${d.count}</span>
          </div>
        `;
      }
      return '';
    }).join('');

    const legend = showDual
      ? '<div class="ana-legend"><span class="ana-leg-dot ana-leg-1"></span>建立 <span class="ana-leg-dot ana-leg-2"></span>完成</div>'
      : '';

    const isHorizontal = data[0].count !== undefined;

    return `
      <div class="card ana-chart-card">
        <div class="ana-chart-title">${esc(title)}</div>
        ${legend}
        <div class="ana-bar-chart ${isHorizontal ? 'ana-bar-horizontal' : ''}">
          ${bars}
        </div>
      </div>
    `;
  }

  // ─── SVG Pie Chart ───
  function _renderPieChart(title, statusCount) {
    const entries = Object.entries(statusCount).filter(([, v]) => v > 0);
    if (!entries.length) return '';

    const total = entries.reduce((s, [, v]) => s + v, 0);
    const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4', '#84cc16'];
    let angle = 0;
    const paths = [];
    const legendItems = [];

    entries.forEach(([label, count], i) => {
      const pct = count / total;
      const color = colors[i % colors.length];
      const startAngle = angle;
      const endAngle = angle + pct * 360;

      // SVG arc
      const r = 80;
      const cx = 100, cy = 100;
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const large = pct > 0.5 ? 1 : 0;

      if (pct >= 0.999) {
        // Full circle
        paths.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" />`);
      } else {
        paths.push(`<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${color}" />`);
      }

      legendItems.push(`
        <div class="ana-pie-legend-item">
          <span class="ana-pie-dot" style="background:${color}"></span>
          <span class="ana-pie-label">${esc(label)}</span>
          <span class="ana-pie-count">${count} (${Math.round(pct * 100)}%)</span>
        </div>
      `);

      angle = endAngle;
    });

    return `
      <div class="card ana-chart-card">
        <div class="ana-chart-title">${esc(title)}</div>
        <div class="ana-pie-wrap">
          <svg viewBox="0 0 200 200" class="ana-pie-svg">
            ${paths.join('')}
            <circle cx="100" cy="100" r="45" fill="var(--color-panel, #fff)" />
            <text x="100" y="96" text-anchor="middle" font-size="20" font-weight="800" fill="var(--color-text, #1e293b)">${total}</text>
            <text x="100" y="113" text-anchor="middle" font-size="10" fill="var(--color-text-muted, #64748b)">進行中</text>
          </svg>
          <div class="ana-pie-legend">${legendItems.join('')}</div>
        </div>
      </div>
    `;
  }

  // ─── Maintenance Card ───
  function _renderMaintenance(stats) {
    if (!stats) return '';
    const compliance = stats.total ? Math.round((stats.onTime / stats.total) * 100) : 0;
    return `
      <div class="card ana-chart-card">
        <div class="ana-chart-title">🛠️ 保養合規率</div>
        <div class="ana-maint-grid">
          <div class="ana-maint-ring">
            <svg viewBox="0 0 120 120" class="ana-ring-svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-border, #e2e8f0)" stroke-width="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#10b981" stroke-width="10"
                stroke-dasharray="${Math.round(compliance * 3.14)} 314"
                stroke-linecap="round" transform="rotate(-90 60 60)" />
              <text x="60" y="56" text-anchor="middle" font-size="22" font-weight="800" fill="var(--color-text)">${compliance}%</text>
              <text x="60" y="72" text-anchor="middle" font-size="10" fill="var(--color-text-muted)">合規率</text>
            </svg>
          </div>
          <div class="ana-maint-stats">
            <div class="ana-maint-row"><span class="ana-maint-dot" style="background:#10b981"></span>正常 <b>${stats.onTime}</b></div>
            <div class="ana-maint-row"><span class="ana-maint-dot" style="background:#f59e0b"></span>即將到期 <b>${stats.dueSoon}</b></div>
            <div class="ana-maint-row"><span class="ana-maint-dot" style="background:#ef4444"></span>逾期 <b>${stats.overdue}</b></div>
            <div class="ana-maint-row muted">共 ${stats.total} 台設備</div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Horizontal Ranking ───
  function _renderRanking(title, items, icon) {
    if (!items.length) return '';
    const maxVal = items[0].count || 1;
    const bars = items.map((d, i) => {
      const w = Math.round((d.count / maxVal) * 100);
      return `
        <div class="ana-rank-row">
          <span class="ana-rank-idx">${i + 1}</span>
          <span class="ana-rank-name" title="${esc(d.name)}">${esc(d.name.length > 18 ? d.name.slice(0, 18) + '…' : d.name)}</span>
          <div class="ana-rank-bar-wrap">
            <div class="ana-rank-bar" style="width:${w}%"></div>
          </div>
          <span class="ana-rank-val">${d.count}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="card ana-chart-card">
        <div class="ana-chart-title">${icon} ${esc(title)}</div>
        <div class="ana-ranking">${bars}</div>
      </div>
    `;
  }

  // ─── Engineer Workload ───
  function _renderEngineerWorkload(items) {
    if (!items || !items.length) return '';
    const maxVal = items[0].count || 1;
    const rows = items.map((d, i) => {
      const w = Math.round((d.count / maxVal) * 100);
      const activeRate = d.count > 0 ? Math.round((d.active / d.count) * 100) : 0;
      return `
        <div class="ana-rank-row">
          <span class="ana-rank-idx">${i + 1}</span>
          <span class="ana-rank-name" title="${esc(d.name)}">${esc(d.name.length > 14 ? d.name.slice(0, 14) + '…' : d.name)}</span>
          <div class="ana-rank-bar-wrap">
            <div class="ana-rank-bar" style="width:${w}%"></div>
          </div>
          <span class="ana-rank-val">${d.count}</span>
          <span class="ana-eng-active" title="進行中 ${d.active} 件">${d.active > 0 ? `<span style="color:#f59e0b;font-size:11px">●${d.active}</span>` : ''}</span>
        </div>
      `;
    }).join('');
    return `
      <div class="card ana-chart-card">
        <div class="ana-chart-title">👤 工程師負載 Top ${items.length}</div>
        <div class="ana-ranking ana-eng-ranking">${rows}</div>
        <div class="muted" style="margin-top:8px;font-size:11px">● 黃色數字 = 進行中件數</div>
      </div>
    `;
  }

  // ─── Priority Distribution ───
  function _renderPriorityDist(priorityCount) {
    const entries = Object.entries(priorityCount || {}).filter(([, v]) => v > 0);
    if (!entries.length) return '';
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const colorMap = { '緊急': '#ef4444', '高': '#f59e0b', '一般': '#3b82f6', '低': '#94a3b8' };
    const rows = entries
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => {
        const w = Math.round((count / total) * 100);
        const color = colorMap[label] || '#64748b';
        return `
          <div class="ana-pri-row">
            <span class="ana-pri-dot" style="background:${color}"></span>
            <span class="ana-pri-name">${esc(label)}</span>
            <div class="ana-rank-bar-wrap">
              <div class="ana-rank-bar" style="width:${w}%;background:${color}40;border-left:3px solid ${color}"></div>
            </div>
            <span class="ana-rank-val">${count}</span>
            <span class="muted" style="font-size:11px;min-width:32px;text-align:right">${w}%</span>
          </div>
        `;
      }).join('');
    return `
      <div class="card ana-chart-card">
        <div class="ana-chart-title">🚦 優先級分佈（進行中）</div>
        <div class="ana-ranking">${rows}</div>
      </div>
    `;
  }

  // ─── Period Selector ───
  function _renderPeriodSelector(activePeriod = 6) {
    return `
      <div class="ana-period-bar">
        <span class="ana-period-label">分析期間</span>
        <button class="btn ghost ana-period-btn ${activePeriod === 6 ? 'ana-period-active' : ''}" data-months="6">6 個月</button>
        <button class="btn ghost ana-period-btn ${activePeriod === 12 ? 'ana-period-active' : ''}" data-months="12">12 個月</button>
        <button class="btn ghost ana-period-btn ${activePeriod === 3 ? 'ana-period-active' : ''}" data-months="3">3 個月</button>
      </div>
    `;
  }

  // ─── Main Render ───
  function render(data, activePeriod = 6) {
    const periodLabel = activePeriod === 3 ? '近 3 個月' : activePeriod === 12 ? '近 12 個月' : '近 6 個月';
    return `
      <div class="analytics-root" id="analytics-root" data-period="${activePeriod}">
        <div class="ana-header">
          <div>
            <h2 class="ana-title">📊 資料分析</h2>
            <div class="ana-subtitle">${periodLabel}維修數據總覽</div>
          </div>
          ${_renderPeriodSelector(activePeriod)}
        </div>

        ${_renderKPIs(data)}

        ${_renderBilling(data.billingStats)}

        <div class="ana-grid-2">
          ${_renderBarChart('維修趨勢（月別）', data.trend)}
          ${_renderPieChart('進行中狀態分佈', data.statusCount)}
        </div>

        <div class="ana-grid-2">
          ${_renderBarChart('平均處理天數', data.avgTrend)}
          ${_renderMaintenance(data.maintenanceStats)}
        </div>

        <div class="ana-grid-2">
          ${_renderEngineerWorkload(data.topEngineers)}
          ${_renderPriorityDist(data.priorityCount)}
        </div>

        <div class="ana-grid-2">
          ${_renderRanking('客戶 Top 10（維修單數）', data.topCustomers, '👥')}
          ${_renderRanking('設備 Top 10（維修單數）', data.topMachines, '🖥️')}
        </div>
      </div>
    `;
  }

  function bindEvents(container, activePeriod = 6) {
    // 期間切換按鈕
    container.querySelectorAll('.ana-period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const months = parseInt(btn.dataset.months, 10);
        if (!months || months === activePeriod) return;
        try {
          window.AnalyticsController?.reload?.('main-content', months);
        } catch (_) {}
      });
    });
  }

  window.AnalyticsUI = { render, bindEvents };
  try { console.log('✅ AnalyticsUI loaded'); } catch (_) {}
})();
