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
    const latest = count > 0 ? WorkLogModel.toDisplay(logs[0]) : null;
    const countBadge = count > 0 ? ` <span class="badge badge-info">${count}</span>` : '';

    let listHtml = '';
    if (count === 0) {
      listHtml = '<div class="worklog-empty"><div class="worklog-empty-title">尚無處置紀錄</div><div class="muted">建議每次維修動作都留一筆，交接、追蹤、週報都會更完整。</div></div>';
    } else {
      listHtml = logs.map(log => this.renderLogCard(log)).join('');
    }

    return `
      <section class="detail-block worklog-section" id="repair-worklog-section" data-repair-id="${this.escapeHtml(repairId)}">
        <div class="worklog-section-head">
          <div>
            <div class="detail-title">📝 工作記錄${countBadge}</div>
            <div class="worklog-section-subtitle">用卡片方式呈現每次處置，方便現場與交接快速回看。</div>
          </div>
          <div class="worklog-head-stats">
            <div class="worklog-head-stat"><span>總筆數</span><strong>${count}</strong></div>
            <div class="worklog-head-stat"><span>最近更新</span><strong>${latest ? this.escapeHtml(latest.workDateFormatted) : '—'}</strong></div>
          </div>
        </div>
        <div class="detail-body">
          <div id="worklog-list" class="worklog-list" data-repair-id="${this.escapeHtml(repairId)}">
            ${listHtml}
          </div>
          <div id="worklog-form-container" style="display:none;"></div>
          <div class="worklog-actions">
            <button class="btn primary" type="button" data-action="worklog-add" data-repair-id="${this.escapeHtml(repairId)}">＋ 新增工作記錄</button>
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
      ? `<div class="worklog-field-card"><div class="worklog-field-label">發現 / 備註</div><div class="worklog-field-value">${esc(log.findings).replace(/\n/g, '<br>')}</div></div>`
      : '';
    const partsText = log.partsUsed
      ? `<div class="worklog-field-card subtle"><div class="worklog-field-label">使用零件</div><div class="worklog-field-value">${esc(log.partsUsed)}</div></div>`
      : '';

    return `
      <div class="worklog-card" data-log-id="${esc(log.id)}">
        <div class="worklog-card-header">
          <div class="worklog-card-date">
            <strong>${esc(d.workDateFormatted)}</strong>
            <span class="worklog-card-updated">更新 ${esc(d.updatedAtFormatted || d.createdAtFormatted || '')}</span>
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
    try {
      const form = container.querySelector('#worklog-form');
      if (form && window.FormValidate) window.FormValidate.bindForm(form);
    } catch (_) {}

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
    try {
      const form = container.querySelector('#worklog-form');
      if (form && window.FormValidate) window.FormValidate.bindForm(form);
    } catch (_) {}

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
    const resultLabel = (WorkLogModel.RESULTS.find(r => r.value === opts.result)?.label || '待處理').toString();

    return `
      <form class="worklog-form enterprise-form" id="worklog-form" data-action="worklog-submit-form" data-repair-id="${esc(opts.repairId)}" data-log-id="${isEdit ? esc(opts.logId) : ''}">
        <div class="form-section">
          <div class="form-section-head">
            <h4 class="form-section-title">${title}</h4>
            <p class="form-section-desc">工作記錄供 Repair Detail 與週報共用，欄位順序固定為日期、結果、工作內容、發現、零件。</p>
          </div>
          <div class="form-context-bar worklog-form-context">
            <div class="form-context-main">
              <span class="form-context-title">${title}</span>
              <div class="form-context-pills">
                <span class="form-context-pill is-strong">${esc(resultLabel)}</span>
                <span class="form-context-pill">維修單：${esc(opts.repairId || '未指定')}</span>
                <span class="form-context-pill">${isEdit ? '更新既有記錄' : '建立新記錄'}</span>
              </div>
            </div>
            <p class="form-context-note">工作日期、結果、工作內容與發現欄位固定同一順序，避免週報與詳情頁引用時出現語意漂移。</p>
          </div>
          <div class="form-grid worklog-form-grid">
            <div class="form-group worklog-form-row">
              <label class="form-label required" for="worklog-field-workDate">工作日期</label>
              <input class="input" type="date" id="worklog-field-workDate" name="workDate" value="${esc(opts.workDate)}" data-required-msg="請填寫工作日期" required />
            </div>
            <div class="form-group worklog-form-row">
              <label class="form-label" for="worklog-field-result">結果</label>
              <select class="input" id="worklog-field-result" name="result">${resultOptions}</select>
            </div>
            <div class="form-group worklog-form-row full">
              <label class="form-label required" for="worklog-field-action">工作內容</label>
              <textarea class="textarea" id="worklog-field-action" name="action" rows="3" placeholder="描述本次維修工作內容..." data-required-msg="請填寫工作內容" required>${esc(opts.action)}</textarea>
            </div>
            <div class="form-group worklog-form-row full">
              <label class="form-label" for="worklog-field-findings">發現 / 備註</label>
              <textarea class="textarea" id="worklog-field-findings" name="findings" rows="2" placeholder="檢測結果、異常發現等...">${esc(opts.findings)}</textarea>
            </div>
            <div class="form-group worklog-form-row">
              <label class="form-label" for="worklog-field-partsUsed">使用零件</label>
              <input class="input" type="text" id="worklog-field-partsUsed" name="partsUsed" value="${esc(opts.partsUsed)}" placeholder="例：RF Generator Model X" />
            </div>
          </div>
          <div class="worklog-form-buttons form-actions-row">
            <div class="form-actions-note">新增後會立即同步到維修詳情，不需再切換頁面。</div>
            <button class="btn" type="button" data-action="worklog-cancel">取消</button>
            <button class="btn primary" type="submit">${isEdit ? '更新' : '新增'}</button>
          </div>
        </div>
      </form>
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
  static async handleSubmit(event) {
    try { event?.preventDefault?.(); } catch (_) {}
    const form = event?.target;
    if (!form) return;

    const repairId = (form.dataset.repairId || '').toString().trim();
    const logId = (form.dataset.logId || '').toString().trim();

    try {
      if (window.FormValidate) {
        window.FormValidate.bindForm(form);
        window.FormValidate.clearCustomErrors(form);
        const ok = window.FormValidate.validateForm(form, { summaryMessage: '請補齊工作記錄必填欄位' });
        if (!ok) return;
      }
    } catch (err) {
      console.warn('WorkLogUI form validate failed:', err);
    }

    const formData = new FormData(form);
    const data = {
      workDate: (formData.get('workDate') || '').toString().trim(),
      action: (formData.get('action') || '').toString().trim(),
      findings: (formData.get('findings') || '').toString().trim(),
      partsUsed: (formData.get('partsUsed') || '').toString().trim(),
      result: (formData.get('result') || 'pending').toString().trim() || 'pending'
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    const submitBtnText = submitBtn ? submitBtn.textContent : '';
    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '儲存中...';
      }
    } catch (_) {}

    try {
      const isEdit = !!logId;
      try { window.FormValidate?.clearSummary?.(form); } catch (_) {}

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
    } finally {
      try {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtnText || '儲存';
        }
      } catch (_) {}
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
      if (action === 'worklog-cancel') {
        return WorkLogUI.hideForm();
      }
    });

    sectionEl.addEventListener('submit', (e) => {
      const form = e.target && e.target.closest ? e.target.closest('form[data-action="worklog-submit-form"]') : null;
      if (!form || !sectionEl.contains(form)) return;
      return WorkLogUI.handleSubmit(e);
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
