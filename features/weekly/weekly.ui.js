/**
 * 週報系統 - UI 層
 * V161 - Weekly Module - UI Layer
 */


// Phase 1：registry-first 取得 Service（避免直接 window.XxxService）
// 注意：本專案為非 module script（同一 global scope），避免宣告可重複載入時會衝突的 top-level const。
class WeeklyUI {
  constructor() {
    this.containerId = 'weekly-container';
    this.view = 'edit'; // edit | preview

    // delegation guards
    this._delegationBound = false;
    this._boundContainer = null;
    this._lastInputTimer = null;
    this._pendingPlanDraft = new Map();
    this._lastEmailSnapshot = null;
  }

  render(containerId = 'weekly-container') {
    this.containerId = containerId;
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this._boundContainer !== container) {
      this._delegationBound = false;
      this._boundContainer = container;
    }

    const weeklySvc = window._svc('WeeklyService');
    const planCfg = (weeklySvc && typeof weeklySvc._getWeeklyPlanDisplayConfig === 'function')
      ? weeklySvc._getWeeklyPlanDisplayConfig()
      : { customerPlaceholder: '客戶', projectPlaceholder: '專案/機型', planPlaceholder: '計畫內容' };
    const start = weeklySvc.weekStart;
    const end = weeklySvc.weekEnd;
    const nextStart = WeeklyModel.addDays(start, 7);
    const nextEnd = WeeklyModel.addDays(end, 7);
    const isPreview = this.view === 'preview';

    container.innerHTML = `
      <div class="weekly-module">
        <div class="weekly-toolbar module-toolbar">
          <div class="module-toolbar-left">
            <div class="page-title">
              <h2>週報</h2>
              <span class="muted">本週（${WeeklyModel.formatDateCN(start)} ~ ${WeeklyModel.formatDateCN(end)}）</span>
            </div>
          </div>
          <div class="module-toolbar-right">
            <button class="btn ghost" data-action="weekly-toggle-preview" id="btn-weekly-preview">${isPreview ? '← 返回編輯' : '👁 預覽'}</button>
            <button class="btn primary" data-action="weekly-send">📧 寄送週報</button>
          </div>
        </div>

        <div id="weekly-edit-view" style="${isPreview ? 'display:none;' : ''}">
          <div class="weekly-grid">
            <div class="weekly-card card">
              <div class="weekly-card-header card-head">
                <div>
                  <div class="weekly-card-title card-title">本週工作（只讀）</div>
                  <div class="weekly-card-meta" id="thisweek-meta">來源：本週新增維修單 + 本週新增工作紀錄（不含僅狀態變更）</div>
                </div>
                <button class="btn" data-action="weekly-toggle-thisweek" id="btn-toggle-thisweek">展開</button>
              </div>
              <div class="weekly-card-body card-body" id="thisweek-body" style="display:none;">
                <pre class="weekly-pre" id="thisweek-text"></pre>
              </div>
            </div>

            <div class="weekly-card card">
              <div class="weekly-card-header card-head">
                <div>
                  <div class="weekly-card-title card-title">下週計畫</div>
                  <div class="weekly-card-meta">（${WeeklyModel.formatDateCN(nextStart)} ~ ${WeeklyModel.formatDateCN(nextEnd)}）</div>
                </div>
                <button class="btn" data-action="weekly-add-plan">＋ 新增</button>
              </div>
              <div class="weekly-card-body card-body" id="nextplans-body"></div>
            </div>
          </div>
        </div>

        <div id="weekly-preview-view" style="${isPreview ? '' : 'display:none;'}">
          <div class="weekly-preview-card card">
            <div class="weekly-preview-header card-head">
              <div>
                <div class="weekly-preview-title">週報預覽</div>
                <div class="weekly-preview-meta">以下內容將以 mailto 寄送（不含收件人）。</div>
              </div>
              <div class="weekly-preview-actions">
                <button class="btn" data-action="weekly-refresh-preview">重新產生</button>
              </div>
            </div>

            <div class="weekly-preview-block">
              <div class="weekly-preview-label">主旨</div>
              <div class="weekly-preview-subject" id="weekly-preview-subject">（載入中...）</div>
            </div>

            <div class="weekly-preview-block">
              <div class="weekly-preview-label">內容</div>
              <pre class="weekly-preview-pre" id="weekly-preview-body">（載入中...）</pre>
            </div>
          </div>
        </div>
      </div>
    `;


    this._bindDelegation(container);
    this.refresh();
    if (isPreview) {
      // 預覽模式立即產生一次預覽內容
      this.refreshPreview();
    }
  }

  _bindDelegation(container) {
    // WeeklyUI 每次 render 會重寫 innerHTML，因此事件必須掛在 container（事件委派）
    if (this._delegationBound) return;
    if (!container) return;
    this._delegationBound = true;

    const getActionEl = (evt) => {
      const t = evt?.target;
      if (!t || typeof t.closest !== 'function') return null;
      return t.closest('[data-action]');
    };

    // click actions
    container.addEventListener('click', async (evt) => {
      const el = getActionEl(evt);
      if (!el) return;
      const action = el.getAttribute('data-action');
      if (!action) return;

      try {
        switch (action) {
          case 'weekly-toggle-preview': {
            await this._flushPendingPlanUpdates();
            this.view = (this.view === 'preview') ? 'edit' : 'preview';
            this.render(this.containerId);
            break;
          }
          case 'weekly-refresh-preview': {
            await this._flushPendingPlanUpdates();
            await this.refreshPreview();
            break;
          }
          case 'weekly-send': {
            await this._flushPendingPlanUpdates();
            const svc = window._svc('WeeklyService');
            if (!svc || typeof svc.buildWeeklyEmailPayload !== 'function') throw new Error('WeeklyService not ready');
            const email = await svc.buildWeeklyEmailPayload();
            this._lastEmailSnapshot = email;
            window.location.href = WeeklyModel.encodeMailto(email.to, email.subject, email.body);
            break;
          }
          case 'weekly-toggle-thisweek': {
            const body = document.getElementById('thisweek-body');
            const btn = document.getElementById('btn-toggle-thisweek');
            if (body) {
              const isOpen = body.style.display !== 'none';
              body.style.display = isOpen ? 'none' : '';
              if (btn) btn.textContent = isOpen ? '展開' : '收合';
            }
            break;
          }
          case 'weekly-add-plan': {
            await this._flushPendingPlanUpdates();
            const svc = window._svc('WeeklyService');
            if (!svc || typeof svc.addPlanTop !== 'function') throw new Error('WeeklyService not ready');
            await svc.addPlanTop();
            this.renderPlans();
            if (this.view === 'preview') await this.refreshPreview();
            break;
          }
          case 'weekly-plan-delete': {
            const id = el.getAttribute('data-plan-id');
            this._pendingPlanDraft.delete(String(id || ''));
            const svc = window._svc('WeeklyService');
            if (!svc || typeof svc.deletePlan !== 'function') throw new Error('WeeklyService not ready');
            await svc.deletePlan(id);
            this.renderPlans();
            if (this.view === 'preview') await this.refreshPreview();
            break;
          }
          default:
            // ignore
            break;
        }
      } catch (e) {
        console.error('WeeklyUI action failed:', action, e);
        // 盡量不要 throw 讓 router crash
      }
    });
    // input/textarea: plan update（用輕量 debounce，避免每字 persist）
    const onPlanInput = (evt) => {
      const t = evt?.target;
      if (!t || typeof t.getAttribute !== 'function') return;
      const action = t.getAttribute('data-action');
      if (action !== 'weekly-plan-update') return;
      const id = String(t.getAttribute('data-plan-id') || '');
      const key = String(t.getAttribute('data-key') || '');
      const value = t.value;
      if (!id || !key) return;

      this._queuePlanPatch(id, key, value);

      if (this._lastInputTimer) clearTimeout(this._lastInputTimer);
      this._lastInputTimer = setTimeout(async () => {
        try {
          await this._flushPendingPlanUpdates();
          if (this.view === 'preview') await this.refreshPreview();
        } catch (e) {
          console.error('WeeklyUI plan update failed:', e);
        }
      }, 250);
    };
    container.addEventListener('input', onPlanInput);
  }

  refresh() {
    const textEl = document.getElementById('thisweek-text');
    if (textEl) {
      textEl.textContent = window._svc('WeeklyService').getThisWeekRepairsText() || '(目前無維修案件)';
    }

    this.renderPlans();
  }


  _queuePlanPatch(id, key, value) {
    const safeId = String(id || '').trim();
    const safeKey = String(key || '').trim();
    if (!safeId || !safeKey) return;

    const patch = this._pendingPlanDraft.get(safeId) || {};
    patch[safeKey] = value;
    this._pendingPlanDraft.set(safeId, patch);

    const svc = window._svc('WeeklyService');
    const list = Array.isArray(svc?.nextPlans) ? svc.nextPlans : [];
    const target = list.find(item => String(item?.id || '') === safeId);
    if (!target) return;
    target[safeKey] = String(value || '');
    target.updatedAt = new Date().toISOString();
  }

  async _flushPendingPlanUpdates() {
    if (this._lastInputTimer) {
      clearTimeout(this._lastInputTimer);
      this._lastInputTimer = null;
    }
    if (!this._pendingPlanDraft.size) return;

    const svc = window._svc('WeeklyService');
    if (!svc || typeof svc.updatePlan !== 'function') {
      this._pendingPlanDraft.clear();
      return;
    }

    const entries = Array.from(this._pendingPlanDraft.entries());
    this._pendingPlanDraft.clear();
    for (const [id, patch] of entries) {
      await svc.updatePlan(id, patch);
    }
  }
  renderPlans() {
    const host = document.getElementById('nextplans-body');
    if (!host) return;

    const weeklySvc = window._svc('WeeklyService');
    const plans = weeklySvc?.nextPlans || [];
    const planCfg = (weeklySvc && typeof weeklySvc._getWeeklyPlanDisplayConfig === 'function')
      ? weeklySvc._getWeeklyPlanDisplayConfig()
      : { customerPlaceholder: '客戶', projectPlaceholder: '專案/機型', planPlaceholder: '計畫內容' };
    const escapeHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    host.innerHTML = plans
      .map((p, idx) => {
        const safeId = escapeHtml(p.id);
        return `
        <div class="plan-item" data-id="${safeId}">
          <div class="plan-item-row">
            <div class="plan-idx">${idx + 1}</div>
            <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
              <div class="plan-fields">
                <input class="input" placeholder="${escapeHtml(planCfg.customerPlaceholder)}" value="${escapeHtml(p.customer)}" data-action="weekly-plan-update" data-plan-id="${safeId}" data-key="customer" />
                <input class="input" placeholder="${escapeHtml(planCfg.projectPlaceholder)}" value="${escapeHtml(p.project)}" data-action="weekly-plan-update" data-plan-id="${safeId}" data-key="project" />
              </div>
              <textarea class="input" rows="3" placeholder="${escapeHtml(planCfg.planPlaceholder)}" data-action="weekly-plan-update" data-plan-id="${safeId}" data-key="plan">${escapeHtml(p.plan)}</textarea>
            </div>
            <div class="plan-actions">
              <button class="btn danger" data-action="weekly-plan-delete" data-plan-id="${safeId}">刪除</button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  async addPlan() {
    await window._svc('WeeklyService').addPlanTop();
    this.refresh();
  }

  async deletePlan(id) {
    await window._svc('WeeklyService').deletePlan(id);
    this.refresh();
  }

  async updatePlan(id, key, value) {
    await window._svc('WeeklyService').updatePlan(id, { [key]: value });
  }

  toggleThisWeek() {
    const body = document.getElementById('thisweek-body');
    const btn = document.getElementById('btn-toggle-thisweek');
    if (!body || !btn) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    btn.textContent = open ? '展開' : '收合';
  }

  togglePreview() {
    this.view = this.view === 'preview' ? 'edit' : 'preview';
    this.render(this.containerId);
  }

  async refreshPreview() {
    const subjectEl = document.getElementById('weekly-preview-subject');
    const bodyEl = document.getElementById('weekly-preview-body');
    if (!subjectEl || !bodyEl) return;

    subjectEl.textContent = '（產生中...）';
    bodyEl.textContent = '（產生中...）';

    try {
      await this._flushPendingPlanUpdates();
      const svc = window._svc('WeeklyService');
      if (!svc || typeof svc.buildWeeklyEmailPayload !== 'function') throw new Error('WeeklyService not ready');
      const snapshot = await svc.buildWeeklyEmailPayload();
      this._lastEmailSnapshot = snapshot;
      subjectEl.textContent = snapshot.subject || '';
      bodyEl.textContent = snapshot.body || '';
    } catch (e) {
      this._lastEmailSnapshot = null;
      subjectEl.textContent = '（產生失敗）';
      bodyEl.textContent = `（產生失敗）\n${e?.message || e}`;
    }
  }

  async send() {
    await this._flushPendingPlanUpdates();
    const svc = window._svc('WeeklyService');
    if (!svc || typeof svc.buildWeeklyEmailPayload !== 'function') throw new Error('WeeklyService not ready');
    const snapshot = await svc.buildWeeklyEmailPayload();
    this._lastEmailSnapshot = snapshot;
    const href = WeeklyModel.encodeMailto(snapshot.to, snapshot.subject, snapshot.body);
    window.location.href = href;
  }
}

const weeklyUI = new WeeklyUI();
window.weeklyUI = weeklyUI;

Object.assign(WeeklyUI, {
  send: () => window.weeklyUI && window.weeklyUI.send(),
  addPlan: () => window.weeklyUI && window.weeklyUI.addPlan(),
  deletePlan: (id) => window.weeklyUI && window.weeklyUI.deletePlan(id),
  updatePlan: (id, key, value) => window.weeklyUI && window.weeklyUI.updatePlan(id, key, value),
  toggleThisWeek: () => window.weeklyUI && window.weeklyUI.toggleThisWeek(),
  togglePreview: () => window.weeklyUI && window.weeklyUI.togglePreview(),
  refreshPreview: () => window.weeklyUI && window.weeklyUI.refreshPreview(),
  setThisWeekBasis: (v) => window.weeklyUI && window.weeklyUI.setThisWeekBasis(v)
});

console.log('✅ WeeklyUI loaded');
