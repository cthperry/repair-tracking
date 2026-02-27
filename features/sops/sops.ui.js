/**
 * SOP Hub - UI
 *
 * 目標：UI/流程對齊 OrderSOPHub Phase 1
 * - 列表頁：類別 + 關鍵字查詢 + 表格
 * - 新增頁：先建立主檔，再到詳情頁上傳版本
 * - 詳情頁：顯示主檔欄位（唯讀）+ 上傳新版本 + 版本列表
 */

class SOPUI {
  constructor(){
    this._renderedContainerId = 'main-content';

    // view: list | new | detail
    this.view = 'list';
    this.currentSopId = '';

    // filters（對齊 OrderSOPHub）
    this.filterCategory = '';
    this.filterKeyword = '';

    // detail state
    this._detailMsg = '';
    this._delegationBound = false;
    this._delegationRoot = null;
    this._boundDataChanged = false;

    // 使用 document 層級委派，避免主容器重繪導致事件失效
    this._globalBound = false;

    // 詳情頁是否處於編輯模式
    this._detailEditing = false;
  }

  _svc(){
    try { return (typeof window._svc === 'function') ? window._svc('SOPService') : window.SOPService; } catch (_) { return null; }
  }

  _toast(msg, type){
    try { window.UI?.toast?.(msg, { type: type || 'info' }); }
    catch (_) { try { alert(msg); } catch (_) {} }
  }

  _escape(s){
    const v = (s === null || s === undefined) ? '' : String(s);
    return v
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  _escapeAttr(s){
    return this._escape(s).split('\n').join(' ').split('\r').join(' ');
  }

  _catLabel(cat){
    const c = String(cat || 'general');
    const map = {
      machine: '機台',
      part: '零件',
      repair: '維修',
      general: '通用'
    };
    return map[c] || '通用';
  }

  _fmtDate(iso){
    const s = String(iso || '');
    if (!s) return '-';
    // iso: 2026-02-21T...
    return s.slice(0, 10);
  }

  render(containerId = 'main-content'){
    this._renderedContainerId = containerId;
    const host = document.getElementById(containerId);
    if (!host) return;

    host.innerHTML = `<div class="sops-page" id="sops-page"></div>`;
    const root = host.querySelector('#sops-page');
    if (!root) return;

    this._bindDelegation(root);
    this._renderCurrent();

    // 監聽資料更新：只在 SOP 模組畫面內更新
    try {
      if (!this._boundDataChanged) {
        this._boundDataChanged = true;
        window.addEventListener('data:changed', (ev) => {
          const m = ev?.detail?.module;
          if (m === 'sops') {
            // 若仍在 sops 路由，更新當前 view
            this._renderCurrent();
          }
        });

        if (!this._boundSyncErr) {
          this._boundSyncErr = true;
          window.addEventListener('sops:sync-error', (ev) => {
            const msg = ev?.detail?.message;
            if (msg) this._toast(msg, 'warning');
          });
        }
      }
    } catch (_) {}
  }

  // =============================
  // Navigation
  // =============================

  goList(){
    this.view = 'list';
    this.currentSopId = '';
    this._detailMsg = '';
    this._renderCurrent();
  }

  goNew(){
    this.view = 'new';
    this.currentSopId = '';
    this._detailMsg = '';
    this._renderCurrent();
  }

  goDetail(id){
    const sopId = String(id || '').trim();
    if (!sopId) return;
    this.view = 'detail';
    this.currentSopId = sopId;
    this._detailEditing = false;
    this._detailMsg = '';
    this._renderCurrent();
    this._refreshDetailAsync(sopId);
  }

  // =============================
  // Render
  // =============================

  _renderCurrent(){
    const root = this._delegationRoot;
    if (!root) return;

    if (this.view === 'new') {
      root.innerHTML = this._renderNewView();
      return;
    }
    if (this.view === 'detail') {
      root.innerHTML = this._renderDetailView(this.currentSopId);
      // 詳情頁資料需要 async
      this._refreshDetailAsync(this.currentSopId);
      return;
    }

    root.innerHTML = this._renderListView();
  }

  _renderListView(){
    const svc = this._svc();
    const all = svc?.getAll ? (svc.getAll() || []) : [];

    const cat = String(this.filterCategory || '');
    const kw = String(this.filterKeyword || '').trim().toLowerCase();

    const rows = all
      .filter(s => !s?.isDeleted)
      .filter(s => !cat ? true : String(s.category || '') === cat)
      .filter(s => {
        if (!kw) return true;
        const text = `${s.title||''} ${(s.tags||[]).join(' ')} ${s.abstract||''}`.toLowerCase();
        return text.includes(kw);
      })
      .sort((a,b) => String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));

    const body = rows.length
      ? rows.map(r => {
          const id = this._escapeAttr(r.id);
          const title = this._escape(r.title || '(未命名)');
          const titleAttr = this._escapeAttr(r.title || '(未命名)');
          const scope = this._escape(r.scopeCustomerId || '通用');
          const latest = Number.isFinite(+r.latestVersion) ? String(r.latestVersion) : '-';
          const updated = this._escape(this._fmtDate(r.updatedAt));
          return `
            <tr>
              <td><button class="link" type="button" data-action="sops-open-detail" data-id="${id}">${title}</button></td>
              <td class="muted">${this._escape(this._catLabel(r.category))}</td>
              <td class="muted">${scope}</td>
              <td class="muted">${this._escape(latest)}</td>
              <td class="muted">${updated}</td>
              <td style="text-align:center;">
                <button class="btn ghost" type="button" data-action="sops-delete-sop" data-id="${id}" data-title="${titleAttr}" title="刪除此 SOP" style="padding:2px 8px;font-size:13px;color:#c0392b;">🗑️</button>
              </td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="6" class="muted">尚無資料</td></tr>`;

    return `
      <div class="sops-topbar">
        <div>
          <div class="sops-title">SOP</div>
          <div class="muted">管理與查詢（Phase 1：標題 / 標籤 / 摘要）</div>
        </div>
        <button class="btn primary" type="button" data-action="sops-go-new">＋ 新增 SOP</button>
      </div>

      <div class="panel sops-card" style="padding:14px 16px;">
        <div class="sops-row">
          <div class="sops-field">
            <label>類別</label>
            <select class="input" data-action="sops-filter-category" id="sops-filter-category">
              <option value="" ${!cat ? 'selected' : ''}>全部</option>
              <option value="machine" ${cat==='machine' ? 'selected' : ''}>機台</option>
              <option value="part" ${cat==='part' ? 'selected' : ''}>零件</option>
              <option value="repair" ${cat==='repair' ? 'selected' : ''}>維修</option>
              <option value="general" ${cat==='general' ? 'selected' : ''}>通用</option>
            </select>
          </div>
          <div class="sops-field" style="flex:1;min-width:240px;">
            <label>關鍵字（標題/標籤/摘要）</label>
            <input class="input" id="sops-filter-keyword" value="${this._escapeAttr(this.filterKeyword)}" placeholder="pump purge / Parker / install..." />
          </div>
          <div class="sops-field" style="align-self:flex-end;">
            <div style="height:20px"></div>
            <button class="btn" type="button" data-action="sops-apply-filters">搜尋</button>
            <button class="btn ghost" type="button" data-action="sops-clear-filters" style="margin-left:6px;">清除</button>
          </div>
        </div>
      </div>

      <div class="panel sops-card" style="padding:0;">
        <div class="sops-table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>標題</th>
                <th>類別</th>
                <th>適用客戶</th>
                <th>最新版本</th>
                <th>更新</th>
                <th style="width:60px;text-align:center;">操作</th>
              </tr>
            </thead>
            <tbody>
              ${body}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _renderNewView(){
    return `
      <div class="sops-topbar">
        <div>
          <div class="sops-title">新增 SOP</div>
          <div class="muted">先建立主檔，再上傳版本</div>
        </div>
        <button class="btn" type="button" data-action="sops-go-list">返回</button>
      </div>

      <div class="panel sops-card" style="padding:14px 16px;">
        <form data-action="sops-create-sop">
          <div class="sops-row">
            <div class="sops-field" style="flex:1;min-width:240px;">
              <label>標題</label>
              <input class="input" name="title" required placeholder="例如：FlexTRAK 更換 O-ring 作業流程" />
            </div>
            <div class="sops-field" style="min-width:160px;">
              <label>類別</label>
              <select class="input" name="category">
                <option value="machine">機台</option>
                <option value="part">零件</option>
                <option value="repair">維修</option>
                <option value="general" selected>通用</option>
              </select>
            </div>
            <div class="sops-field" style="flex:1;min-width:200px;">
              <label>適用客戶（留空=通用）</label>
              <input class="input" name="scopeCustomerId" placeholder="cust_xxx（可空）" />
            </div>
          </div>

          <div class="sops-row" style="margin-top:12px;">
            <div class="sops-field" style="flex:1;min-width:240px;">
              <label>標籤（逗號分隔）</label>
              <input class="input" name="tags" placeholder="pump, purge, install" />
            </div>
            <div class="sops-field" style="flex:1;min-width:240px;">
              <label>摘要</label>
              <input class="input" name="abstract" placeholder="一句話摘要/適用範圍" />
            </div>
          </div>

          <div style="margin-top:12px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
            <button class="btn ghost" type="button" data-action="sops-go-list">取消</button>
            <button class="btn primary" type="button" data-action="sops-create-sop">建立 SOP</button>
          </div>
        </form>
      </div>
    `;
  }

  _renderDetailView(id){
    const sopId = String(id || '').trim();
    const svc = this._svc();
    const sop = svc?.get ? svc.get(sopId) : null;
    if (!sop) {
      return `
        <div class="sops-topbar">
          <div>
            <div class="sops-title">SOP 詳情</div>
            <div class="muted">找不到 SOP：<code>${this._escape(sopId)}</code></div>
          </div>
          <button class="btn" type="button" data-action="sops-go-list">返回列表</button>
        </div>
      `;
    }

    const latest = Number.isFinite(+sop.latestVersion) ? parseInt(sop.latestVersion, 10) : 0;
    const nextVer = latest + 1;

    const isEdit = !!this._detailEditing;

    const msgHtml = this._detailMsg ? `<span class="muted" style="margin-left:10px;">${this._escape(this._detailMsg)}</span>` : '';

    return `
      <div class="sops-topbar">
        <div>
          <div class="sops-title">SOP 詳情</div>
          <div class="muted">ID：<code>${this._escape(sopId)}</code></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;align-items:center;">
          ${isEdit
            ? `
              <button class="btn ghost" type="button" data-action="sops-cancel-edit">取消</button>
              <button class="btn primary" type="button" data-action="sops-save-edit" data-id="${this._escapeAttr(sopId)}">儲存</button>
            `
            : `
              <button class="btn" type="button" data-action="sops-start-edit" data-id="${this._escapeAttr(sopId)}">編輯</button>
              <button class="btn" type="button" data-action="sops-delete-sop" data-id="${this._escapeAttr(sopId)}" data-title="${this._escapeAttr(sop.title || '')}" style="color:#c0392b;">🗑️ 刪除</button>
            `
          }
          <button class="btn" type="button" data-action="sops-go-list">返回列表</button>
        </div>
      </div>

      <div class="panel sops-card" style="padding:14px 16px;">
        <form id="sops-detail-form" data-sop-id="${this._escapeAttr(sopId)}">
          <div class="sops-row">
            <div class="sops-field" style="flex:1;min-width:240px;">
              <label>標題</label>
              <input class="input" name="title" value="${this._escapeAttr(sop.title || '')}" ${isEdit ? '' : 'disabled'} />
            </div>
            <div class="sops-field" style="min-width:160px;">
              <label>類別</label>
              ${isEdit ? `
                <select class="input" name="category">
                  <option value="machine" ${String(sop.category||'')==='machine'?'selected':''}>機台</option>
                  <option value="part" ${String(sop.category||'')==='part'?'selected':''}>零件</option>
                  <option value="repair" ${String(sop.category||'')==='repair'?'selected':''}>維修</option>
                  <option value="general" ${(!sop.category || String(sop.category)==='general')?'selected':''}>通用</option>
                </select>
              ` : `
                <input class="input" value="${this._escapeAttr(this._catLabel(sop.category))}" disabled />
              `}
            </div>
            <div class="sops-field" style="flex:1;min-width:200px;">
              <label>適用客戶</label>
              <input class="input" name="scopeCustomerId" value="${this._escapeAttr(isEdit ? (sop.scopeCustomerId || '') : (sop.scopeCustomerId || '通用'))}" placeholder="（留空=通用）" ${isEdit ? '' : 'disabled'} />
            </div>
          </div>
          <div class="sops-row" style="margin-top:12px;">
            <div class="sops-field" style="flex:1;min-width:240px;">
              <label>標籤</label>
              <input class="input" name="tags" value="${this._escapeAttr((sop.tags || []).join(', '))}" ${isEdit ? '' : 'disabled'} />
            </div>
            <div class="sops-field" style="flex:1;min-width:240px;">
              <label>摘要</label>
              <input class="input" name="abstract" value="${this._escapeAttr(sop.abstract || '')}" ${isEdit ? '' : 'disabled'} />
            </div>
          </div>
          ${isEdit ? `<div class="muted" style="margin-top:10px;font-size:12px;">編輯完成後按右上角「儲存」。</div>` : ''}
        </form>
      </div>

      <div class="panel sops-card" style="padding:14px 16px;">
        <div style="font-weight:800;margin-bottom:8px;">上傳新版本</div>
        <form data-action="sops-upload-version" data-sop-id="${this._escapeAttr(sopId)}">
          <div class="sops-row">
            <div class="sops-field" style="flex:1;min-width:260px;">
              <label>選擇檔案（建議單檔 &lt; 8MB）</label>
              <input class="input" name="file" type="file" />
            </div>
            <div class="sops-field" style="flex:1;min-width:260px;">
              <label>變更說明（可空）</label>
              <input class="input" name="changeLog" placeholder="例如：新增安全檢查步驟" />
            </div>
          </div>

          <details class="sops-advanced" style="margin-top:10px;">
            <summary>進階：手動貼上 WebViewLink（無法上傳時使用）</summary>
            <div class="sops-row" style="margin-top:10px;">
              <div class="sops-field" style="flex:1;min-width:260px;">
                <label>WebViewLink</label>
                <input class="input" name="webViewLink" placeholder="https://drive.google.com/file/d/.../view" />
              </div>
            </div>
            <div class="muted" style="margin-top:6px;font-size:12px;line-height:1.5;">
              若未選檔案，系統將以此連結建立版本（不會執行上傳）。
            </div>
          </details>

          <div class="muted" style="margin-top:10px;font-size:12px;line-height:1.5;">
            上傳模式：使用 Apps Script Web App 將檔案上傳到 My Drive（資料夾規則：OrderSOPHub/SOP/{category}）。
            若要使用上傳，請在 <code>core/config.js</code> 設定 <code>AppConfig.integration.gas.uploadUrl</code> 與 <code>token</code>。
          </div>

          <div style="margin-top:12px;display:flex;gap:10px;justify-content:flex-end;align-items:center;flex-wrap:wrap;">
            <button class="btn primary" type="button" data-action="sops-upload-version">上傳 V${this._escapeAttr(nextVer)}</button>
            ${msgHtml}
          </div>
        </form>
      </div>

      <div class="panel sops-card" style="padding:14px 16px;">
        <div style="font-weight:800;margin-bottom:8px;">版本列表</div>
        <div id="sops-versions-wrap" class="muted">載入中…</div>
      </div>
    `;
  }

  async _refreshDetailAsync(sopId){
    const sid = String(sopId || '').trim();
    if (!sid) return;
    // 若使用者已切換到其他 SOP 或離開 detail，避免覆寫
    const viewAtStart = this.view;
    const sidAtStart = this.currentSopId;

    const svc = this._svc();
    if (!svc || typeof svc.listVersions !== 'function') return;

    let list = [];
    try { list = await svc.listVersions(sid, { forceReload: true }); }
    catch (_) { list = []; }

    if (this.view !== viewAtStart || this.currentSopId !== sidAtStart || this.currentSopId !== sid) return;

    const wrap = document.getElementById('sops-versions-wrap');
    if (!wrap) return;

    if (!list.length) {
      wrap.innerHTML = '<div class="muted">尚無版本</div>';
      return;
    }

    const rows = list.map(v => {
      const ver = Number.isFinite(+v.version) ? v.version : 0;
      const ch = this._escape(v.changeLog || '-');
      const link = String(v.driveWebViewLink || '').trim();
      const a = link ? `<a href="${this._escapeAttr(link)}" target="_blank" rel="noreferrer">開啟</a>` : '-';
      return `<tr><td>V${this._escape(ver)}</td><td class="muted">${ch}</td><td>${a}</td></tr>`;
    }).join('');

    wrap.innerHTML = `
      <div class="sops-table-wrap">
        <table class="table">
          <thead><tr><th>版本</th><th>變更</th><th>連結</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // =============================
  // Actions
  // =============================

  startEdit(){
    if (this.view !== 'detail') return;
    this._detailEditing = true;
    this._renderCurrent();
  }

  cancelEdit(){
    if (this.view !== 'detail') return;
    this._detailEditing = false;
    this._detailMsg = '';
    this._renderCurrent();
  }

  async saveEdit(form){
    if (this.view !== 'detail') return;
    const svc = this._svc();
    if (!svc || typeof svc.patchSop !== 'function') return this._toast('SOPService 未載入', 'error');

    const f = form || document.getElementById('sops-detail-form');
    if (!f) return;
    const sopId = String(f.getAttribute('data-sop-id') || this.currentSopId || '').trim();
    if (!sopId) return this._toast('缺少 sopId', 'error');

    const fd = new FormData(f);
    const title = String(fd.get('title') || '').trim();
    if (!title) return this._toast('標題不可為空', 'warning');

    const patch = {
      title,
      category: String(fd.get('category') || 'general').trim(),
      scopeCustomerId: String(fd.get('scopeCustomerId') || '').trim() || null,
      tags: String(fd.get('tags') || '').trim(),
      abstract: String(fd.get('abstract') || '').trim() || null
    };

    try {
      await svc.patchSop(sopId, patch);
      this._toast('已儲存 SOP 主檔', 'success');
      this._detailEditing = false;
      this._renderCurrent();
    } catch (e) {
      this._toast(e?.message || '儲存失敗', 'error');
    }
  }

  applyFilters(){
    try {
      const cat = document.getElementById('sops-filter-category');
      const kw = document.getElementById('sops-filter-keyword');
      this.filterCategory = cat ? String(cat.value || '') : '';
      this.filterKeyword = kw ? String(kw.value || '') : '';
    } catch (_) {}
    this._renderCurrent();
  }

  clearFilters(){
    this.filterCategory = '';
    this.filterKeyword = '';
    this._renderCurrent();
  }

  async createSop(form){
    const svc = this._svc();
    if (!svc || typeof svc.upsertSop !== 'function') return this._toast('SOPService 未載入', 'error');

    const fd = new FormData(form);
    const title = String(fd.get('title') || '').trim();
    if (!title) return this._toast('標題不可為空', 'warning');

    const payload = {
      title,
      category: String(fd.get('category') || 'general').trim(),
      scopeCustomerId: String(fd.get('scopeCustomerId') || '').trim() || null,
      tags: String(fd.get('tags') || '').trim(),
      abstract: String(fd.get('abstract') || '').trim() || null,
      latestVersion: 0,
      updatedAt: new Date().toISOString()
    };

    try {
      const sop = await svc.upsertSop(payload);
      this._toast('已建立 SOP', 'success');
      this.goDetail(sop?.id);
    } catch (e) {
      this._toast(e?.message || '建立失敗', 'error');
    }
  }

  async deleteSop(id, title){
    const sopId = String(id || '').trim();
    if (!sopId) return;

    const label = String(title || sopId);
    const confirmed = window.confirm(`確定要刪除 SOP「${label}」嗎？\n\n刪除後將從列表移除，此動作無法復原。`);
    if (!confirmed) return;

    const svc = this._svc();
    if (!svc || typeof svc.removeSop !== 'function') return this._toast('SOPService 未載入', 'error');

    try {
      await svc.removeSop(sopId);
      this._toast(`已刪除 SOP：${label}`, 'success');
      this.goList();
    } catch (e) {
      this._toast(e?.message || '刪除失敗', 'error');
    }
  }

  async uploadVersion(form){
    const svc = this._svc();
    if (!svc || typeof svc.addVersion !== 'function') return this._toast('SOPService 未載入', 'error');

    const sopId = String(form.getAttribute('data-sop-id') || '').trim();
    if (!sopId) return this._toast('缺少 sopId', 'error');

    const sop = svc.get ? svc.get(sopId) : null;
    if (!sop) return this._toast('找不到 SOP', 'warning');

    const fd = new FormData(form);
    const file = fd.get('file');
    const changeLog = String(fd.get('changeLog') || '').trim();
    const webViewLinkManual = String(fd.get('webViewLink') || '').trim();

    const latest = Number.isFinite(+sop.latestVersion) ? parseInt(sop.latestVersion, 10) : 0;
    const ver = latest + 1;

    try {
      let uploadRes = null;
      if (file && typeof File !== 'undefined' && file instanceof File && file.size > 0) {
        uploadRes = await this._uploadViaGAS({ category: String(sop.category || 'general'), file });
      }

      const driveWebViewLink = uploadRes?.webViewLink || webViewLinkManual;
      const driveFileId = uploadRes?.driveFileId || '';
      if (!driveWebViewLink) throw new Error('請先選擇檔案上傳，或在「進階」貼上 WebViewLink');

      await svc.addVersion(sopId, {
        version: ver,
        driveFileId,
        driveWebViewLink,
        fileName: uploadRes?.name || ((file instanceof File) ? (file.name || '') : ''),
        mimeType: uploadRes ? ((file instanceof File) ? (file.type || '') : '') : '',
        changeLog
      });

      this._detailMsg = `上傳完成：V${ver}`;
      this._toast('已儲存版本', 'success');
      this._renderCurrent();
      this._refreshDetailAsync(sopId);
    } catch (e) {
      this._toast(e?.message || '上傳失敗', 'error');
    }
  }

  // =============================
  // GAS Upload (OrderSOPHub Phase 1 compatible)
  // =============================

  _gasConfig(){
    const url = String(AppConfig?.integration?.gas?.uploadUrl || '').trim();
    const proxyUrl = String(AppConfig?.integration?.gas?.proxyUrl || '').trim();
    const token = String(AppConfig?.integration?.gas?.token || '').trim();
    return { url, proxyUrl, token };
  }

  async _readFileBase64(file){
    return await new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('讀取檔案失敗'));
        reader.onload = () => {
          const result = String(reader.result || '');
          const idx = result.indexOf(',');
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  async _uploadViaGAS({ category, file }){
    const { url, proxyUrl, token } = this._gasConfig();
    if (!url || !token) {
      throw new Error('尚未設定 GAS 上傳參數（請在 core/config.js 設定 AppConfig.integration.gas.uploadUrl / token）');
    }

    const catMap = { machine:'Machine', part:'Part', repair:'Repair', general:'General' };
    const folder = catMap[String(category||'general')] || 'General';
    const path = `SOP/${folder}`;
    const base64 = await this._readFileBase64(file);

    // Apps Script Web App 直接從瀏覽器 fetch 會被 CORS 擋（無法回傳 Access-Control-Allow-Origin）。
    // 解法：改走 proxy（本機/伺服器端）轉送，再由 proxy 回傳 JSON。
    const endpoint = proxyUrl || url;
    const payload = { token, path, filename: file.name, mimeType: file.type || 'application/octet-stream', base64 };
    const body = proxyUrl ? JSON.stringify({ uploadUrl: url, ...payload }) : JSON.stringify(payload);

    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
    } catch (e) {
      const msg = String(e?.message || e || '');
      // CORS/網路錯誤通常會是 TypeError: Failed to fetch
      if (!proxyUrl) {
        throw new Error('Apps Script 上傳被瀏覽器 CORS 限制擋下：請改用「CORS 代理」\n\n作法：在 core/config.js 設定 AppConfig.integration.gas.proxyUrl，並啟動 tools/sop_upload_proxy/server.js');
      }
      throw new Error(`上傳失敗（Proxy 無法連線）：${msg || '請確認 proxyUrl 是否啟動'}`);
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      const msg = data?.error ? String(data.error) : `HTTP ${res.status}`;
      if (!proxyUrl) {
        // 大多數情況：CORS preflight 直接被瀏覽器擋下，這裡可能拿不到 data
        throw new Error(`Apps Script 上傳失敗：${msg}\n\n提示：若 Console 出現 CORS blocked，請改用 proxyUrl（tools/sop_upload_proxy）。`);
      }
      throw new Error(`上傳失敗（Proxy → Apps Script）：${msg}`);
    }
    return data;
  }

  // =============================
  // Delegation
  // =============================

  _bindDelegation(root){
    // 注意：主容器可能在初始化後被其他模組重繪（例如 Settings/Theme 套用），
    // 若事件綁在 root 會失效。SOP Hub 改採 document 層級事件委派：
    // - 僅當畫面存在 #sops-page 且命中 data-action / form[data-action] 才處理
    this._delegationRoot = root || null;
    this._bindGlobalDelegation();
  }

  _bindGlobalDelegation(){
    if (this._globalBound) return;
    this._globalBound = true;

    const getRoot = () => {
      try { return document.getElementById('sops-page'); } catch (_) { return null; }
    };

    this._onDocClick = (ev) => {
      try {
        const root = getRoot();
        if (!root) return;
        const el = ev?.target?.closest?.('[data-action]');
        if (!el || !root.contains(el)) return;

        // ⚠️ 重要：避免點擊表單內任意 input/select 時，因 form 本身帶 data-action 而誤觸發 create/upload。
        // 表單行為僅由：
        // 1) 具體按鈕（button[data-action]）的 click
        // 2) form submit（Enter/原生 submit）
        // 來觸發。
        if (String(el.tagName || '').toUpperCase() === 'FORM') return;

        const act = String(el.getAttribute('data-action') || '');
        const id = String(el.getAttribute('data-id') || '');
        if (!act) return;

        // 只處理 SOP Hub 自己的 action
        if (!act.startsWith('sops-')) return;
        try { ev.preventDefault(); } catch (_) {}

        if (act === 'sops-go-new') return this.goNew();
        if (act === 'sops-go-list') return this.goList();
        if (act === 'sops-open-detail') return this.goDetail(id);

        if (act === 'sops-start-edit') return this.startEdit();
        if (act === 'sops-cancel-edit') return this.cancelEdit();
        if (act === 'sops-save-edit') {
          const form = document.getElementById('sops-detail-form') || el.closest('form');
          if (form) { this.saveEdit(form); }
          return;
        }

        if (act === 'sops-apply-filters') return this.applyFilters();
        if (act === 'sops-clear-filters') return this.clearFilters();

        if (act === 'sops-delete-sop') {
          const title = String(el.getAttribute('data-title') || '');
          return this.deleteSop(id, title);
        }

        // 重要：避免 submit 被其他模組攔截（stopImmediatePropagation），改以 click action 觸發
        if (act === 'sops-create-sop') {
          const form = el.closest('form');
          if (form) { this.createSop(form); }
          return;
        }
        if (act === 'sops-upload-version') {
          const form = el.closest('form');
          if (form) { this.uploadVersion(form); }
          return;
        }
      } catch (e) {
        console.warn('SOPUI click failed:', e);
      }
    };

    this._onDocKeydown = (ev) => {
      try {
        const root = getRoot();
        if (!root) return;
        const t = ev?.target;
        if (!t || !root.contains(t)) return;
        if (t.id === 'sops-filter-keyword' && (ev.key === 'Enter' || ev.keyCode === 13)) {
          try { ev.preventDefault(); } catch (_) {}
          this.applyFilters();
        }
      } catch (_) {}
    };

    this._onDocSubmit = async (ev) => {
      try {
        const root = getRoot();
        if (!root) return;
        const form = ev?.target;
        if (!form || !root.contains(form)) return;
        const act = String(form.getAttribute('data-action') || '');
        if (!act) return;
        if (!act.startsWith('sops-')) return;

        try { ev.preventDefault(); } catch (_) {}
        if (act === 'sops-create-sop') return await this.createSop(form);
        if (act === 'sops-upload-version') return await this.uploadVersion(form);
      } catch (e) {
        console.warn('SOPUI submit failed:', e);
      }
    };

    // capture=true：即使其他地方 stopPropagation，也能先攔到
    document.addEventListener('click', this._onDocClick, true);
    document.addEventListener('keydown', this._onDocKeydown, true);
    document.addEventListener('submit', this._onDocSubmit, true);
  }
}

// 建立全域實例
const sopUI = new SOPUI();
if (typeof window !== 'undefined') {
  window.sopUI = sopUI;
  try { window.AppRegistry?.register?.('sopUI', sopUI); } catch (_) {}
}

try { console.log('✅ SOPUI loaded'); } catch (_) {}
