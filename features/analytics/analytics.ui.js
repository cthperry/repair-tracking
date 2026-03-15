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
          const color = data.momDelta > 0 ? 'var(--status-cancelled-accent)' : data.momDelta < 0 ? 'var(--status-approved-accent)' : 'var(--color-text-secondary,#64748b)';
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
    const conv = stats.conversionRate || 0;
    const resolveLabel = (type, code) => {
      const normalized = (code || '').toString().trim().toLowerCase();
      if (!normalized || normalized === 'unknown') return '未填';
      try {
        if (window.AppConfig && typeof window.AppConfig.getBusinessStatusMeta === 'function') {
          return window.AppConfig.getBusinessStatusMeta(type, normalized)?.label || normalized;
        }
      } catch (_) {}
      return normalized;
    };

    const stageRows = Object.entries(stats.stageCount || {})
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `<div class="ana-billing-breakdown-row"><span>${esc(resolveLabel('billing_stage', k))}</span><strong>${v}</strong></div>`)
      .join('');

    const reasonRows = Object.entries(stats.reasonCount || {})
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `<div class="ana-billing-breakdown-row"><span>${esc(resolveLabel('billing_reason', k))}</span><strong>${v}</strong></div>`)
      .join('');

    return `
      <div class="card ana-chart-card ana-billing-card-enterprise">
        <div class="ana-chart-title">💰 收費 / 請款追蹤</div>
        <div class="ana-billing-grid-enterprise">
          <section class="ana-billing-pane ana-billing-pane-kpi">
            <div class="ana-billing-kpi-val">${conv}%</div>
            <div class="ana-billing-kpi-label">需收費 → 已下單轉單率</div>
            <div class="ana-billing-kpi-meta">用於追蹤需收費案件是否已進入下單流程。</div>
          </section>
          <section class="ana-billing-pane">
            <div class="ana-billing-pane-title">收費判定</div>
            <div class="ana-billing-list ana-billing-list-enterprise">
              <div class="ana-billing-row"><span class="muted">需收費</span><b>${stats.chargeable}</b></div>
              <div class="ana-billing-row"><span class="muted">不需收費</span><b>${stats.free}</b></div>
              <div class="ana-billing-row"><span class="muted">未決定</span><b>${stats.undecided}</b></div>
              <div class="ana-billing-row"><span class="muted">下單未確認</span><b>${stats.unknownOrder}</b></div>
            </div>
          </section>
          <section class="ana-billing-pane">
            <div class="ana-billing-pane-title">流程節點</div>
            <div class="ana-billing-list ana-billing-list-enterprise">
              <div class="ana-billing-row"><span class="muted">已下單</span><b>${stats.ordered}</b></div>
              <div class="ana-billing-row"><span class="muted">未下單</span><b>${stats.notOrdered}</b></div>
            </div>
            <div class="ana-billing-breakdown-title">未下單狀態</div>
            <div class="ana-billing-breakdown">${stageRows || '<div class="ana-billing-empty">目前沒有未下單狀態分布。</div>'}</div>
          </section>
          <section class="ana-billing-pane">
            <div class="ana-billing-pane-title">未下單原因</div>
            <div class="ana-billing-breakdown">${reasonRows || '<div class="ana-billing-empty">目前沒有未下單原因。</div>'}</div>
          </section>
        </div>
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

  function _renderWarroomHero(data, activePeriod) {
    const periodLabel = activePeriod === 3 ? '近 3 個月' : activePeriod === 12 ? '近 12 個月' : '近 6 個月';
    const businessPending = (data.riskStats?.businessPending || 0) + (data.riskStats?.quotePending || 0);
    return `
      <section class="ana-warroom-hero">
        <div class="ana-warroom-copy">
          <div class="ana-warroom-overline">Analytics Command Center</div>
          <h2 class="ana-title">📊 資料分析</h2>
          <div class="ana-subtitle">${periodLabel}維修、商務與交期的管理視角，集中在同一個決策版面。</div>
          <div class="ana-warroom-chip-row">
            <span class="ana-warroom-chip">進行中 ${data.totalActive}</span>
            <span class="ana-warroom-chip">待決策 ${businessPending}</span>
            <span class="ana-warroom-chip">待更新 ${data.staleRepairCount || 0}</span>
          </div>
        </div>
        <div class="ana-warroom-meta-grid">
          <div class="ana-warroom-meta-card"><span>本月新增</span><strong>${data.thisMoCount ?? '—'}</strong></div>
          <div class="ana-warroom-meta-card"><span>平均處理</span><strong>${data.overallAvgDays ?? 0} 天</strong></div>
          <div class="ana-warroom-meta-card"><span>已完成</span><strong>${data.totalCompleted}</strong></div>
          <div class="ana-warroom-meta-card"><span>需收費轉單率</span><strong>${data.billingStats?.conversionRate || 0}%</strong></div>
        </div>
      </section>
    `;
  }

  function _renderFunnelBoard(funnel) {
    if (!funnel) return '';
    const cards = [
      { title: '維修入口', value: funnel.activeRepairs, meta: `需要零件 ${funnel.needParts}` },
      { title: '報價決策', value: funnel.quoteSubmitted, meta: `草稿 ${funnel.quoteDraft} · 已核准 ${funnel.quoteApproved}` },
      { title: '訂單交期', value: funnel.orderOrdered, meta: `建立 ${funnel.orderCreated} · 已到貨 ${funnel.orderArrived}` },
      { title: '收費 / 下單', value: funnel.chargeable, meta: `已下單 ${funnel.billingOrdered} · 未閉環 ${funnel.billingPending}` }
    ];
    return `
      <div class="card ana-chart-card ana-warroom-card">
        <div class="ana-chart-title">🧭 主流程漏斗</div>
        <div class="ana-warroom-funnel-grid">
          ${cards.map(card => `
            <div class="ana-warroom-funnel-card">
              <div class="ana-warroom-funnel-title">${esc(card.title)}</div>
              <div class="ana-warroom-funnel-value">${card.value}</div>
              <div class="ana-warroom-funnel-meta">${esc(card.meta)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function _renderRiskBoard(risk) {
    if (!risk) return '';
    const rows = [
      { label: '維修逾期（>14 天）', value: risk.repairOverdue, tone: 'danger' },
      { label: '需要零件', value: risk.needParts, tone: 'warn' },
      { label: '待核准報價', value: risk.quotePending, tone: 'info' },
      { label: '收費 / 下單未決', value: risk.businessPending, tone: 'warn' },
      { label: '訂單交期逾期', value: risk.orderOverdue, tone: 'danger' },
      { label: '7 天內到貨', value: risk.orderDueSoon, tone: 'info' },
      { label: '未設定 ETA', value: risk.orderMissingEta, tone: 'neutral' }
    ];
    return `
      <div class="card ana-chart-card ana-warroom-card">
        <div class="ana-chart-title">⚠️ 風險雷達</div>
        <div class="ana-risk-list">
          ${rows.map(row => `
            <div class="ana-risk-row tone-${row.tone}">
              <span>${esc(row.label)}</span>
              <strong>${row.value}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function _renderAgingBoard(buckets, staleRepairs) {
    if (!buckets) return '';
    const items = [
      { label: '0–3 天', value: buckets.d0_3 || 0 },
      { label: '4–7 天', value: buckets.d4_7 || 0 },
      { label: '8–14 天', value: buckets.d8_14 || 0 },
      { label: '15 天以上', value: buckets.d15p || 0 }
    ];
    const max = Math.max(...items.map(item => item.value || 1), 1);
    return `
      <div class="card ana-chart-card ana-warroom-card">
        <div class="ana-chart-title">⏳ 案件 Aging</div>
        <div class="ana-aging-list">
          ${items.map(item => `
            <div class="ana-aging-row">
              <div class="ana-aging-copy"><span>${esc(item.label)}</span><strong>${item.value}</strong></div>
              <div class="ana-aging-bar-wrap"><div class="ana-aging-bar" style="width:${Math.round((item.value / max) * 100)}%"></div></div>
            </div>
          `).join('')}
        </div>
        <div class="ana-aging-subtitle">超過 3 天未更新的案件</div>
        <div class="ana-stale-list">
          ${(staleRepairs && staleRepairs.length) ? staleRepairs.map(item => `
            <div class="ana-stale-row">
              <div class="ana-stale-main"><div class="ana-stale-title">${esc(item.repairNo || item.id || '未命名')}</div><div class="ana-stale-meta">${esc(item.customer || '')}${item.machine ? ` · ${esc(item.machine)}` : ''}</div></div>
              <span class="ana-stale-tag">${item.staleDays} 天</span>
            </div>
          `).join('') : '<div class="ana-billing-empty">目前沒有超過 3 天未更新的案件。</div>'}
        </div>
      </div>
    `;
  }

  // ─── Main Render ───
  function render(data, activePeriod = 6) {
    return `
      <div class="analytics-root" id="analytics-root" data-period="${activePeriod}">
        <div class="ana-header">
          <div></div>
          ${_renderPeriodSelector(activePeriod)}
        </div>

        ${_renderWarroomHero(data, activePeriod)}
        ${_renderKPIs(data)}
        ${_renderBilling(data.billingStats)}

        <div class="ana-grid-2">
          ${_renderFunnelBoard(data.funnelStats)}
          ${_renderRiskBoard(data.riskStats)}
        </div>

        ${_renderAgingBoard(data.agingBuckets, data.staleRepairs)}

        <div class="ana-grid-2">
          ${_renderBarChart('維修趨勢（月別）', data.trend)}
          ${_renderPieChart('進行中狀態分佈', data.statusCount)}
        </div>

        <div class="ana-grid-2">
          ${_renderBarChart('平均處理天數', data.avgTrend)}
          ${_renderPriorityDist(data.priorityCount)}
        </div>

        <div class="ana-grid-2">
          ${_renderEngineerWorkload(data.topEngineers)}
          ${_renderRanking('客戶 Top 10（維修單數）', data.topCustomers, '👥')}
        </div>

        ${_renderRanking('設備 Top 10（維修單數）', data.topMachines, '🖥️')}
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
