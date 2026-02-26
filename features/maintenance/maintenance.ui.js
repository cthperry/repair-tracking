/**
 * 機台保養管理（Maintenance）- UI
 * MNT-3
 *
 * Tabs：儀表板 / 設備 / 保養紀錄 / 報表
 */

(function(){
  'use strict';

  const esc = (s) => {
    const str = (s === null || s === undefined) ? '' : String(s);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const toStr = (v) => (v === null || v === undefined) ? '' : String(v);

  function toast(msg, tone){
    try { window.UI?.toast?.(msg, tone || 'info'); } catch (_) {
      try { alert(msg); } catch (_) {}
    }
  }

  function downloadText(filename, content, mime){
    try {
      const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 500);
    } catch (e) {
      console.error(e);
      toast('下載失敗', 'error');
    }
  }

  function cycleLabel(every, unit){
    const e = parseInt(every,10) || 30;
    const u = toStr(unit).trim().toLowerCase();
    if (u === 'week') return `每 ${e} 週`;
    if (u === 'month') return `每 ${e} 月`;
    return `每 ${e} 天`;
  }

  function dueBadge(due){
    const d = due || {};
    const s = toStr(d.status).trim();
    const r1 = Number.isFinite(d.remind1) ? d.remind1 : 3;
    const r2 = Number.isFinite(d.remind2) ? d.remind2 : 7;
    const noRec = (d.hasRecord === false) && (!!toStr(d.baseYMD).trim() || !!toStr(d.installDate).trim());
    const suffix = noRec ? '（尚無保養紀錄）' : '';

    if (s === 'overdue') return `<span class="badge badge-error">逾期${suffix}</span>`;
    if (s === 'dueSoon1') return `<span class="badge badge-warning">${r1} 天內到期${suffix}</span>`;
    if (s === 'dueSoon2') return `<span class="badge badge-info">${r2} 天內到期${suffix}</span>`;
    if (s === 'noRecord') return '<span class="badge">尚無紀錄</span>';
    return '<span class="badge badge-success">正常</span>';
  }

  class MaintenanceUI {
    constructor(){
      this.tab = 'dashboard';
      this.searchEquip = '';
      this.searchEquipDraft = '';
      this.searchRecord = '';
      this.searchRecordDraft = '';
      this.filterEquipmentId = '';
      this.filterEquipmentIdDraft = '';
      this.filterFrom = '';
      this.filterFromDraft = '';
      this.filterTo = '';
      this.filterToDraft = '';

      this._bound = false;
      this._pendingAction = null;
    }

    _svc(){
      try {
        if (typeof window._svc === 'function') return window._svc('MaintenanceService');
        if (window.AppRegistry && typeof window.AppRegistry.get === 'function') return window.AppRegistry.get('MaintenanceService');
      } catch (_) {}
      return null;
    }


    _consumeDeepLink(){
      try {
        const dl = window.__maintenanceDeepLink;
        if (!dl) return;

        const tab = toStr(dl.tab).trim();
        if (tab) this.tab = tab;
        if (dl.searchEquip !== undefined) this.searchEquip = toStr(dl.searchEquip);
        if (dl.searchRecord !== undefined) this.searchRecord = toStr(dl.searchRecord);
        if (dl.filterEquipmentId !== undefined) this.filterEquipmentId = toStr(dl.filterEquipmentId);
        if (dl.filterFrom !== undefined) this.filterFrom = toStr(dl.filterFrom);
        if (dl.filterTo !== undefined) this.filterTo = toStr(dl.filterTo);
        // 同步草稿（方案2）
        this.searchEquipDraft = this.searchEquip;
        this.searchRecordDraft = this.searchRecord;
        this.filterEquipmentIdDraft = this.filterEquipmentId;
        this.filterFromDraft = this.filterFrom;
        this.filterToDraft = this.filterTo;
        if (dl.action) this._pendingAction = dl.action;
      } catch (e) {
        console.warn('maintenance deepLink parse failed:', e);
      }
      try { delete window.__maintenanceDeepLink; } catch (_) { window.__maintenanceDeepLink = null; }
    }

    _runPendingAction(){
      const act = this._pendingAction;
      if (!act) return;
      this._pendingAction = null;

      setTimeout(() => {
        try {
          const type = toStr(act.type).trim();
          if (type === 'createRecord') {
            const id = toStr(act.equipmentId).trim();
            if (id) {
              this.tab = 'records';
              this._renderTabs();
              this._renderBody();
              this.openCreateRecordFor(id);
            }
            return;
          }
          if (type === 'editRecord' || type === 'viewRecord') {
            const rid = toStr(act.recordId).trim();
            if (rid) {
              this.tab = 'records';
              this._renderTabs();
              this._renderBody();
              if (type === 'editRecord') this.openEditRecord(rid);
              else this.openViewRecord(rid);
            }
            return;
          }
          if (type === 'editEquipment') {
            const id = toStr(act.equipmentId).trim();
            if (id) {
              this.tab = 'equipments';
              this._renderTabs();
              this._renderBody();
              this.openEditEquipment(id);
            }
            return;
          }
          if (type === 'createEquipment') {
            const pf = (act.prefill && typeof act.prefill === 'object') ? act.prefill : {};
            this.tab = 'equipments';
            this._renderTabs();
            this._renderBody();
            this.openCreateEquipment(pf);
            return;
          }
        } catch (e) {
          console.warn('maintenance pending action failed:', e);
        }
      }, 0);
    }

    async render(containerId='main-content'){
      const svc = this._svc();
      try { await svc?.init?.(); } catch (_) {}

      const root = document.getElementById(containerId);
      if (!root) return;

      this._consumeDeepLink();

      root.innerHTML = `
        <div class="module" id="maint-module" style="padding:16px;">
          <div class="module-toolbar">
            <div class="module-toolbar-left" style="min-width:0">
              <div style="font-weight:900;white-space:nowrap;">🛠️ 機台保養管理</div>
              <div class="badge" style="margin-left:8px;">MNT-4</div>
              <div class="muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">設備週期／保養紀錄／提醒／報表</div>
            </div>
            <div class="module-toolbar-right">
              <button class="btn" onclick="MaintenanceUI.openQuickCreate()">＋ 快速新增紀錄</button>
              <button class="btn primary" onclick="MaintenanceUI.openCreateEquipment()">＋ 新增設備</button>
            </div>
          </div>

          <div class="panel" style="padding:14px 16px;">
            <div class="chip-row" id="maint-tabs"></div>
          </div>

          <div id="maint-body"></div>

          <div id="maint-modal" class="modal" style="display:none;">
            <div class="modal-backdrop" onclick="MaintenanceUI.closeModal()"></div>
            <div class="modal-content modal-large" id="maint-modal-content"></div>
          </div>
        </div>
      `;

      this._renderTabs();
      this._renderBody();
      this._runPendingAction();

      try {
        if (!this._bound) {
          this._bound = true;
          window.addEventListener('data:changed', (ev) => {
            if (ev?.detail?.module === 'maintenance') {
              this._renderBody();
            }
          });
        }
      } catch (_) {}
    }

    _renderTabs(){
      const el = document.getElementById('maint-tabs');
      if (!el) return;
      const tabs = [
        { key:'dashboard', label:'儀表板' },
        { key:'equipments', label:'設備' },
        { key:'records', label:'保養紀錄' },
        { key:'reports', label:'報表' },
      ];
      el.innerHTML = tabs.map(t => {
        const a = (this.tab === t.key) ? 'active' : '';
        return `<button class="chip ${a}" onclick="MaintenanceUI.setTab('${t.key}')">${t.label}</button>`;
      }).join('');
    }

    setTab(t){
      const key = toStr(t).trim() || 'dashboard';
      if (this.tab === key) return;
      this.tab = key;
      this._renderTabs();
      this._renderBody();
      this._runPendingAction();
    }

    _renderBody(){
      const el = document.getElementById('maint-body');
      if (!el) return;

      if (this.tab === 'equipments') el.innerHTML = this._renderEquipments();
      else if (this.tab === 'records') el.innerHTML = this._renderRecords();
      else if (this.tab === 'reports') el.innerHTML = this._renderReports();
      else el.innerHTML = this._renderDashboard();
    }

    // =========================
    // Dashboard
    // =========================
    _renderDashboard(){
      const svc = this._svc();
      const stats = svc?.getStats ? svc.getStats() : { total:0, overdue:0, dueSoon:0, noRecord:0, ok:0, compliance:0 };

      // MNT-4.1：依使用者要求，移除「提醒清單」區塊（包含列表與 mailto 按鈕）。
      // 提醒收件人/預設提醒天數/自動 Email（Cloud Functions）改由「設定 → 機台保養設定」統一管理。

      return `
        <div class="card-list" style="grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));">
          <div class="card" style="padding:14px 16px;">
            <div class="muted">設備總數</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;">${stats.total}</div>
          </div>
          <div class="card" style="padding:14px 16px;">
            <div class="muted">逾期</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;">${stats.overdue}</div>
          </div>
          <div class="card" style="padding:14px 16px;">
            <div class="muted">即將到期（提醒區間）</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;">${stats.dueSoon}</div>
          </div>
          <div class="card" style="padding:14px 16px;">
            <div class="muted">尚無紀錄</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;">${stats.noRecord}</div>
          </div>
          <div class="card" style="padding:14px 16px;">
            <div class="muted">保養率（粗估）</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;">${stats.compliance}%</div>
          </div>
        </div>

        <div class="panel" style="margin-top:12px;padding:14px 16px;">
          <div class="panel-row">
            <div class="panel-left">
              <div style="font-weight:900;">提醒設定</div>
              <div class="muted">保養提醒收件人、預設提醒天數、自動寄信（Cloud Functions）已移至「設定 → 機台保養設定」統一管理。</div>
            </div>
            <div class="panel-right" style="min-width:220px;">
              <button class="btn" type="button" onclick="MaintenanceUI.gotoSettings()">前往設定</button>
            </div>
          </div>
        </div>
      `;
    }

    async saveSettings(){
      const svc = this._svc();
      const elTo = document.getElementById('maint-email-to');
      const elCc = document.getElementById('maint-email-cc');
      const elRemind = document.getElementById('maint-default-remind');
      const elUseOwner = document.getElementById('maint-use-owner-email');
      const elAutoEnabled = document.getElementById('maint-auto-email-enabled');
      const elAutoNoRecord = document.getElementById('maint-auto-email-no-record');

      const emailTo = elTo ? toStr(elTo.value).trim() : '';
      const emailCc = elCc ? toStr(elCc.value).trim() : '';
      const useOwnerEmail = !!(elUseOwner && elUseOwner.checked);
      const autoEmailEnabled = !!(elAutoEnabled && elAutoEnabled.checked);
      const autoEmailIncludeNoRecord = !!(elAutoNoRecord && elAutoNoRecord.checked);
      const defaultRemindDays = (() => {
        const raw = elRemind ? toStr(elRemind.value).trim() : '';
        const arr = raw.split(',').map(s => parseInt(String(s).trim(), 10)).filter(n => Number.isFinite(n) && n >= 0);
        const uniq = Array.from(new Set(arr)).sort((a,b)=>a-b).slice(0, 3);
        return uniq.length ? uniq : [3, 7];
      })();

      try {
        await svc?.updateSettings?.({ emailTo, emailCc, useOwnerEmail, defaultRemindDays, autoEmailEnabled, autoEmailIncludeNoRecord });
        toast('已儲存設定', 'success');
        this._renderBody();
      } catch (e) {
        console.error(e);
        toast('儲存失敗', 'error');
      }
    }

    gotoSettings(){
      try {
        if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
          window.AppRouter.navigate('settings');
          return;
        }
        toast('路由尚未初始化，請稍後再試', 'warning');
      } catch (e) {
        console.error(e);
        toast('無法前往設定', 'error');
      }
    }

    _buildReminderEmailLines(rows){
      const lines = [];
      lines.push('維修紀錄追蹤系統 - 機台保養提醒');
      lines.push('');
      lines.push('以下為待保養設備清單：');
      lines.push('');

      for (const r of rows) {
        const eq = r.equipment || {};
        const d = r.due || {};
        const r1 = Number.isFinite(d.remind1) ? d.remind1 : 3;
        const r2 = Number.isFinite(d.remind2) ? d.remind2 : 7;
        const tag = (d.status === 'overdue')
          ? '逾期'
          : (d.status === 'dueSoon1' ? `${r1}天內到期` : (d.status === 'dueSoon2' ? `${r2}天內到期` : '尚無紀錄'));
        const base = (!d.hasRecord && d.baseYMD) ? ` | 基準:${toStr(d.baseYMD)}` : '';
        lines.push(`- [${tag}] ${toStr(eq.equipmentNo)} ${toStr(eq.name)} | 位置:${toStr(eq.location||'')} | 負責:${toStr(eq.owner||'')}${eq.ownerEmail ? `(${toStr(eq.ownerEmail)})` : ''} | 上次:${toStr(d.lastYMD||'-')} | 下次:${toStr(d.nextDue||'-')} | 週期:${cycleLabel(eq.cycleEvery, eq.cycleUnit)}${base}`);
      }
      return lines;
    }

    sendReminderEmail(){
      const svc = this._svc();
      const settings = svc?.getSettings ? svc.getSettings() : { emailTo:'' };
      const list = svc?.getDueList ? svc.getDueList() : [];

      const dueRows = list.filter(r => {
        const s = r?.due?.status;
        return s === 'overdue' || s === 'dueSoon1' || s === 'dueSoon2' || s === 'noRecord';
      }).slice(0, 120);

      if (!dueRows.length) {
        toast('目前沒有需要提醒的設備', 'info');
        return;
      }

      // 依收件人分組（若勾選「優先使用負責人 Email」）
      const groups = new Map();
      for (const r of dueRows) {
        const eq = r.equipment || {};
        let to = toStr(settings.emailTo || '').trim();
        if (settings.useOwnerEmail && toStr(eq.ownerEmail).trim()) {
          to = toStr(eq.ownerEmail).trim();
        }
        const key = to || '（未設定收件人）';
        if (!groups.has(key)) groups.set(key, { to, rows: [] });
        groups.get(key).rows.push(r);
      }

      const cc = toStr(settings.emailCc || '').trim();
      const subject = '機台保養提醒';

      const sections = Array.from(groups.values()).map(g => {
        const lines = this._buildReminderEmailLines(g.rows);
        const body = lines.join('\n');
        const href = (() => {
          const toEnc = encodeURIComponent(toStr(g.to || ''));
          const subjEnc = encodeURIComponent(subject);
          const bodyEnc = encodeURIComponent(body);
          const ccEnc = encodeURIComponent(cc);
          const q = cc ? `cc=${ccEnc}&subject=${subjEnc}&body=${bodyEnc}` : `subject=${subjEnc}&body=${bodyEnc}`;
          return `mailto:${toEnc}?${q}`;
        })();
        const toLabel = g.to ? esc(g.to) : '<span class="badge badge-warning">未設定收件人</span>';
        return `
          <div class="card" style="padding:12px 14px;">
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-weight:900;">To：${toLabel}</div>
                <div class="muted" style="margin-top:4px;">共 ${g.rows.length} 台設備</div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <a class="btn" href="${href}">開啟 Email</a>
              </div>
            </div>
            <div style="margin-top:10px;">
              <textarea class="textarea" rows="8" style="width:100%;">${esc(body)}</textarea>
              <div class="muted" style="margin-top:6px;">可直接複製內容貼到郵件</div>
            </div>
          </div>
        `;
      }).join('');

      this._openModal(`
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <div style="font-weight:900;font-size:18px;">📧 保養提醒 Email</div>
            <div class="muted">依「設定」決定收件人：預設 To 或設備負責人 Email</div>
          </div>
          <button class="btn ghost" onclick="MaintenanceUI.closeModal()">關閉</button>
        </div>
        <div style="margin-top:12px;display:grid;gap:10px;">
          ${sections}
        </div>
      `);
    }

    // =========================
    // Equipments
    // =========================
    _renderEquipments(){
      const svc = this._svc();
      const list = svc?.getEquipments ? svc.getEquipments() : [];
      const q = toStr(this.searchEquip).trim().toLowerCase();

      const filtered = list
        .filter(eq => {
          if (!q) return true;
          return toStr(eq._search).includes(q);
        })
        .sort((a,b) => toStr(a.equipmentNo).localeCompare(toStr(b.equipmentNo)));

      const cards = filtered.map(eq => {
        const due = svc?.getDueInfo ? svc.getDueInfo(eq) : { status:'ok', lastYMD:'', nextDue:'' };
        return `
          <div class="card" style="padding:12px 14px;">
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;">
              <div style="flex:1;min-width:240px;">
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                  <div style="font-weight:900;">${esc(eq.equipmentNo||'')}</div>
                  <div style="font-weight:800;">${esc(eq.name||'')}</div>
                  <div class="muted">${esc(eq.model||'')}</div>
                  ${dueBadge(due)}
                </div>
                <div class="muted" style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;">
                  <span>位置：${esc(eq.location||'—')}</span>
                  <span>負責：${esc(eq.owner||'—')}${eq.ownerEmail ? ` <span class="muted">(${esc(eq.ownerEmail)})</span>` : ''}</span>
                  ${eq.installDate ? `<span>安裝：${esc(eq.installDate)}</span>` : ''}
                  <span>週期：${esc(cycleLabel(eq.cycleEvery, eq.cycleUnit))}</span>
                  <span>上次：${esc(due.lastYMD||'—')}</span>
                  ${(!due.hasRecord && due.baseYMD) ? `<span>基準：${esc(due.baseYMD)}</span>` : ''}
                  <span>下次：${esc(due.nextDue||'—')}</span>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                <button class="btn" onclick="MaintenanceUI.openCreateRecordFor('${esc(eq.id)}')">＋ 建紀錄</button>
                <button class="btn" onclick="MaintenanceUI.openEditEquipment('${esc(eq.id)}')">編輯</button>
                <button class="btn danger" onclick="MaintenanceUI.removeEquipment('${esc(eq.id)}')">刪除</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="panel" style="padding:14px 16px;">
          <div class="panel-row">
            <div class="panel-left">
              <div style="font-weight:900;">設備清單</div>
              <div class="muted">設備編號／週期設定／模板（Checklist）</div>
            </div>
            <div class="panel-right">
              <input class="input" style="max-width:360px" placeholder="搜尋：設備編號/名稱/型號/位置/負責人" value="${esc(this.searchEquipDraft)}" oninput="MaintenanceUI._setEquipSearchDraft(event)" onkeydown="MaintenanceUI._onEquipSearchKeydown(event)" />
              <button class="btn" onclick="MaintenanceUI.applyEquipSearch()">搜尋</button>
              <button class="btn ghost" onclick="MaintenanceUI.clearEquipSearch()">清除</button>
            </div>
          </div>
        </div>
        <div style="height:12px;"></div>
        <div>
          ${cards || '<div class="muted" style="padding:8px 4px;">尚無設備，請先新增設備</div>'}
        </div>
      `;
    }
    _setEquipSearchDraft(ev){
      this.searchEquipDraft = toStr(ev?.target?.value);
    }

    _onEquipSearchKeydown(ev){
      const k = ev?.key || ev?.keyCode;
      if (k === 'Enter' || k === 13) {
        try { ev.preventDefault(); } catch (_) {}
        this.applyEquipSearch();
      }
    }

    applyEquipSearch(){
      this.searchEquip = toStr(this.searchEquipDraft);
      this._renderBody();
    }

    clearEquipSearch(){
      this.searchEquipDraft = '';
      this.searchEquip = '';
      this._renderBody();
    }

    // =========================
    // Records
    // =========================
    _renderRecords(){
      const svc = this._svc();
      const eqs = svc?.getEquipments ? svc.getEquipments() : [];
      const recs = svc?.getRecords ? svc.getRecords() : [];

      const q = toStr(this.searchRecord).trim().toLowerCase();
      const from = toStr(this.filterFrom).trim();
      const to = toStr(this.filterTo).trim();
      const eqId = toStr(this.filterEquipmentId).trim();
      const eqIdDraft = toStr(this.filterEquipmentIdDraft).trim();

      const filtered = recs.filter(r => {
        if (eqId && toStr(r.equipmentId) !== eqId) return false;
        if (from && toStr(r.performedAt) < from) return false;
        if (to && toStr(r.performedAt) > to) return false;
        if (q && !toStr(r._search).includes(q)) return false;
        return true;
      }).sort((a,b) => toStr(b.performedAt).localeCompare(toStr(a.performedAt)));

      const eqOptions = ['<option value="">全部設備</option>']
        .concat(eqs.map(e => `<option value="${esc(e.id)}" ${toStr(e.id)===eqIdDraft?'selected':''}>${esc(e.equipmentNo)} ${esc(e.name)}</option>`))
        .join('');

      const rows = filtered.map(r => {
        const hasAbn = !!toStr(r.abnormal).trim();
        const partsCnt = Array.isArray(r.parts) ? r.parts.length : 0;
        const checklist = window.MaintenanceModel?.summarizeChecklist ? window.MaintenanceModel.summarizeChecklist(r.checklist) : { total:0, ok:0, ng:0 };
        return `
          <div class="card" style="padding:12px 14px;">
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;">
              <div style="flex:1;min-width:260px;">
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                  <div style="font-weight:900;">${esc(r.performedAt||'')}</div>
                  <div class="muted">${esc(r.equipmentNo||'')} ${esc(r.equipmentName||'')}</div>
                  <div class="muted">執行：${esc(r.performer||'—')}</div>
                  ${hasAbn?'<span class="badge badge-warning">有異常</span>':''}
                </div>
                <div class="muted" style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;">
                  <span>Checklist：${checklist.ok}/${checklist.total}</span>
                  <span>更換零件：${partsCnt}</span>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                <button class="btn ghost" onclick="MaintenanceUI.openViewRecord('${esc(r.id)}')">檢視</button>
                <button class="btn" onclick="MaintenanceUI.openEditRecord('${esc(r.id)}')">編輯</button>
                <button class="btn danger" onclick="MaintenanceUI.removeRecord('${esc(r.id)}')">刪除</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="panel" style="padding:14px 16px;">
          <div class="panel-row">
            <div class="panel-left">
              <div style="font-weight:900;">保養紀錄</div>
              <div class="muted">查詢／新增／異常／更換零件</div>
            </div>
            <div class="panel-right" style="gap:8px;">
              <select class="input" style="max-width:320px" onchange="MaintenanceUI._setRecEqDraft(event)">${eqOptions}</select>
              <input class="input" type="date" style="max-width:180px" value="${esc(toStr(this.filterFromDraft))}" onchange="MaintenanceUI._setRecFromDraft(event)" />
              <input class="input" type="date" style="max-width:180px" value="${esc(toStr(this.filterToDraft))}" onchange="MaintenanceUI._setRecToDraft(event)" />
              <input class="input" style="max-width:240px" placeholder="搜尋：關鍵字" value="${esc(toStr(this.searchRecordDraft))}" oninput="MaintenanceUI._setRecSearchDraft(event)" onkeydown="MaintenanceUI._onRecSearchKeydown(event)" />
              <button class="btn" onclick="MaintenanceUI.applyRecordFilters()">搜尋</button>
              <button class="btn" onclick="MaintenanceUI.openCreateRecord()">＋ 新增</button>
              <button class="btn ghost" onclick="MaintenanceUI.clearRecordFilters()">清除</button>
            </div>
          </div>
        </div>
        <div style="height:12px;"></div>
        <div>
          ${rows || '<div class="muted" style="padding:8px 4px;">尚無保養紀錄</div>'}
        </div>
      `;
    }
    _setRecEqDraft(ev){ this.filterEquipmentIdDraft = toStr(ev?.target?.value); }
    _setRecFromDraft(ev){ this.filterFromDraft = toStr(ev?.target?.value); }
    _setRecToDraft(ev){ this.filterToDraft = toStr(ev?.target?.value); }
    _setRecSearchDraft(ev){ this.searchRecordDraft = toStr(ev?.target?.value); }

    _onRecSearchKeydown(ev){
      const k = ev?.key || ev?.keyCode;
      if (k === 'Enter' || k === 13) {
        try { ev.preventDefault(); } catch (_) {}
        this.applyRecordFilters();
      }
    }

    applyRecordFilters(){
      this.filterEquipmentId = toStr(this.filterEquipmentIdDraft);
      this.filterFrom = toStr(this.filterFromDraft);
      this.filterTo = toStr(this.filterToDraft);
      this.searchRecord = toStr(this.searchRecordDraft);
      this._renderBody();
    }

    clearRecordFilters(){
      this.searchRecordDraft = '';
      this.filterFromDraft = '';
      this.filterToDraft = '';
      this.filterEquipmentIdDraft = '';
      this.searchRecord = '';
      this.filterFrom = '';
      this.filterTo = '';
      this.filterEquipmentId = '';
      this._renderBody();
    }

    // =========================
    // Reports
    // =========================
    _renderReports(){
      const svc = this._svc();
      const stats = svc?.getStats ? svc.getStats() : { total:0, overdue:0, dueSoon:0, noRecord:0, ok:0, compliance:0 };
      const locStats = svc?.getLocationStats ? svc.getLocationStats() : [];
      const ownerStats = svc?.getOwnerStats ? svc.getOwnerStats() : [];
      const trend = svc?.getMonthlyRecordCounts ? svc.getMonthlyRecordCounts(6) : [];

      const tbl = (title, rows) => {
        const body = (rows && rows.length)
          ? rows.map(r => `
              <tr>
                <td>${esc(r.key||'—')}</td>
                <td style="text-align:right;">${r.total}</td>
                <td style="text-align:right;">${r.overdue}</td>
                <td style="text-align:right;">${r.dueSoon}</td>
                <td style="text-align:right;">${r.noRecord}</td>
                <td style="text-align:right;">${r.ok}</td>
              </tr>
            `).join('')
          : '<tr><td colspan="6" class="muted">尚無資料</td></tr>';
        return `
          <div class="panel" style="padding:14px 16px;">
            <div style="font-weight:900;">${esc(title)}</div>
            <div style="overflow:auto;margin-top:10px;">
              <table class="table">
                <thead>
                  <tr>
                    <th>維度</th>
                    <th style="text-align:right;">總數</th>
                    <th style="text-align:right;">逾期</th>
                    <th style="text-align:right;">即將到期</th>
                    <th style="text-align:right;">尚無紀錄</th>
                    <th style="text-align:right;">正常</th>
                  </tr>
                </thead>
                <tbody>
                  ${body}
                </tbody>
              </table>
            </div>
          </div>
        `;
      };

      const trendRows = (trend && trend.length)
        ? trend.map(t => `<tr><td>${esc(t.month)}</td><td style="text-align:right;">${t.count}</td></tr>`).join('')
        : '<tr><td colspan="2" class="muted">尚無資料</td></tr>';

      return `
        <div class="panel" style="padding:14px 16px;">
          <div class="panel-row">
            <div class="panel-left">
              <div style="font-weight:900;">報表</div>
              <div class="muted">匯出設備清單／保養紀錄／統計（Excel/CSV）</div>
            </div>
            <div class="panel-right">
              <button class="btn" onclick="MaintenanceUI.exportExcel()">⬇️ 匯出 Excel</button>
              <button class="btn ghost" onclick="MaintenanceUI.exportCSV()">⬇️ 匯出 CSV</button>
            </div>
          </div>
        </div>

        <div class="card-list" style="margin-top:12px;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));">
          <div class="card" style="padding:14px 16px;">
            <div class="muted">設備總數</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;">${stats.total}</div>
          </div>
          <div class="card" style="padding:14px 16px;">
            <div class="muted">逾期 + 即將到期</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;">${stats.overdue + stats.dueSoon}</div>
          </div>
          <div class="card" style="padding:14px 16px;">
            <div class="muted">保養率（粗估）</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;">${stats.compliance}%</div>
          </div>
        </div>

        <div style="height:12px;"></div>

        <div class="grid" style="display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:12px;">
          ${tbl('依位置統計', locStats)}
          ${tbl('依負責人統計', ownerStats)}
        </div>

        <div style="height:12px;"></div>
        <div class="panel" style="padding:14px 16px;">
          <div style="font-weight:900;">最近 6 個月保養次數趨勢</div>
          <div style="overflow:auto;margin-top:10px;">
            <table class="table">
              <thead><tr><th>月份</th><th style="text-align:right;">保養次數</th></tr></thead>
              <tbody>${trendRows}</tbody>
            </table>
          </div>
          <div class="muted" style="margin-top:10px;">
            註：本模組的「保養率」為粗估，若你需要「準時率／逾期率（按月）」等更嚴謹定義，可在 MNT-3 依規則補強。
          </div>
        </div>
      `;
    }

    exportExcel(){
      const svc = this._svc();
      const eqs = svc?.getEquipments ? svc.getEquipments() : [];
      const recs = svc?.getRecords ? svc.getRecords() : [];
      const settings = svc?.getSettings ? svc.getSettings() : {};
      const defRemind = Array.isArray(settings.defaultRemindDays) ? settings.defaultRemindDays : [3, 7];
      const locStats = svc?.getLocationStats ? svc.getLocationStats() : [];
      const ownerStats = svc?.getOwnerStats ? svc.getOwnerStats() : [];
      const trend = svc?.getMonthlyRecordCounts ? svc.getMonthlyRecordCounts(6) : [];

      const eqRows = eqs.map(eq => {
        const due = svc?.getDueInfo ? svc.getDueInfo(eq) : { status:'', lastYMD:'', nextDue:'' };
        const rd = (Array.isArray(eq.remindDays) && eq.remindDays.length) ? eq.remindDays : defRemind;
        return `<tr>
          <td>${esc(eq.equipmentNo||'')}</td>
          <td>${esc(eq.name||'')}</td>
          <td>${esc(eq.model||'')}</td>
          <td>${esc(eq.location||'')}</td>
          <td>${esc(eq.owner||'')}</td>
          <td>${esc(eq.ownerEmail||'')}</td>
          <td>${esc(eq.installDate||'')}</td>
          <td>${esc(cycleLabel(eq.cycleEvery, eq.cycleUnit))}</td>
          <td>${esc(Array.isArray(rd)?rd.join(', '):'')}</td>
          <td>${esc(due.lastYMD||'')}</td>
          <td>${esc((!due.hasRecord && due.baseYMD) ? due.baseYMD : '')}</td>
          <td>${esc(due.nextDue||'')}</td>
          <td>${esc(due.status||'')}</td>
        </tr>`;
      }).join('');

      const recRows = recs
        .slice()
        .sort((a,b)=>toStr(b.performedAt).localeCompare(toStr(a.performedAt)))
        .map(r => {
          const partsCnt = Array.isArray(r.parts) ? r.parts.length : 0;
          const partsDetail = Array.isArray(r.parts)
            ? r.parts
                .map(p => {
                  const name = toStr(p?.name).trim();
                  if (!name) return '';
                  const qty = Math.max(1, parseInt(p?.qty, 10) || 1);
                  const note = toStr(p?.note).trim();
                  return note ? `${name} x${qty} (${note})` : `${name} x${qty}`;
                })
                .filter(Boolean)
                .join('；')
            : '';
          const chk = window.MaintenanceModel?.summarizeChecklist ? window.MaintenanceModel.summarizeChecklist(r.checklist) : { total:0, ok:0, ng:0 };
          return `<tr>
            <td>${esc(r.performedAt||'')}</td>
            <td>${esc(r.equipmentNo||'')}</td>
            <td>${esc(r.equipmentName||'')}</td>
            <td>${esc(r.performer||'')}</td>
            <td>${esc(chk.ok)}/${esc(chk.total)}</td>
            <td>${esc(partsCnt)}</td>
            <td>${esc(partsDetail)}</td>
            <td>${esc(r.abnormal||'')}</td>
            <td>${esc(r.notes||'')}</td>
          </tr>`;
        }).join('');

      const statRowHtml = (arr) => (arr && arr.length)
        ? arr.map(s => `<tr>
            <td>${esc(s.key||'—')}</td>
            <td>${esc(s.total)}</td>
            <td>${esc(s.overdue)}</td>
            <td>${esc(s.dueSoon)}</td>
            <td>${esc(s.noRecord)}</td>
            <td>${esc(s.ok)}</td>
          </tr>`).join('')
        : '<tr><td colspan="6">尚無資料</td></tr>';
      const locRows = statRowHtml(locStats);
      const ownerRows = statRowHtml(ownerStats);
      const trendRows = (trend && trend.length)
        ? trend.map(t => `<tr><td>${esc(t.month)}</td><td>${esc(t.count)}</td></tr>`).join('')
        : '<tr><td colspan="2">尚無資料</td></tr>';

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
          </head>
          <body>
            <h2>設備清單</h2>
            <table border="1" cellpadding="4" cellspacing="0">
              <tr>
                <th>設備編號</th><th>名稱</th><th>型號</th><th>位置</th><th>負責</th><th>負責Email</th><th>安裝日期</th><th>保養週期</th><th>提醒天數</th><th>上次保養</th><th>基準日期</th><th>下次到期</th><th>狀態</th>
              </tr>
              ${eqRows}
            </table>

            <h2 style="margin-top:18px;">保養紀錄</h2>
            <table border="1" cellpadding="4" cellspacing="0">
              <tr>
                <th>保養日期</th><th>設備編號</th><th>設備名稱</th><th>執行人員</th><th>Checklist</th><th>更換零件數</th><th>更換零件明細</th><th>異常</th><th>備註</th>
              </tr>
              ${recRows}
            </table>

            <h2 style="margin-top:18px;">依位置統計</h2>
            <table border="1" cellpadding="4" cellspacing="0">
              <tr>
                <th>位置</th><th>總數</th><th>逾期</th><th>即將到期</th><th>尚無紀錄</th><th>正常</th>
              </tr>
              ${locRows}
            </table>

            <h2 style="margin-top:18px;">依負責人統計</h2>
            <table border="1" cellpadding="4" cellspacing="0">
              <tr>
                <th>負責人</th><th>總數</th><th>逾期</th><th>即將到期</th><th>尚無紀錄</th><th>正常</th>
              </tr>
              ${ownerRows}
            </table>

            <h2 style="margin-top:18px;">最近 6 個月保養次數趨勢</h2>
            <table border="1" cellpadding="4" cellspacing="0">
              <tr><th>月份</th><th>保養次數</th></tr>
              ${trendRows}
            </table>
          </body>
        </html>
      `.trim();

      const filename = `maintenance_report_${new Date().toISOString().slice(0,10)}.xls`;
      downloadText(filename, html, 'application/vnd.ms-excel;charset=utf-8');
    }

    exportCSV(){
      const svc = this._svc();
      const eqs = svc?.getEquipments ? svc.getEquipments() : [];
      const recs = svc?.getRecords ? svc.getRecords() : [];

      const escCsv = (v) => {
        const s = toStr(v);
        if (/[\n\r,\"]/g.test(s)) return '"' + s.replace(/\"/g,'""') + '"';
        return s;
      };

      const settings = svc?.getSettings ? svc.getSettings() : {};
      const defRemind = Array.isArray(settings.defaultRemindDays) ? settings.defaultRemindDays : [3, 7];
      const locStats = svc?.getLocationStats ? svc.getLocationStats() : [];
      const ownerStats = svc?.getOwnerStats ? svc.getOwnerStats() : [];
      const trend = svc?.getMonthlyRecordCounts ? svc.getMonthlyRecordCounts(6) : [];

      const eqHeader = ['設備編號','名稱','型號','位置','負責','負責Email','安裝日期','保養週期','提醒天數','上次保養','基準日期','下次到期','狀態'];
      const eqLines = [eqHeader.join(',')];
      for (const eq of eqs) {
        const d = svc?.getDueInfo ? svc.getDueInfo(eq) : { status:'', lastYMD:'', nextDue:'' };
        const rd = (Array.isArray(eq.remindDays) && eq.remindDays.length) ? eq.remindDays : defRemind;
        eqLines.push([
          eq.equipmentNo, eq.name, eq.model, eq.location, eq.owner,
          eq.ownerEmail, eq.installDate,
          cycleLabel(eq.cycleEvery, eq.cycleUnit), Array.isArray(rd)?rd.join(', '):'',
          d.lastYMD, ((!d.hasRecord && d.baseYMD) ? d.baseYMD : ''),
          d.nextDue, d.status
        ].map(escCsv).join(','));
      }

      const recHeader = ['保養日期','設備編號','設備名稱','執行人員','Checklist_OK','Checklist_Total','更換零件數','更換零件明細','異常','備註'];
      const recLines = [recHeader.join(',')];
      for (const r of recs) {
        const partsArr = Array.isArray(r.parts) ? r.parts : [];
        const partsCnt = partsArr.length;
        const partsDetail = partsArr
          .map(p => {
            const name = toStr(p?.name).trim();
            if (!name) return '';
            const qty = Math.max(1, parseInt(p?.qty, 10) || 1);
            const note = toStr(p?.note).trim();
            return note ? `${name} x${qty} (${note})` : `${name} x${qty}`;
          })
          .filter(Boolean)
          .join('；');

        const chk = window.MaintenanceModel?.summarizeChecklist ? window.MaintenanceModel.summarizeChecklist(r.checklist) : { total:0, ok:0, ng:0 };
        recLines.push([
          r.performedAt, r.equipmentNo, r.equipmentName, r.performer,
          chk.ok, chk.total, partsCnt, partsDetail, r.abnormal, r.notes
        ].map(escCsv).join(','));
      }

      const locHeader = ['位置','總數','逾期','即將到期','尚無紀錄','正常'];
      const locLines = [locHeader.join(',')];
      for (const s of (locStats||[])) {
        locLines.push([s.key,s.total,s.overdue,s.dueSoon,s.noRecord,s.ok].map(escCsv).join(','));
      }

      const ownerHeader = ['負責人','總數','逾期','即將到期','尚無紀錄','正常'];
      const ownerLines = [ownerHeader.join(',')];
      for (const s of (ownerStats||[])) {
        ownerLines.push([s.key,s.total,s.overdue,s.dueSoon,s.noRecord,s.ok].map(escCsv).join(','));
      }

      const trendHeader = ['月份','保養次數'];
      const trendLines = [trendHeader.join(',')];
      for (const t of (trend||[])) {
        trendLines.push([t.month,t.count].map(escCsv).join(','));
      }

      const content = '\ufeff' + `# 設備清單\n${eqLines.join('\n')}\n\n# 保養紀錄\n${recLines.join('\n')}\n\n# 依位置統計\n${locLines.join('\n')}\n\n# 依負責人統計\n${ownerLines.join('\n')}\n\n# 最近 6 個月保養次數趨勢\n${trendLines.join('\n')}\n`;
      const filename = `maintenance_report_${new Date().toISOString().slice(0,10)}.csv`;
      downloadText(filename, content, 'text/csv;charset=utf-8');
    }

    // =========================
    // Modals - Equipment
    // =========================
    openCreateEquipment(prefill){ this._openEquipmentModal(null, prefill); }
    openEditEquipment(id){ this._openEquipmentModal(id, null); }

    _openEquipmentModal(id, prefill){
      const svc = this._svc();
      const eq = id ? (svc?.getEquipmentById ? svc.getEquipmentById(id) : null) : null;

      const isEdit = !!eq;
      const pf = (!isEdit && prefill && typeof prefill === 'object') ? prefill : {};

      const equipmentNo = isEdit ? (eq.equipmentNo||'') : toStr(pf.equipmentNo);
      const name = isEdit ? (eq.name||'') : toStr(pf.name);
      const model = isEdit ? (eq.model||'') : toStr(pf.model);
      const location = isEdit ? (eq.location||'') : toStr(pf.location);
      const owner = isEdit ? (eq.owner||'') : toStr(pf.owner);
      const ownerEmail = isEdit ? (eq.ownerEmail||'') : toStr(pf.ownerEmail);
      const installDate = isEdit ? (eq.installDate||'') : toStr(pf.installDate);

      const cycleEvery = (() => {
        if (isEdit) return (eq.cycleEvery||30);
        const n = parseInt(pf.cycleEvery, 10);
        return (Number.isFinite(n) && n > 0) ? n : 30;
      })();

      const cycleUnit = (() => {
        if (isEdit) return (eq.cycleUnit||'day');
        const u = toStr(pf.cycleUnit).trim();
        if (u === 'day' || u === 'week' || u === 'month') return u;
        return 'day';
      })();

      const settings = svc?.getSettings ? svc.getSettings() : {};
      const defRemind = Array.isArray(settings.defaultRemindDays) ? settings.defaultRemindDays : [3, 7];
      const remindStr = (() => {
        const src = isEdit ? (Array.isArray(eq?.remindDays) ? eq.remindDays : []) : (Array.isArray(pf.remindDays) && pf.remindDays.length ? pf.remindDays : defRemind);
        return Array.isArray(src) ? src.join(', ') : '3, 7';
      })();

      const tagsStr = (() => {
        const t = isEdit ? (eq?.tags||[]) : (Array.isArray(pf.tags) ? pf.tags : []);
        return Array.isArray(t) ? t.join(', ') : '';
      })();

      const tmpl = (isEdit && Array.isArray(eq.checklistTemplate)) ? eq.checklistTemplate : (Array.isArray(pf.checklistTemplate) ? pf.checklistTemplate : []);
      const tmplRows = tmpl.length
        ? tmpl.map((t,i)=>`<div class="maint-row"><input class="input" name="tmpl_${i}" value="${esc(t.label||'')}" placeholder="檢查項目" /><button type="button" class="btn ghost" onclick="MaintenanceUI._removeTmplRow(${i})">－</button></div>`).join('')
        : '<div class="muted">尚未設定模板（建立保養紀錄時可套用）</div>';

      const content = `
        <div class="modal-header">
          <div>
            <h3>${isEdit ? '編輯設備' : '新增設備'}</h3>
            <div class="muted" style="margin-top:6px;">設備編號／名稱／型號／位置／負責／保養週期</div>
          </div>
          <button class="modal-close" type="button" onclick="MaintenanceUI.closeModal()">×</button>
        </div>
        <div class="modal-body">
          <form id="maint-eq-form" class="form">
            <input type="hidden" name="id" value="${esc(eq?.id||'')}" />

            <div class="grid" style="display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:12px;">
              <div class="field">
                <label class="label">設備編號 <span class="muted">(必填)</span></label>
                <input class="input" name="equipmentNo" required data-required-msg="請輸入設備編號" value="${esc(equipmentNo)}" placeholder="例如：EQ-001" />
              </div>
              <div class="field">
                <label class="label">設備名稱 <span class="muted">(必填)</span></label>
                <input class="input" name="name" required data-required-msg="請輸入設備名稱" value="${esc(name)}" placeholder="例如：FlexTRAK" />
              </div>
              <div class="field">
                <label class="label">型號</label>
                <input class="input" name="model" value="${esc(model)}" placeholder="例如：FlexTRAK-S" />
              </div>
              <div class="field">
                <label class="label">安裝位置</label>
                <input class="input" name="location" value="${esc(location)}" placeholder="例如：ASEK21 / AP5" />
              </div>
              <div class="field">
                <label class="label">負責人員</label>
                <input class="input" name="owner" value="${esc(owner)}" placeholder="例如：Perry" />
              </div>
              <div class="field">
                <label class="label">負責人 Email</label>
                <input class="input" name="ownerEmail" value="${esc(ownerEmail)}" placeholder="例如：perry@example.com" />
              </div>
              <div class="field">
                <label class="label">安裝日期</label>
                <input class="input" name="installDate" type="date" value="${esc(installDate)}" />
                <div class="muted" style="margin-top:6px;">若尚無保養紀錄，會以安裝日期作為週期起算基準</div>
              </div>
              <div class="field">
                <label class="label">保養週期</label>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <input class="input" name="cycleEvery" type="number" min="1" value="${esc(cycleEvery)}" style="max-width:120px;" />
                  <select class="input" name="cycleUnit" style="max-width:160px;">
                    <option value="day" ${cycleUnit==='day'?'selected':''}>天</option>
                    <option value="week" ${cycleUnit==='week'?'selected':''}>週</option>
                    <option value="month" ${cycleUnit==='month'?'selected':''}>月</option>
                  </select>
                  <input class="input" name="remindDays" value="${esc(remindStr)}" style="max-width:200px;" placeholder="提醒天數，例如 3,7" />
                  <div class="muted">可留白採用預設：${esc(defRemind.join(', '))}</div>
                </div>
              </div>
              <div class="field" style="grid-column:1/-1;">
                <label class="label">Tags（以逗號分隔）</label>
                <input class="input" name="tags" value="${esc(tagsStr)}" placeholder="例如：AP5, FlexTRAK" />
              </div>
            </div>

            <div style="height:14px;"></div>
            <div class="panel" style="padding:12px 14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <div>
                  <div style="font-weight:900;">保養項目檢查清單（模板）</div>
                  <div class="muted" style="margin-top:4px;">建立保養紀錄時可一鍵套用</div>
                </div>
                <div style="display:flex;gap:8px;">
                  <button type="button" class="btn" onclick="MaintenanceUI._addTmplRow()">＋ 新增</button>
                  <button type="button" class="btn ghost" onclick="MaintenanceUI._resetTmpl()">清空</button>
                </div>
              </div>
              <div id="maint-tmpl-box" style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                ${tmplRows}
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn ghost" type="button" onclick="MaintenanceUI.closeModal()">取消</button>
          <button class="btn primary" type="button" onclick="MaintenanceUI.saveEquipment()">儲存</button>
        </div>
      `.trim();

      this._openModal(content);
      try { window.FormValidate?.bindForm?.(document.getElementById('maint-eq-form')); } catch (_) {}
    }

    _addTmplRow(){
      const box = document.getElementById('maint-tmpl-box');
      if (!box) return;
      const inputs = Array.from(box.querySelectorAll('input[name^="tmpl_"]'));
      const i = inputs.length;
      if (inputs.length === 0 && box.textContent.includes('尚未設定模板')) {
        box.innerHTML = '';
      }
      const row = document.createElement('div');
      row.className = 'maint-row';
      row.innerHTML = `<input class="input" name="tmpl_${i}" placeholder="檢查項目" /><button type="button" class="btn ghost" onclick="MaintenanceUI._removeTmplRow(${i})">－</button>`;
      box.appendChild(row);
    }

    _removeTmplRow(i){
      const box = document.getElementById('maint-tmpl-box');
      if (!box) return;
      const rows = Array.from(box.querySelectorAll('.maint-row'));
      const row = rows[i];
      if (row) row.remove();
      // 重新編號
      const newRows = Array.from(box.querySelectorAll('.maint-row'));
      newRows.forEach((r, idx) => {
        const input = r.querySelector('input');
        const btn = r.querySelector('button');
        if (input) input.setAttribute('name', `tmpl_${idx}`);
        if (btn) btn.setAttribute('onclick', `MaintenanceUI._removeTmplRow(${idx})`);
      });
      if (newRows.length === 0) box.innerHTML = '<div class="muted">尚未設定模板（建立保養紀錄時可套用）</div>';
    }

    _resetTmpl(){
      const box = document.getElementById('maint-tmpl-box');
      if (!box) return;
      box.innerHTML = '<div class="muted">尚未設定模板（建立保養紀錄時可套用）</div>';
    }

    async saveEquipment(){
      const svc = this._svc();
      const form = document.getElementById('maint-eq-form');
      if (!form) return;

      try {
        const ok = window.FormValidate?.validateForm?.(form);
        if (!ok) return;
      } catch (_) {}

      const fd = new FormData(form);
      const id = toStr(fd.get('id')).trim();
      const equipmentNo = toStr(fd.get('equipmentNo')).trim();
      const name = toStr(fd.get('name')).trim();
      const model = toStr(fd.get('model')).trim();
      const location = toStr(fd.get('location')).trim();
      const owner = toStr(fd.get('owner')).trim();
      const ownerEmail = toStr(fd.get('ownerEmail')).trim();
      const installDate = toStr(fd.get('installDate')).trim();
      const cycleEvery = parseInt(toStr(fd.get('cycleEvery')), 10) || 30;
      const cycleUnit = toStr(fd.get('cycleUnit')).trim() || 'day';
      const remindDays = (() => {
        const raw = toStr(fd.get('remindDays')).trim();
        if (!raw) return [];
        const arr = raw.split(',').map(s => parseInt(String(s).trim(),10)).filter(n => Number.isFinite(n) && n >= 0);
        return Array.from(new Set(arr)).sort((a,b)=>a-b).slice(0,3);
      })();
      const tags = toStr(fd.get('tags')).split(',').map(s => s.trim()).filter(Boolean);

      const box = document.getElementById('maint-tmpl-box');
      const tmplInputs = box ? Array.from(box.querySelectorAll('input[name^="tmpl_"]')) : [];
      const checklistTemplate = tmplInputs.map(i => ({ label: toStr(i.value).trim() })).filter(x => x.label);

      try {
        await svc?.upsertEquipment?.({ id: id || undefined, equipmentNo, name, model, location, owner, ownerEmail, installDate, cycleEvery, cycleUnit, remindDays, tags, checklistTemplate });
        toast('已儲存設備', 'success');
        this.closeModal();
        this._renderBody();
      } catch (e) {
        console.error(e);
        toast(e?.message || '儲存失敗（請確認必填欄位/設備編號不可重複）', 'error');
      }
    }

    async removeEquipment(id){
      const svc = this._svc();
      const ok = await (window.UI?.confirm ? window.UI.confirm({
        title: '刪除確認',
        message: '確定要刪除此設備？（保養紀錄不會自動刪除，但設備將不再顯示於提醒/報表）',
        okText: '刪除',
        cancelText: '取消',
        tone: 'danger'
      }) : Promise.resolve(window.confirm('確定刪除？')));
      if (!ok) return;

      try {
        await svc?.removeEquipment?.(id);
        toast('已刪除', 'success');
        this._renderBody();
      } catch (e) {
        console.error(e);
        toast('刪除失敗', 'error');
      }
    }

    // =========================
    // Modals - Record
    // =========================
    openQuickCreate(){
      this.openCreateRecord();
    }

    openCreateRecord(){
      this._openRecordModal(null, null);
    }

    openCreateRecordFor(equipmentId){
      this._openRecordModal(null, equipmentId);
    }

    openEditRecord(id){
      this._openRecordModal(id, null);
    }

    openViewRecord(id){
      this._openRecordModal(id, null, true);
    }

    _openRecordModal(id, equipmentId, viewOnly){
      const svc = this._svc();
      const eqs = svc?.getEquipments ? svc.getEquipments() : [];
      const rec = id ? (svc?.getRecordById ? svc.getRecordById(id) : null) : null;

      const isEdit = !!rec;
      const readOnly = !!viewOnly;

      const eqId = toStr(equipmentId || rec?.equipmentId).trim();

      const eqOptions = ['<option value="">請選擇設備</option>']
        .concat(eqs.map(e => `<option value="${esc(e.id)}" ${(toStr(e.id)===eqId)?'selected':''}>${esc(e.equipmentNo)} ${esc(e.name)}</option>`))
        .join('');

      const performedAt = rec?.performedAt || (window.MaintenanceModel?.todayYMD ? window.MaintenanceModel.todayYMD() : new Date().toISOString().slice(0,10));
      const performer = rec?.performer || '';

      const eq = eqId ? (svc?.getEquipmentById ? svc.getEquipmentById(eqId) : null) : null;
      const template = (eq && Array.isArray(eq.checklistTemplate)) ? eq.checklistTemplate : [];

      const checklistSrc = Array.isArray(rec?.checklist) && rec.checklist.length
        ? rec.checklist
        : template.map(t => ({ label: t.label, ok: true, note: '' }));

      const checklistRows = (checklistSrc.length ? checklistSrc : []).map((c,i) => {
        return `<div class="maint-row" style="align-items:flex-start;">
          <input class="input" name="chk_label_${i}" value="${esc(c.label||'')}" placeholder="項目" ${readOnly?'readonly':''} />
          <label class="chip static" style="gap:6px;">
            <input type="checkbox" name="chk_ok_${i}" ${c.ok?'checked':''} ${readOnly?'disabled':''} />
            <span>OK</span>
          </label>
          <input class="input" name="chk_note_${i}" value="${esc(c.note||'')}" placeholder="備註" ${readOnly?'readonly':''} />
          ${readOnly?'':`<button type="button" class="btn ghost" onclick="MaintenanceUI._removeChecklistRow(${i})">－</button>`}
        </div>`;
      }).join('') || '<div class="muted">尚未設定 Checklist，請新增一列</div>';

      const partsSrc = Array.isArray(rec?.parts) ? rec.parts : [];

      // UX：新增紀錄時預設顯示 1 列（空白），讓使用者直覺可輸入多筆；
      // 檢視模式仍維持「尚未有更換零件」提示。
      const partsForRender = (() => {
        if (partsSrc.length) return partsSrc;
        if (readOnly) return [];
        return [{ name:'', qty:1, note:'' }];
      })();

      const partRows = (partsForRender.length ? partsForRender : []).map((p,i)=>{
        return `<div class="maint-row">
          <input class="input" name="part_name_${i}" value="${esc(p.name||'')}" placeholder="零件名稱" ${readOnly?'readonly':''} />
          <input class="input" name="part_qty_${i}" type="number" min="1" value="${esc(p.qty||1)}" style="max-width:120px;" ${readOnly?'readonly':''} />
          <input class="input" name="part_note_${i}" value="${esc(p.note||'')}" placeholder="備註" ${readOnly?'readonly':''} />
          ${readOnly?'':`<button type="button" class="btn ghost" onclick="MaintenanceUI._removePartRow(${i})">－</button>`}
        </div>`;
      }).join('') || '<div class="muted">尚未有更換零件</div>';

      const tags = (rec?.tags||[]).join(', ');

      const content = `
        <div class="modal-header">
          <div>
            <h3>${readOnly ? '檢視保養紀錄' : (isEdit ? '編輯保養紀錄' : '新增保養紀錄')}</h3>
            <div class="muted" style="margin-top:6px;">保養日期／執行人員／Checklist／異常／更換零件</div>
          </div>
          <button class="modal-close" type="button" onclick="MaintenanceUI.closeModal()">×</button>
        </div>
        <div class="modal-body">
          <form id="maint-rec-form">
            <input type="hidden" name="id" value="${esc(rec?.id||'')}" />

            <div class="grid" style="display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:12px;">
              <div class="field">
                <label class="label">設備 <span class="muted">(必填)</span></label>
                <select class="input" name="equipmentId" required data-required-msg="請選擇設備" onchange="MaintenanceUI._onRecordEqChange(event)" ${readOnly?'disabled':''}>
                  ${eqOptions}
                </select>
              </div>
              <div class="field">
                <label class="label">保養日期 <span class="muted">(必填)</span></label>
                <input class="input" type="date" name="performedAt" required data-required-msg="請選擇保養日期" value="${esc(performedAt)}" ${readOnly?'readonly':''} />
              </div>
              <div class="field">
                <label class="label">執行人員 <span class="muted">(必填)</span></label>
                <input class="input" name="performer" required data-required-msg="請輸入執行人員" value="${esc(performer)}" placeholder="例如：Perry" ${readOnly?'readonly':''} />
              </div>
              <div class="field" style="grid-column:1/-1;">
                <label class="label">Tags（以逗號分隔）</label>
                <input class="input" name="tags" value="${esc(tags)}" placeholder="例如：PM, chamber" ${readOnly?'readonly':''} />
              </div>
            </div>

            <div style="height:14px;"></div>

            <div class="panel" style="padding:12px 14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <div>
                  <div style="font-weight:900;">保養項目 Checklist</div>
                  <div class="muted" style="margin-top:4px;">可套用設備模板，並逐項勾選 OK</div>
                </div>
                <div style="display:flex;gap:8px;">
                  ${readOnly?'':`<button type="button" class="btn" onclick="MaintenanceUI._addChecklistRow()">＋ 新增</button>`}
                </div>
              </div>
              <div id="maint-checklist-box" style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                ${checklistRows}
              </div>
            </div>

            <div style="height:14px;"></div>

            <div class="panel" style="padding:12px 14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <div>
                  <div style="font-weight:900;">異常狀況</div>
                  <div class="muted" style="margin-top:4px;">若有異常，請簡述狀況與處置</div>
                </div>
              </div>
              <textarea class="input" name="abnormal" rows="3" placeholder="例如：真空壓力異常，已更換 O-ring" ${readOnly?'readonly':''}>${esc(rec?.abnormal||'')}</textarea>
            </div>

            <div style="height:14px;"></div>

            <div class="panel" style="padding:12px 14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <div>
                  <div style="font-weight:900;">更換零件</div>
                  <div class="muted" style="margin-top:4px;">可記錄零件名稱、數量、備註</div>
                </div>
                <div style="display:flex;gap:8px;">
                  ${readOnly?'':`<button type="button" class="btn" onclick="MaintenanceUI._addPartRow()">＋ 新增</button>`}
                </div>
              </div>
              <div id="maint-parts-box" style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                ${partRows}
              </div>
            </div>

            <div style="height:14px;"></div>
            <div class="field">
              <label class="label">備註</label>
              <textarea class="input" name="notes" rows="3" placeholder="其他補充" ${readOnly?'readonly':''}>${esc(rec?.notes||'')}</textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn ghost" type="button" onclick="MaintenanceUI.closeModal()">關閉</button>
          ${readOnly ? '' : `<button class="btn primary" type="button" onclick="MaintenanceUI.saveRecord()">儲存</button>`}
        </div>
      `.trim();

      this._openModal(content);
      try { window.FormValidate?.bindForm?.(document.getElementById('maint-rec-form')); } catch (_) {}
    }

    _onRecordEqChange(ev){
      // 更換設備時重新套用模板（僅在新增狀態）
      const svc = this._svc();
      const form = document.getElementById('maint-rec-form');
      if (!form) return;
      const id = toStr(form.querySelector('input[name="id"]')?.value).trim();
      if (id) return; // 編輯不自動覆寫

      const eqId = toStr(ev?.target?.value).trim();
      if (!eqId) return;
      const eq = svc?.getEquipmentById ? svc.getEquipmentById(eqId) : null;
      const template = (eq && Array.isArray(eq.checklistTemplate)) ? eq.checklistTemplate : [];
      const box = document.getElementById('maint-checklist-box');
      if (!box) return;

      if (!template.length) {
        box.innerHTML = '<div class="muted">此設備尚未設定模板</div>';
        return;
      }

      box.innerHTML = template.map((t,i)=>{
        return `<div class="maint-row" style="align-items:flex-start;">
          <input class="input" name="chk_label_${i}" value="${esc(t.label||'')}" placeholder="項目" />
          <label class="chip static" style="gap:6px;">
            <input type="checkbox" name="chk_ok_${i}" checked />
            <span>OK</span>
          </label>
          <input class="input" name="chk_note_${i}" value="" placeholder="備註" />
          <button type="button" class="btn ghost" onclick="MaintenanceUI._removeChecklistRow(${i})">－</button>
        </div>`;
      }).join('');
    }

    _addChecklistRow(){
      const box = document.getElementById('maint-checklist-box');
      if (!box) return;
      if (box.textContent.includes('尚未設定 Checklist') || box.textContent.includes('此設備尚未設定模板')) {
        box.innerHTML = '';
      }
      const rows = Array.from(box.querySelectorAll('.maint-row'));
      const i = rows.length;
      const row = document.createElement('div');
      row.className = 'maint-row';
      row.style.alignItems = 'flex-start';
      row.innerHTML = `<input class="input" name="chk_label_${i}" placeholder="項目" />
        <label class="chip static" style="gap:6px;">
          <input type="checkbox" name="chk_ok_${i}" checked />
          <span>OK</span>
        </label>
        <input class="input" name="chk_note_${i}" placeholder="備註" />
        <button type="button" class="btn ghost" onclick="MaintenanceUI._removeChecklistRow(${i})">－</button>`;
      box.appendChild(row);
    }

    _removeChecklistRow(i){
      const box = document.getElementById('maint-checklist-box');
      if (!box) return;
      const rows = Array.from(box.querySelectorAll('.maint-row'));
      const row = rows[i];
      if (row) row.remove();
      // 重新編號
      const newRows = Array.from(box.querySelectorAll('.maint-row'));
      newRows.forEach((r, idx) => {
        const inputs = r.querySelectorAll('input');
        if (inputs[0]) inputs[0].setAttribute('name', `chk_label_${idx}`);
        if (inputs[1]) inputs[1].setAttribute('name', `chk_ok_${idx}`);
        if (inputs[2]) inputs[2].setAttribute('name', `chk_note_${idx}`);
        const btn = r.querySelector('button');
        if (btn) btn.setAttribute('onclick', `MaintenanceUI._removeChecklistRow(${idx})`);
      });
      if (newRows.length === 0) box.innerHTML = '<div class="muted">尚未設定 Checklist，請新增一列</div>';
    }

    _addPartRow(){
      const box = document.getElementById('maint-parts-box');
      if (!box) return;
      if (box.textContent.includes('尚未有更換零件')) box.innerHTML = '';
      const rows = Array.from(box.querySelectorAll('.maint-row'));
      const i = rows.length;
      const row = document.createElement('div');
      row.className = 'maint-row';
      row.innerHTML = `<input class="input" name="part_name_${i}" placeholder="零件名稱" />
        <input class="input" name="part_qty_${i}" type="number" min="1" value="1" style="max-width:120px;" />
        <input class="input" name="part_note_${i}" placeholder="備註" />
        <button type="button" class="btn ghost" onclick="MaintenanceUI._removePartRow(${i})">－</button>`;
      box.appendChild(row);
    }

    _removePartRow(i){
      const box = document.getElementById('maint-parts-box');
      if (!box) return;
      const rows = Array.from(box.querySelectorAll('.maint-row'));
      const row = rows[i];
      if (row) row.remove();
      const newRows = Array.from(box.querySelectorAll('.maint-row'));
      newRows.forEach((r, idx) => {
        const inputs = r.querySelectorAll('input');
        if (inputs[0]) inputs[0].setAttribute('name', `part_name_${idx}`);
        if (inputs[1]) inputs[1].setAttribute('name', `part_qty_${idx}`);
        if (inputs[2]) inputs[2].setAttribute('name', `part_note_${idx}`);
        const btn = r.querySelector('button');
        if (btn) btn.setAttribute('onclick', `MaintenanceUI._removePartRow(${idx})`);
      });
      if (newRows.length === 0) box.innerHTML = '<div class="muted">尚未有更換零件</div>';
    }

    async saveRecord(){
      const svc = this._svc();
      const form = document.getElementById('maint-rec-form');
      if (!form) return;

      try {
        const ok = window.FormValidate?.validateForm?.(form);
        if (!ok) return;
      } catch (_) {}

      const fd = new FormData(form);
      const id = toStr(fd.get('id')).trim();
      const equipmentId = toStr(fd.get('equipmentId')).trim();
      const performedAt = toStr(fd.get('performedAt')).trim();
      const performer = toStr(fd.get('performer')).trim();
      const tags = toStr(fd.get('tags')).split(',').map(s => s.trim()).filter(Boolean);

      // checklist
      const checklist = [];
      const chkLabels = Array.from(form.querySelectorAll('input[name^="chk_label_"]'));
      for (let i=0; i<chkLabels.length; i++) {
        const label = toStr(chkLabels[i].value).trim();
        if (!label) continue;
        const okEl = form.querySelector(`input[name="chk_ok_${i}"]`);
        const noteEl = form.querySelector(`input[name="chk_note_${i}"]`);
        checklist.push({ label, ok: !!okEl?.checked, note: toStr(noteEl?.value).trim() });
      }

      // parts
      const parts = [];
      const partNames = Array.from(form.querySelectorAll('input[name^="part_name_"]'));
      for (let i=0; i<partNames.length; i++) {
        const name = toStr(partNames[i].value).trim();
        if (!name) continue;
        const qtyEl = form.querySelector(`input[name="part_qty_${i}"]`);
        const noteEl = form.querySelector(`input[name="part_note_${i}"]`);
        parts.push({ name, qty: parseInt(toStr(qtyEl?.value),10) || 1, note: toStr(noteEl?.value).trim() });
      }

      const abnormal = toStr(form.querySelector('textarea[name="abnormal"]')?.value).trim();
      const notes = toStr(form.querySelector('textarea[name="notes"]')?.value).trim();

      try {
        await svc?.upsertRecord?.({ id: id||undefined, equipmentId, performedAt, performer, checklist, abnormal, parts, notes, tags });
        toast('已儲存保養紀錄', 'success');
        this.closeModal();
        this._renderBody();
      } catch (e) {
        console.error(e);
        toast('儲存失敗（請確認必填欄位）', 'error');
      }
    }

    async removeRecord(id){
      const svc = this._svc();
      const ok = await (window.UI?.confirm ? window.UI.confirm({
        title: '刪除確認',
        message: '確定要刪除此保養紀錄？',
        okText: '刪除',
        cancelText: '取消',
        tone: 'danger'
      }) : Promise.resolve(window.confirm('確定刪除？')));
      if (!ok) return;

      try {
        await svc?.removeRecord?.(id);
        toast('已刪除', 'success');
        this._renderBody();
      } catch (e) {
        console.error(e);
        toast('刪除失敗', 'error');
      }
    }

    // =========================
    // Modal helpers
    // =========================
    _openModal(html){
      const modal = document.getElementById('maint-modal');
      const content = document.getElementById('maint-modal-content');
      if (!modal || !content) return;
      content.innerHTML = html;
      modal.style.display = '';
      try {
        const focusable = content.querySelector('input,select,textarea,button');
        if (focusable) focusable.focus();
      } catch (_) {}
    }

    closeModal(){
      const modal = document.getElementById('maint-modal');
      const content = document.getElementById('maint-modal-content');
      if (content) content.innerHTML = '';
      if (modal) modal.style.display = 'none';
    }
  }

  const maintenanceUI = new MaintenanceUI();
  window.maintenanceUI = maintenanceUI;
  try { window.AppRegistry?.register?.('MaintenanceUI', maintenanceUI); } catch (_) {}

  // Static wrappers（給 inline onclick 使用）
  Object.assign(window.MaintenanceUI = window.MaintenanceUI || {}, {
    render: (c) => maintenanceUI.render(c),
    setTab: (t) => maintenanceUI.setTab(t),
    gotoSettings: () => maintenanceUI.gotoSettings(),
    openQuickCreate: () => maintenanceUI.openQuickCreate(),
    openCreateEquipment: (prefill) => maintenanceUI.openCreateEquipment(prefill),
    openEditEquipment: (id) => maintenanceUI.openEditEquipment(id),
    removeEquipment: (id) => maintenanceUI.removeEquipment(id),
    clearEquipSearch: () => maintenanceUI.clearEquipSearch(),
    applyEquipSearch: () => maintenanceUI.applyEquipSearch(),
    _setEquipSearchDraft: (e) => maintenanceUI._setEquipSearchDraft(e),
    _onEquipSearchKeydown: (e) => maintenanceUI._onEquipSearchKeydown(e),
    // 相容舊呼叫
    _setEquipSearch: (e) => maintenanceUI._setEquipSearchDraft(e),

    openCreateRecord: () => maintenanceUI.openCreateRecord(),
    openCreateRecordFor: (id) => maintenanceUI.openCreateRecordFor(id),
    openEditRecord: (id) => maintenanceUI.openEditRecord(id),
    openViewRecord: (id) => maintenanceUI.openViewRecord(id),
    removeRecord: (id) => maintenanceUI.removeRecord(id),

    _setRecEqDraft: (e) => maintenanceUI._setRecEqDraft(e),
    _setRecFromDraft: (e) => maintenanceUI._setRecFromDraft(e),
    _setRecToDraft: (e) => maintenanceUI._setRecToDraft(e),
    _setRecSearchDraft: (e) => maintenanceUI._setRecSearchDraft(e),
    _onRecSearchKeydown: (e) => maintenanceUI._onRecSearchKeydown(e),
    applyRecordFilters: () => maintenanceUI.applyRecordFilters(),
    clearRecordFilters: () => maintenanceUI.clearRecordFilters(),

    // 相容舊呼叫
    _setRecEq: (e) => maintenanceUI._setRecEqDraft(e),
    _setRecFrom: (e) => maintenanceUI._setRecFromDraft(e),
    _setRecTo: (e) => maintenanceUI._setRecToDraft(e),
    _setRecSearch: (e) => maintenanceUI._setRecSearchDraft(e),

    saveEmailTo: () => maintenanceUI.saveEmailTo(),
    sendReminderEmail: () => maintenanceUI.sendReminderEmail(),

    exportExcel: () => maintenanceUI.exportExcel(),
    exportCSV: () => maintenanceUI.exportCSV(),

    _addTmplRow: () => maintenanceUI._addTmplRow(),
    _removeTmplRow: (i) => maintenanceUI._removeTmplRow(i),
    _resetTmpl: () => maintenanceUI._resetTmpl(),
    saveEquipment: () => maintenanceUI.saveEquipment(),

    _onRecordEqChange: (e) => maintenanceUI._onRecordEqChange(e),
    _addChecklistRow: () => maintenanceUI._addChecklistRow(),
    _removeChecklistRow: (i) => maintenanceUI._removeChecklistRow(i),
    _addPartRow: () => maintenanceUI._addPartRow(),
    _removePartRow: (i) => maintenanceUI._removePartRow(i),
    saveRecord: () => maintenanceUI.saveRecord(),

    closeModal: () => maintenanceUI.closeModal()
  });

  try { console.log('✅ MaintenanceUI loaded'); } catch (_) {}
})();
