/**
 * Activity Timeline（簡易活動日誌）
 *
 * 功能：
 * - 在維修單詳情頁呈現統一時間軸
 * - 整合多來源事件：
 *   1. repairHistory（建立/更新/刪除/狀態變更）
 *   2. repairWorkLogs（到場維修紀錄）
 *   3. quotes（報價建立/核准/送出）
 *   4. orders（訂單建立/到貨/結案）
 *   5. repairParts（零件狀態變更）
 * - 由新到舊排列，每筆顯示時間/圖標/摘要
 * - 純讀取，不寫入資料
 *
 * 使用方式：
 *   const events = ActivityTimeline.buildForRepair(repairId);
 *   const html = ActivityTimeline.render(events);
 *
 * 依賴：
 * - RepairService（repairHistory）
 * - WorkLogService（repairWorkLogs） — 若已載入
 * - QuoteService / OrderService / RepairPartsService — 若已載入
 */
(function () {
  'use strict';

  // ─── Helpers ───
  const getSvc = (name) => {
    try {
      if (typeof window._svc === 'function') return window._svc(name);
    } catch (_) {}
    return null;
  };

  const esc = (s) => {
    const t = (s === null || s === undefined) ? '' : String(s);
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const clip = (s, n = 80) => {
    const str = (s || '').toString().trim();
    return str.length <= n ? str : str.slice(0, n) + '…';
  };

  const fmtDate = (ts) => {
    try {
      if (!ts) return '';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts).slice(0, 16);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (_) { return ''; }
  };

  const fmtDateShort = (ts) => {
    try {
      if (!ts) return '';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts).slice(0, 10);
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (_) { return ''; }
  };

  const tsVal = (ts) => {
    try { return new Date(ts).getTime() || 0; } catch (_) { return 0; }
  };

  // ─── Event Types ───
  const ICONS = {
    create: '🆕',
    update: '✏️',
    delete: '🗑️',
    status: '🔄',
    worklog: '🔧',
    quote_create: '🧾',
    quote_status: '📝',
    order_create: '📦',
    order_status: '🚚',
    part_status: '🧩',
    complete: '✅',
    generic: '📌'
  };

  const COLORS = {
    create: '#22c55e',
    update: '#3b82f6',
    delete: '#ef4444',
    status: '#8b5cf6',
    worklog: '#f59e0b',
    quote_create: '#6366f1',
    quote_status: '#6366f1',
    order_create: '#d97706',
    order_status: '#d97706',
    part_status: '#16a34a',
    complete: '#10b981',
    generic: '#94a3b8'
  };

  // ─── Build Events ───
  function buildForRepair(repairId) {
    if (!repairId) return [];
    const events = [];

    // 1. Repair History
    try {
      const rs = getSvc('RepairService');
      const history = (rs && typeof rs.getHistory === 'function') ? rs.getHistory(repairId) : [];
      for (const h of history) {
        if (!h) continue;
        const action = (h.action || '').toUpperCase();
        let type = 'update';
        let summary = '';

        if (action === 'CREATE') {
          type = 'create';
          summary = '建立維修單';
        } else if (action === 'DELETE') {
          type = 'delete';
          summary = '刪除維修單';
        } else {
          // Check for status change
          if (h.fromStatus && h.toStatus && h.fromStatus !== h.toStatus) {
            type = h.toStatus === '已完成' ? 'complete' : 'status';
            summary = `狀態：${h.fromStatus} → ${h.toStatus}`;
          } else {
            const changes = Array.isArray(h.changed) ? h.changed : [];
            if (changes.length) {
              const fields = changes.map(c => _fieldLabel(c.field)).filter(Boolean);
              summary = `更新：${fields.slice(0, 3).join('、')}`;
              if (fields.length > 3) summary += `…等 ${fields.length} 項`;
            } else {
              summary = h.note || '更新維修單';
            }
          }
        }

        events.push({
          type,
          timestamp: h.timestamp || h.createdAt || '',
          summary,
          by: h.byName || '',
          detail: h.note || '',
          source: 'history'
        });
      }
    } catch (_) {}

    // 2. Work Logs
    try {
      const wls = getSvc('WorkLogService');
      if (wls && typeof wls.getByRepairId === 'function') {
        const logs = wls.getByRepairId(repairId) || [];
        for (const log of logs) {
          if (!log || log.isDeleted) continue;
          const resultMap = { completed: '完成', pending: '待處理', need_parts: '需零件' };
          const result = resultMap[log.result] || log.result || '';
          events.push({
            type: 'worklog',
            timestamp: log.createdAt || log.workDate || '',
            summary: `到場維修：${clip(log.action || '', 50)}`,
            by: '',
            detail: [
              log.findings ? `發現：${clip(log.findings, 60)}` : '',
              result ? `結果：${result}` : '',
              log.partsUsed ? `使用零件：${clip(log.partsUsed, 40)}` : ''
            ].filter(Boolean).join(' / '),
            source: 'worklog',
            date: log.workDate || ''
          });
        }
      }
    } catch (_) {}

    // 3. Quotes
    try {
      const qs = getSvc('QuoteService');
      if (qs && typeof qs.getAll === 'function') {
        const quotes = qs.getAll().filter(q => q && q.repairId === repairId);
        for (const q of quotes) {
          events.push({
            type: 'quote_create',
            timestamp: q.createdAt || '',
            summary: `報價 ${q.quoteNo || q.id} 建立`,
            by: q.createdByName || q.ownerName || '',
            detail: q.status ? `狀態：${q.status}` : '',
            source: 'quote',
            linkId: q.id
          });
          // If approved
          if (q.approvedAt) {
            events.push({
              type: 'quote_status',
              timestamp: q.approvedAt,
              summary: `報價 ${q.quoteNo || q.id} 已核准`,
              by: q.approvedByName || '',
              detail: '',
              source: 'quote',
              linkId: q.id
            });
          }
        }
      }
    } catch (_) {}

    // 4. Orders
    try {
      const os = getSvc('OrderService');
      if (os && typeof os.getAll === 'function') {
        const orders = os.getAll().filter(o => o && o.repairId === repairId);
        for (const o of orders) {
          events.push({
            type: 'order_create',
            timestamp: o.createdAt || '',
            summary: `訂單 ${o.orderNo || o.id} 建立`,
            by: o.createdByName || o.ownerName || '',
            detail: o.status ? `狀態：${o.status}` : '',
            source: 'order',
            linkId: o.id
          });
          // If arrived
          if (o.status === '已到貨' && o.arrivedAt) {
            events.push({
              type: 'order_status',
              timestamp: o.arrivedAt,
              summary: `訂單 ${o.orderNo || o.id} 已到貨`,
              by: '',
              detail: '',
              source: 'order',
              linkId: o.id
            });
          }
        }
      }
    } catch (_) {}

    // 5. Repair Parts status changes
    try {
      const rps = getSvc('RepairPartsService');
      if (rps) {
        const parts = (typeof rps.listForRepair === 'function')
          ? rps.listForRepair(repairId)
          : (typeof rps.getForRepair === 'function' ? rps.getForRepair(repairId) : []);
        for (const p of (parts || [])) {
          if (!p || p.isDeleted) continue;
          const name = (p.partName || p.name || '').toString().trim();
          if (p.arrivedDate) {
            events.push({
              type: 'part_status',
              timestamp: p.arrivedDate,
              summary: `零件「${clip(name, 20)}」已到貨`,
              by: '',
              detail: '',
              source: 'parts'
            });
          }
          if (p.replacedDate) {
            events.push({
              type: 'part_status',
              timestamp: p.replacedDate,
              summary: `零件「${clip(name, 20)}」已更換`,
              by: '',
              detail: '',
              source: 'parts'
            });
          }
        }
      }
    } catch (_) {}

    // Sort: newest first
    events.sort((a, b) => tsVal(b.timestamp) - tsVal(a.timestamp));
    return events;
  }

  // ─── Field Label Map ───
  const _FIELD_LABELS = {
    customer: '客戶', contact: '聯絡人', phone: '電話', email: 'Email',
    machine: '設備', serialNumber: '序號', issue: '問題描述', content: '處理內容',
    status: '狀態', progress: '進度', priority: '優先級',
    needParts: '需零件', partsOrdered: '已下單', partsArrived: '已到貨', partsReplaced: '已更換',
    'billing.chargeable': '是否收費',
    'billing.orderStatus': '客戶是否下單',
    'billing.notOrdered.reasonCode': '未下單原因',
    'billing.notOrdered.note': '未下單備註',
    notes: '備註', tags: '標籤'
  };

  function _fieldLabel(field) {
    return _FIELD_LABELS[field] || field || '';
  }

  // ─── Render ───
  function render(events, options = {}) {
    const max = options.max || 50;
    const list = (events || []).slice(0, max);

    if (!list.length) {
      return '<div class="tl-empty">尚無活動紀錄</div>';
    }

    const items = list.map(ev => {
      const icon = ICONS[ev.type] || ICONS.generic;
      const color = COLORS[ev.type] || COLORS.generic;
      const time = fmtDateShort(ev.timestamp);
      const by = ev.by ? `<span class="tl-by">${esc(ev.by)}</span>` : '';
      const detail = ev.detail ? `<div class="tl-detail">${esc(ev.detail)}</div>` : '';
      const dateLabel = ev.date ? `<span class="tl-date-tag">${esc(ev.date)}</span>` : '';

      return `
        <div class="tl-item" data-type="${esc(ev.type)}">
          <div class="tl-dot" style="background:${color}"></div>
          <div class="tl-content">
            <div class="tl-head">
              <span class="tl-icon">${icon}</span>
              <span class="tl-summary">${esc(ev.summary)}</span>
              ${dateLabel}
            </div>
            <div class="tl-meta">
              <span class="tl-time">${esc(time)}</span>
              ${by}
            </div>
            ${detail}
          </div>
        </div>
      `;
    }).join('');

    const moreNote = events.length > max
      ? `<div class="tl-more">顯示前 ${max} 筆，共 ${events.length} 筆</div>`
      : '';

    return `<div class="tl-timeline">${items}${moreNote}</div>`;
  }

  // ─── Render into container ───
  function renderInto(containerId, repairId, options) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const events = buildForRepair(repairId);
    el.innerHTML = render(events, options);
  }

  window.ActivityTimeline = { buildForRepair, render, renderInto };
  try { console.log('✅ ActivityTimeline loaded'); } catch (_) {}
})();
