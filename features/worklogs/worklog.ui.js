/**
 * 工作記錄 - UI 層
 * WorkLog Module - UI Layer
 *
 * 職責：
 * 1. 渲染工作記錄列表（嵌入維修詳情頁 Main tab）
 * 2. 新增 / 編輯表單（modal 內 inline 表單）
 * 3. Mini summary（repair card / detail 頂部）
 * 4. 刪除確認
 */


// Phase 1：registry-first 取得 Service（避免直接 window.XxxService）
// 注意：本專案為非 module script（同一 global scope），避免宣告可重複載入時會衝突的 top-level const。
class WorkLogUI {

  // ========================================
  // HTML 安全
  // ========================================

  static escapeHtml(input) {
    const s = (input === null || input === undefined) ? '' : String(input);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ========================================
  // 維修詳情頁：工作記錄區塊
  // ========================================

  /**
   * 渲染完整工作記錄區塊（嵌入 repair detail main tab）
   */
  static renderSection(repairId) {
    if (!repairId) return '<div class="muted">缺少維修單 ID</div>';

    const logs = window._svc('WorkLogService')
      ? window._svc('WorkLogService').getForRepair(repairId)
      : [];

    const count = logs.length;
    const countBadge = count > 0 ? ` <span class="badge badge-info">${count}</span>` : '';

    let listHtml = '';
    if (count === 0) {
      listHtml = '<div class="muted" style="padding:12px 0;">尚無工作記錄，點擊下方按鈕新增。</div>';
    } else {
      listHtml = logs.map(log => this.renderLogCard(log)).join('');
    }

    return `
      <section class="detail-block worklog-section" id="repair-worklog-section" data-repair-id="${this.escapeHtml(repairId)}">
        <div class="detail-title">📝 工作記錄${countBadge}</div>
        <div class="detail-body">
          <div id="worklog-list" data-repair-id="${this.escapeHtml(repairId)}">
            ${listHtml}
          </div>
          <div id="worklog-form-container" style="display:none;"></div>
          <div class="worklog-actions" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn primary" type="button" data-action="worklog-add" data-repair-id="${this.escapeHtml(repairId)}">
              ＋ 新增工作記錄
            </button>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * 渲染單筆工作記錄卡片
   */
  static renderLogCard(log) {
    const d = WorkLogModel.toDisplay(log);
    const esc = this.escapeHtml;

    const actionText = esc(log.action || '').replace(/\n/g, '<br>');
    const findingsText = log.findings
      ? `<div class="worklog-findings">${esc(log.findings).replace(/\n/g, '<br>')}</div>`
      : '';
    const partsText = log.partsUsed
      ? `<div class="worklog-parts"><span class="worklog-label">使用零件：</span>${esc(log.partsUsed)}</div>`
      : '';

    return `
      <div class="worklog-card" data-log-id="${esc(log.id)}">
        <div class="worklog-card-header">
          <div class="worklog-card-date">
            <strong>${esc(d.workDateFormatted)}</strong>
          </div>
          <div class="worklog-card-status">
            <span class="badge custom" style="--badge-color:${d.resultColor};">${esc(d.resultLabel)}</span>
          </div>
        </div>
        <div class="worklog-card-body">
          <div class="worklog-action">${actionText}</div>
          ${findingsText}
          ${partsText}
        </div>
        <div class="worklog-card-footer">
          <button class="btn small" type="button" data-action="worklog-edit" data-log-id="${esc(log.id)}">✏️ 編輯</button>
          <button class="btn small danger" type="button" data-action="worklog-delete" data-log-id="${esc(log.id)}">🗑️ 刪除</button>
        </div>
      </div>
    `;
  }

  // ========================================
  // Mini Summary（維修卡片用）
  // ========================================

  /**
   * 取得簡短摘要 HTML（嵌入 repair card footer 或 detail 頂部）
   */
  static renderMiniSummary(repairId) {
    if (!window._svc('WorkLogService')) return '';
    const summary = window._svc('WorkLogService').getSummaryForRepair(repairId);
    if (summary.count === 0) return '';

    return `<span class="chip worklog-chip" title="${this.escapeHtml(summary.text)}">📝 ${summary.count}</span>`;
  }

  // ========================================
  // 表單：新增 / 編輯
  // ========================================

  /**
   * 顯示新增表單
   */
  static showAddForm(repairId) {
    const container = document.getElementById('worklog-form-container');
    if (!container) return;

    const today = WorkLogModel.getTaiwanDateString(new Date());

    container.innerHTML = this.renderForm({
      mode: 'add',
      repairId,
      workDate: today,
      action: '',
      findings: '',
      partsUsed: '',
      result: 'pending'
    });
    container.style.display = '';

    // 聚焦到 action 欄位
    setTimeout(() => {
      const el = document.getElementById('worklog-field-action');
      if (el) el.focus();
    }, 100);
  }

  /**
   * 顯示編輯表單
   */
  static showEditForm(logId) {
    if (!window._svc('WorkLogService')) return;
    const logs = window._svc('WorkLogService').getAll();
    const log = logs.find(l => l.id === logId);
    if (!log) {
      if (window.UI?.toast) window.UI.toast('找不到工作記錄', { type: 'warning' });
      return;
    }

    const container = document.getElementById('worklog-form-container');
    if (!container) return;

    container.innerHTML = this.renderForm({
      mode: 'edit',
      logId: log.id,
      repairId: log.repairId,
      workDate: log.workDate || '',
      action: log.action || '',
      findings: log.findings || '',
      partsUsed: log.partsUsed || '',
      result: log.result || 'pending'
    });
    container.style.display = '';

    setTimeout(() => {
      const el = document.getElementById('worklog-field-action');
      if (el) el.focus();
    }, 100);
  }

  /**
   * 渲染表單 HTML
   */
  static renderForm(opts) {
    const esc = this.escapeHtml;
    const isEdit = (opts.mode === 'edit');
    const title = isEdit ? '編輯工作記錄' : '新增工作記錄';

    const resultOptions = WorkLogModel.RESULTS.map(r => {
      const selected = (opts.result === r.value) ? 'selected' : '';
      return `<option value="${r.value}" ${selected}>${r.label}</option>`;
    }).join('');

    return `
      <div class="worklog-form" id="worklog-form">
        <h4 class="worklog-form-title">${title}</h4>
        <div class="worklog-form-grid">
          <div class="worklog-form-row">
            <label for="worklog-field-workDate">工作日期 <span class="required">*</span></label>
            <input type="date" id="worklog-field-workDate" value="${esc(opts.workDate)}" required />
          </div>
          <div class="worklog-form-row">
            <label for="worklog-field-result">結果</label>
            <select id="worklog-field-result">${resultOptions}</select>
          </div>
          <div class="worklog-form-row full">
            <label for="worklog-field-action">工作內容 <span class="required">*</span></label>
            <textarea id="worklog-field-action" rows="3" placeholder="描述本次維修工作內容..." required>${esc(opts.action)}</textarea>
          </div>
          <div class="worklog-form-row full">
            <label for="worklog-field-findings">發現 / 備註</label>
            <textarea id="worklog-field-findings" rows="2" placeholder="檢測結果、異常發現等...">${esc(opts.findings)}</textarea>
          </div>
          <div class="worklog-form-row">
            <label for="worklog-field-partsUsed">使用零件</label>
            <input type="text" id="worklog-field-partsUsed" value="${esc(opts.partsUsed)}" placeholder="例: RF Generator Model X" />
          </div>
        </div>
        <div class="worklog-form-buttons">
          <button class="btn primary" type="button"
            data-action="worklog-submit" data-repair-id="${esc(opts.repairId)}" data-log-id="${isEdit ? esc(opts.logId) : ''}">
            ${isEdit ? '更新' : '新增'}
          </button>
          <button class="btn" type="button" data-action="worklog-cancel">取消</button>
        </div>
      </div>
    `;
  }

  /**
   * 隱藏表單
   */
  static hideForm() {
    const container = document.getElementById('worklog-form-container');
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
  }

  // ========================================
  // 表單提交
  // ========================================

  /**
   * 處理表單提交
   */
  static async handleSubmit(repairId, logId) {
    const getValue = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    const data = {
      workDate: getValue('worklog-field-workDate'),
      action: getValue('worklog-field-action'),
      findings: getValue('worklog-field-findings'),
      partsUsed: getValue('worklog-field-partsUsed'),
      result: getValue('worklog-field-result') || 'pending'
    };

    // 前端驗證
    if (!data.workDate) {
      if (window.UI?.toast) window.UI.toast('請填寫工作日期', { type: 'warning' });
      return;
    }
    if (!data.action) {
      if (window.UI?.toast) window.UI.toast('請填寫工作內容', { type: 'warning' });
      return;
    }

    try {
      const isEdit = !!logId;

      if (isEdit) {
        await window._svc('WorkLogService').update(logId, data);
        if (window.UI?.toast) window.UI.toast('工作記錄已更新', { type: 'success' });
      } else {
        await window._svc('WorkLogService').create(repairId, data);
        if (window.UI?.toast) window.UI.toast('工作記錄已新增', { type: 'success' });
      }

      // 隱藏表單，刷新列表
      this.hideForm();
      this.refreshSection(repairId);

    } catch (err) {
      console.error('WorkLogUI.handleSubmit error:', err);
      if (window.UI?.toast) window.UI.toast('儲存失敗：' + (err.message || err), { type: 'error' });
    }
  }

  // ========================================
  // 刪除
  // ========================================

  static async confirmDelete(logId) {
    const ok = confirm('確定要刪除此工作記錄？此操作無法復原。');
    if (!ok) return;

    try {
      const log = (window._svc('WorkLogService').getAll() || []).find(l => l.id === logId);
      const repairId = log ? log.repairId : '';

      await window._svc('WorkLogService').delete(logId);
      if (window.UI?.toast) window.UI.toast('工作記錄已刪除', { type: 'success' });

      if (repairId) this.refreshSection(repairId);

    } catch (err) {
      console.error('WorkLogUI.confirmDelete error:', err);
      if (window.UI?.toast) window.UI.toast('刪除失敗：' + (err.message || err), { type: 'error' });
    }
  }

  // ========================================
  // 重新渲染
  // ========================================

  /**
   * 刷新工作記錄區塊（不重載整個 detail）
   */

  // ========================================
  // 事件委派（Phase 1：移除 inline onclick）
  // ========================================

  static _bindDelegation(sectionEl) {
    if (!sectionEl || sectionEl.__worklogDelegated) return;
    sectionEl.__worklogDelegated = true;

    sectionEl.addEventListener('click', (e) => {
      const el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
      if (!el || !sectionEl.contains(el)) return;

      const action = el.dataset.action;
      if (!action) return;

      const repairId = el.dataset.repairId
        || sectionEl.dataset.repairId
        || sectionEl.querySelector('#worklog-list')?.dataset?.repairId
        || '';

      const logId = el.dataset.logId || '';

      if (action === 'worklog-add') {
        if (!repairId) return;
        return WorkLogUI.showAddForm(repairId);
      }
      if (action === 'worklog-edit') {
        if (!logId) return;
        return WorkLogUI.showEditForm(logId);
      }
      if (action === 'worklog-delete') {
        if (!logId) return;
        return WorkLogUI.confirmDelete(logId);
      }
      if (action === 'worklog-submit') {
        return WorkLogUI.handleSubmit(repairId, logId);
      }
      if (action === 'worklog-cancel') {
        return WorkLogUI.hideForm();
      }
    });
  }

  static refreshSection(repairId) {
    const host = document.getElementById('repair-worklog-section');
    if (!host) return;

    // 取得新 HTML 並替換
    const tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = this.renderSection(repairId);
    const newSection = tmpDiv.firstElementChild;

    if (newSection) {
      host.replaceWith(newSection);
      try { this._bindDelegation(newSection); } catch (_) {}
    }
  }

  /**
   * 非同步載入工作記錄區塊（從 openDetail 呼叫）
   */
  static async loadWorkLogSection(repairId) {
    // Phase 1：集中化 WorkLogService 初始化
    try {
      if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
        await window.AppRegistry.ensureReady('WorkLogService', { loadAll: false });
      } else if (window._svc('WorkLogService') && !window._svc('WorkLogService').isInitialized) {
        await window._svc('WorkLogService').init();
      }
    } catch (e) {
      console.warn('WorkLogUI: ensureReady failed:', e);
    }

    const host = document.getElementById('repair-worklog-section');
    if (!host) return;

    // 替換 loading placeholder
    const tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = this.renderSection(repairId);
    const newSection = tmpDiv.firstElementChild;
    if (newSection) {
      host.replaceWith(newSection);
      try { this._bindDelegation(newSection); } catch (_) {}
    }
  }
}

// 輸出到全域
if (typeof window !== 'undefined') {
  window.WorkLogUI = WorkLogUI;
}

console.log('✅ WorkLogUI loaded');
