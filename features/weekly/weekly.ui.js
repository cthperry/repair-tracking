/**
 * 週報系統 - UI 層
 * V161 - Weekly Module - UI Layer
 */

class WeeklyUI {
  constructor() {
    this.containerId = 'weekly-container';
    this.view = 'edit'; // edit | preview
  }

  render(containerId = 'weekly-container') {
    this.containerId = containerId;
    const container = document.getElementById(containerId);
    if (!container) return;

    const start = window.WeeklyService.weekStart;
    const end = window.WeeklyService.weekEnd;
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
            <button class="btn ghost" onclick="WeeklyUI.togglePreview()" id="btn-weekly-preview">${isPreview ? '← 返回編輯' : '👁 預覽'}</button>
            <button class="btn primary" onclick="WeeklyUI.send()">📧 寄送週報</button>
          </div>
        </div>

        <div id="weekly-edit-view" style="${isPreview ? 'display:none;' : ''}">
          <div class="weekly-grid">
            <div class="weekly-card card">
              <div class="weekly-card-header card-head">
                <div>
                  <div class="weekly-card-title card-title">本週工作（只讀）</div>
                  <div class="weekly-card-meta">來源：本週內更新的維修單（負責人：登入者 UID）</div>
                </div>
                <button class="btn" onclick="WeeklyUI.toggleThisWeek()" id="btn-toggle-thisweek">展開</button>
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
                <button class="btn" onclick="WeeklyUI.addPlan()">＋ 新增</button>
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
                <button class="btn" onclick="WeeklyUI.refreshPreview()">重新產生</button>
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

    this.refresh();
    if (isPreview) {
      // 預覽模式立即產生一次預覽內容
      this.refreshPreview();
    }
  }

  refresh() {
    const textEl = document.getElementById('thisweek-text');
    if (textEl) {
      textEl.textContent = window.WeeklyService.getThisWeekRepairsText() || '(本週無維修單更新)';
    }

    this.renderPlans();
  }

  renderPlans() {
    const host = document.getElementById('nextplans-body');
    if (!host) return;

    const plans = window.WeeklyService.nextPlans || [];

    host.innerHTML = plans
      .map((p, idx) => {
        const safe = (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `
        <div class="plan-item" data-id="${safe(p.id)}">
          <div class="plan-item-row">
            <div class="plan-idx">${idx + 1}</div>
            <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
              <div class="plan-fields">
                <input class="input" placeholder="客戶" value="${safe(p.customer)}" oninput="WeeklyUI.updatePlan('${safe(p.id)}','customer',this.value)" />
                <input class="input" placeholder="專案/機型" value="${safe(p.project)}" oninput="WeeklyUI.updatePlan('${safe(p.id)}','project',this.value)" />
              </div>
              <textarea class="input" rows="3" placeholder="計畫內容" oninput="WeeklyUI.updatePlan('${safe(p.id)}','plan',this.value)">${safe(p.plan)}</textarea>
            </div>
            <div class="plan-actions">
              <button class="btn danger" onclick="WeeklyUI.deletePlan('${safe(p.id)}')">刪除</button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  async addPlan() {
    await window.WeeklyService.addPlanTop();
    this.refresh();
  }

  async deletePlan(id) {
    await window.WeeklyService.deletePlan(id);
    this.refresh();
  }

  async updatePlan(id, key, value) {
    await window.WeeklyService.updatePlan(id, { [key]: value });
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
      const { subject, body } = await window.WeeklyService.getEmail();
      subjectEl.textContent = subject || '';
      bodyEl.textContent = body || '';
    } catch (e) {
      subjectEl.textContent = '（產生失敗）';
      bodyEl.textContent = `（產生失敗）\n${e?.message || e}`;
    }
  }

  async send() {
    const { to, subject, body } = await window.WeeklyService.getEmail();
    const href = WeeklyModel.encodeMailto(to, subject, body);
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
  refreshPreview: () => window.weeklyUI && window.weeklyUI.refreshPreview()
});

console.log('✅ WeeklyUI loaded');
