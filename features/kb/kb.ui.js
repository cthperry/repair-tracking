/**
 * 知識庫（KB）- UI
 * KB-1（MVP）
 */

class KBUI {
  constructor(){
    this.type = 'faq'; // faq | failure | sop | case
    this.searchText = '';
    this.selectedTags = new Set();
    this._renderedContainerId = '';

    // 效能：避免每個 key stroke 都全量重繪
    this.searchDebounce = null;
    this._renderToken = 0;
  }

  _typeMeta(t){
    const key = (t || this.type || 'faq').toString();
    const map = {
      faq:    { key:'faq',    label:'FAQ',       icon:'❓' },
      failure: { key:'failure', label:'故障模式',  icon:'⚠️' },
      sop:    { key:'sop',    label:'SOP',       icon:'🧾' },
      case:   { key:'case',   label:'維修案例',  icon:'🧩' },
    };
    return map[key] || map.faq;
  }

  _escape(s){
    try { return (window.StringUtils?.escapeHTML ? window.StringUtils.escapeHTML(s) : String(s||'')); } catch (_) { return String(s||''); }
  }

  _getService(){
    return (typeof window._svc === 'function') ? window._svc('KBService') : window.KBService;
  }

  render(containerId = 'main-content'){
    this._renderedContainerId = containerId;
    const host = document.getElementById(containerId);
    if (!host) return;

    host.innerHTML = `
      <div class="kb-module" style="display:flex;flex-direction:column;gap:12px;">
        <div class="module-toolbar">
          <div class="module-toolbar-left" style="min-width:0">
            <div style="font-weight:900;white-space:nowrap;">📚 知識庫</div>
            <div class="badge" style="margin-left:8px;">KB-1</div>
            <div class="muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">FAQ / 故障模式 / SOP / 案例</div>
          </div>
          <div class="module-toolbar-right">
            <input id="kb-search" class="input" style="max-width:360px" placeholder="搜尋：關鍵字 / Tag / 設備 / 料號..." oninput="KBUI.handleSearch(event)" />
            <button class="btn primary" onclick="KBUI.openCreate()">＋ 新增</button>
          </div>
        </div>

        <div class="panel" style="padding:14px 16px;">
          <div class="chip-row" id="kb-type-chips"></div>
          <div style="height:10px"></div>
          <div class="chip-row" id="kb-tag-chips"></div>
        </div>

        <div id="kb-list" class="card-list"></div>

        <div id="kb-modal" class="modal" style="display:none;">
          <div class="modal-backdrop" onclick="KBUI.closeModal()"></div>
          <div class="modal-content" id="kb-modal-content"></div>
        </div>
      </div>
    `;

    this._renderTypeChips();
    this._renderTagChips();
    this.updateList();

    // 即時更新（服務端更新 / 其他模組觸發）
    try {
      if (!this._bound) {
        this._bound = true;
        window.addEventListener('data:changed', (ev) => {
          const m = ev?.detail?.module;
          if (m === 'kb') {
            this._renderTagChips();
            this.updateList();
          }
        });
      }
    } catch (_) {}
  }

  _renderTypeChips(){
    const el = document.getElementById('kb-type-chips');
    if (!el) return;
    const types = ['faq','failure','sop','case'];
    el.innerHTML = types.map(t => {
      const meta = this._typeMeta(t);
      const active = (this.type === t) ? 'active' : '';
      return `<button class="chip ${active}" onclick="KBUI.setType('${meta.key}')">${meta.icon} ${meta.label}</button>`;
    }).join('');
  }

  _renderTagChips(){
    const el = document.getElementById('kb-tag-chips');
    if (!el) return;
    const svc = this._getService();
    const tags = (svc && typeof svc.getTags === 'function') ? svc.getTags(this.type) : [];

    const chips = [];
    const allActive = (this.selectedTags.size === 0);
    chips.push(`<button class="chip ${allActive ? 'active' : ''}" onclick="KBUI.clearTags()">🏷️ 全部</button>`);

    for (const t of tags) {
      const a = this.selectedTags.has(t) ? 'active' : '';
      chips.push(`<button class="chip ${a}" onclick="KBUI.toggleTag('${this._escape(t)}')">${this._escape(t)}</button>`);
    }

    el.innerHTML = chips.join('');
  }

  setType(t){
    const key = (t || 'faq').toString();
    if (this.type === key) return;
    this.type = key;
    this.selectedTags.clear();
    this._renderTypeChips();
    this._renderTagChips();
    this.updateList();
  }

  handleSearch(ev){
    const v = (ev?.target?.value || '').toString();
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.searchText = v;
      this.updateList();
    }, 120);
  }

  toggleTag(tag){
    const t = (tag || '').toString();
    if (!t) return;
    if (this.selectedTags.has(t)) this.selectedTags.delete(t);
    else this.selectedTags.add(t);
    this._renderTagChips();
    this.updateList();
  }

  clearTags(){
    this.selectedTags.clear();
    this._renderTagChips();
    this.updateList();
  }

  _match(item){
    const q = (this.searchText || '').toString().trim().toLowerCase();
    if (q) {
      const hay = ((item && item._search) ? String(item._search) : '').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (this.selectedTags.size > 0) {
      const tags = Array.isArray(item?.tags) ? item.tags : [];
      for (const t of this.selectedTags) {
        if (!tags.includes(t)) return false;
      }
    }

    return true;
  }

  updateList(){
    const listEl = document.getElementById('kb-list');
    if (!listEl) return;

    const token = ++this._renderToken;

    const svc = this._getService();
    const all = (svc && typeof svc.getAll === 'function') ? svc.getAll(this.type) : [];
    const data = (all || []).filter(it => it && this._match(it));

    if (!data || data.length === 0) {
      listEl.innerHTML = `<div class="panel compact" style="padding:14px 16px;color:var(--color-text-secondary);">沒有符合條件的資料。</div>`;
      return;
    }

    // 效能：大量卡片採分段渲染，避免一次性 innerHTML 大字串造成卡頓
    const CHUNK = 60;
    if (data.length <= CHUNK) {
      listEl.innerHTML = data.map(it => this._renderCard(it)).join('');
      return;
    }

    const first = data.slice(0, CHUNK).map(it => this._renderCard(it)).join('');
    listEl.innerHTML = first;

    const rest = data.slice(CHUNK);
    const renderMore = (startIdx = 0) => {
      if (token !== this._renderToken) return; // 已有新查詢/切換
      const slice = rest.slice(startIdx, startIdx + CHUNK);
      if (!slice.length) return;
      listEl.insertAdjacentHTML('beforeend', slice.map(it => this._renderCard(it)).join(''));
      const next = startIdx + CHUNK;
      if (next < rest.length) {
        // requestIdleCallback 優先；沒有就用 setTimeout
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(() => renderMore(next), { timeout: 600 });
        } else {
          setTimeout(() => renderMore(next), 0);
        }
      }
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => renderMore(0), { timeout: 600 });
    } else {
      setTimeout(() => renderMore(0), 0);
    }
  }

  _renderCard(it){
    const meta = this._typeMeta(this.type);
    const title = this._escape(it.title || it.question || it.symptom || it.name || '');
    const updatedAt = this._escape((it.updatedAt || '').toString().replace('T',' ').slice(0,19));
    const tags = Array.isArray(it.tags) ? it.tags.slice(0,4) : [];

    const summary = this._escape(it.summary || it.answer || it.actions || it.steps || it.solution || it.notes || '');
    const brief = summary.length > 160 ? (summary.slice(0,160) + '…') : summary;

    const badges = tags.map(t => `<span class="badge" style="--badge-color: var(--module-accent)">${this._escape(t)}</span>`).join('');

    return `
      <div class="card">
        <div class="card-body" style="padding:14px 16px;display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <div class="badge" title="類型">${meta.icon} ${meta.label}</div>
            <div style="min-width:0;flex:1;">
              <div style="font-weight:900;font-size:14px;line-height:1.35;word-break:break-word;">${title}</div>
              <div class="muted" style="margin-top:4px;">更新：${updatedAt || '-'}</div>
            </div>
          </div>
          ${badges ? `<div style="display:flex;flex-wrap:wrap;gap:8px;">${badges}</div>` : ''}
          ${brief ? `<div style="color:var(--color-text-secondary);line-height:1.5;word-break:break-word;">${brief}</div>` : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            <button class="btn sm" onclick="KBUI.openView('${this._escape(it.id)}')">開啟</button>
            <button class="btn sm ghost" onclick="KBUI.openEdit('${this._escape(it.id)}')">編輯</button>
            <button class="btn sm danger" onclick="KBUI.remove('${this._escape(it.id)}')">刪除</button>
          </div>
        </div>
      </div>
    `;
  }

  _modalHost(){
    return document.getElementById('kb-modal');
  }

  openModal(html){
    const modal = this._modalHost();
    const content = document.getElementById('kb-modal-content');
    if (!modal || !content) return;
    content.innerHTML = html;
    modal.style.display = '';
  }

  closeModal(){
    const modal = this._modalHost();
    const content = document.getElementById('kb-modal-content');
    if (content) content.innerHTML = '';
    if (modal) modal.style.display = 'none';
  }

  _find(id){
    const svc = this._getService();
    if (!svc || typeof svc.getAll !== 'function') return null;
    const all = svc.getAll(this.type) || [];
    return all.find(x => String(x.id) === String(id)) || null;
  }

  openCreate(){
    const meta = this._typeMeta(this.type);
    const html = this._renderForm({ mode:'create', meta });
    this.openModal(html);
    this._bindForm('create', null);
  }

  openEdit(id){
    const item = this._find(id);
    if (!item) {
      window.UI?.toast?.('找不到資料', { type: 'warning' });
      return;
    }
    const meta = this._typeMeta(this.type);
    const html = this._renderForm({ mode:'edit', meta, item });
    this.openModal(html);
    this._bindForm('edit', item);
  }

  openView(id){
    const item = this._find(id);
    if (!item) {
      window.UI?.toast?.('找不到資料', { type: 'warning' });
      return;
    }
    const meta = this._typeMeta(this.type);
    this.openModal(this._renderView({ meta, item }));
  }

  _renderView({ meta, item }){
    const esc = (s) => this._escape(s);
    const t = esc(item.title || item.question || item.symptom || '');
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const tagsHtml = tags.map(x => `<span class="badge">${esc(x)}</span>`).join('');

    // body：依 type 顯示
    const lines = [];
    if (this.type === 'faq') {
      lines.push({ label:'問題', value: item.question });
      lines.push({ label:'解答', value: item.answer });
    } else if (this.type === 'failure') {
      lines.push({ label:'症狀', value: item.symptom });
      lines.push({ label:'故障模式', value: item.failureMode });
      lines.push({ label:'診斷', value: item.diagnostics });
      lines.push({ label:'處置/修復', value: item.actions });
    } else if (this.type === 'sop') {
      lines.push({ label:'目的/說明', value: item.summary });
      lines.push({ label:'步驟', value: item.steps });
      lines.push({ label:'注意事項', value: item.notes });
    } else {
      lines.push({ label:'問題描述', value: item.problem });
      lines.push({ label:'根因', value: item.rootCause });
      lines.push({ label:'處置/結論', value: item.solution });
      lines.push({ label:'備註', value: item.notes });
    }

    const body = lines
      .filter(x => (x && (x.value || '').toString().trim()))
      .map(x => `
        <div class="form-section" style="margin-bottom:12px;">
          <div class="form-section-title">${esc(x.label)}</div>
          <div style="white-space:pre-wrap;line-height:1.6;word-break:break-word;">${esc(x.value || '')}</div>
        </div>
      `).join('');

    return `
      <div class="modal-header">
        <div>
          <h3>${meta.icon} ${meta.label} · 檢視</h3>
          <div class="muted" style="margin-top:6px;">${t || '-'}</div>
        </div>
        <button class="modal-close" onclick="KBUI.closeModal()">×</button>
      </div>
      <div class="modal-body">
        ${tagsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">${tagsHtml}</div>` : ''}
        ${body || `<div class="muted">無內容</div>`}
      </div>
      <div class="modal-footer">
        <button class="btn ghost" onclick="KBUI.closeModal()">關閉</button>
        <button class="btn primary" onclick="KBUI.openEdit('${esc(item.id)}')">編輯</button>
      </div>
    `;
  }

  _renderForm({ mode, meta, item }){
    const it = item || {};
    const esc = (s) => this._escape(s);
    const title = esc(it.title || it.question || it.symptom || '');
    const tags = esc((Array.isArray(it.tags) ? it.tags.join(', ') : (it.tagsText || '')));

    const isEdit = mode === 'edit';
    const hid = isEdit ? `<input type="hidden" name="id" value="${esc(it.id)}" />` : '';

    const field = (label, name, value, opts = {}) => {
      const req = opts.required ? 'required' : '';
      const reqMark = opts.required ? 'required' : '';
      const ph = esc(opts.placeholder || '');
      const t = opts.type || 'text';
      return `
        <div class="field">
          <label class="required">${esc(label)}</label>
          <input class="input" name="${esc(name)}" ${req} ${reqMark} placeholder="${ph}" value="${esc(value || '')}" />
        </div>
      `;
    };

    const textarea = (label, name, value, opts = {}) => {
      const req = opts.required ? 'required' : '';
      const reqMark = opts.required ? 'required' : '';
      const ph = esc(opts.placeholder || '');
      const rows = Number(opts.rows || 6);
      return `
        <div class="field">
          <label class="${opts.required ? 'required' : ''}">${esc(label)}</label>
          <textarea class="input" name="${esc(name)}" ${req} ${reqMark} rows="${rows}" placeholder="${ph}">${esc(value || '')}</textarea>
        </div>
      `;
    };

    let bodyFields = '';
    if (this.type === 'faq') {
      bodyFields = `
        <div class="form-grid">
          ${field('問題', 'question', it.question, { required:true, placeholder:'例如：Loader 無法上電？' })}
          ${field('標題（可選）', 'title', it.title, { required:false, placeholder:'例如：Power On 失敗' })}
        </div>
        ${textarea('解答', 'answer', it.answer, { required:true, rows:8, placeholder:'請輸入解答/處置方式' })}
      `;
    } else if (this.type === 'failure') {
      bodyFields = `
        <div class="form-grid">
          ${field('症狀', 'symptom', it.symptom, { required:true, placeholder:'例如：RF 打不出 / Pressure not stable' })}
          ${field('故障模式', 'failureMode', it.failureMode, { required:false, placeholder:'例如：Power Supply 故障' })}
        </div>
        ${textarea('診斷', 'diagnostics', it.diagnostics, { required:false, rows:6, placeholder:'量測點/Log/判斷依據' })}
        ${textarea('處置/修復', 'actions', it.actions, { required:true, rows:7, placeholder:'實際修復步驟與結果' })}
      `;
    } else if (this.type === 'sop') {
      bodyFields = `
        ${field('標題', 'title', it.title, { required:true, placeholder:'例如：更換 MFC 校正流程' })}
        ${textarea('目的/說明', 'summary', it.summary, { required:false, rows:4, placeholder:'SOP 範圍與注意事項' })}
        ${textarea('步驟（每行一段）', 'steps', it.steps, { required:true, rows:10, placeholder:'1) ...\n2) ...\n3) ...' })}
        ${textarea('注意事項/檢查點', 'notes', it.notes, { required:false, rows:6, placeholder:'安全/ESD/清潔/驗證條件' })}
      `;
    } else {
      bodyFields = `
        ${field('標題', 'title', it.title, { required:true, placeholder:'例如：ASEK21 - FlexTRAK 27V PS 故障' })}
        ${textarea('問題描述', 'problem', it.problem, { required:true, rows:6, placeholder:'客訴/現象/條件' })}
        ${textarea('根因', 'rootCause', it.rootCause, { required:false, rows:4, placeholder:'根因分析/證據' })}
        ${textarea('處置/結論', 'solution', it.solution, { required:true, rows:6, placeholder:'更換/調整/驗證結果' })}
        ${textarea('備註', 'notes', it.notes, { required:false, rows:5, placeholder:'零件、照片、檔案連結、注意事項' })}
      `;
    }

    return `
      <div class="modal-header">
        <div>
          <h3>${meta.icon} ${meta.label} · ${mode === 'edit' ? '編輯' : '新增'}</h3>
          <div class="muted" style="margin-top:6px;">必填欄位會即時顯示紅色提示</div>
        </div>
        <button class="modal-close" onclick="KBUI.closeModal()">×</button>
      </div>
      <div class="modal-body">
        <form id="kb-form" autocomplete="off">
          ${hid}
          <div class="form-section">
            <div class="form-section-title">基本資訊</div>
            <div class="form-grid">
              <div class="field">
                <label>Tags（以逗號分隔）</label>
                <input class="input" name="tags" placeholder="例如：FlexTRAK, Power, 27V" value="${tags}" />
                <div class="help-text">用於快速篩選與搜尋</div>
              </div>
              <div class="field">
                <label>摘要（可選）</label>
                <input class="input" name="summary" placeholder="一句話摘要" value="${esc(it.summary || '')}" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-title">內容</div>
            ${bodyFields}
          </div>

          <div class="form-section">
            <div class="form-section-title">關聯（可選）</div>
            <div class="form-grid three">
              ${field('設備/產品線', 'equipment', it.equipment, { required:false, placeholder:'例如：FlexTRAK-S' })}
              ${field('機型/模組', 'model', it.model, { required:false, placeholder:'例如：CCP / Downstream' })}
              ${field('料號/零件', 'partNo', it.partNo, { required:false, placeholder:'例如：Parker 601XF' })}
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn ghost" onclick="KBUI.closeModal()">取消</button>
        <button class="btn primary" id="kb-save-btn">${mode === 'edit' ? '儲存' : '建立'}</button>
      </div>
    `;
  }

  _bindForm(mode, item){
    const form = document.getElementById('kb-form');
    const btn = document.getElementById('kb-save-btn');
    if (!form || !btn) return;

    try { window.FormValidate?.bindForm?.(form); } catch (_) {}

    btn.onclick = async (e) => {
      e.preventDefault();
      try {
        const ok = window.FormValidate?.validateForm ? window.FormValidate.validateForm(form) : true;
        if (!ok) return;

        const fd = new FormData(form);
        const payload = {};
        fd.forEach((v,k) => { payload[k] = (v === null || v === undefined) ? '' : String(v); });

        // normalize: tags
        payload.tags = payload.tags || '';

        const svc = this._getService();
        if (!svc) throw new Error('KBService not found');

        const id = (mode === 'edit') ? (payload.id || item?.id) : '';
        if (id) payload.id = id;

        await svc.upsert(this.type, payload);

        window.UI?.toast?.(mode === 'edit' ? '已儲存' : '已建立', { type: 'success' });
        this.closeModal();
        this._renderTagChips();
        this.updateList();
      } catch (err) {
        console.error(err);
        window.ErrorHandler?.log?.('HIGH', 'KBUI', 'Save failed', { error: err });
        window.UI?.toast?.('儲存失敗，請稍後再試', { type: 'error' });
      }
    };
  }

  async remove(id){
    const rid = (id || '').toString();
    if (!rid) return;

    const ok = await (window.UI?.confirm ? window.UI.confirm({
      title: '刪除確認',
      message: '確定要刪除這筆知識庫資料？此動作無法復原。',
      okText: '刪除',
      cancelText: '取消',
      tone: 'danger'
    }) : Promise.resolve(window.confirm('確定刪除？')));

    if (!ok) return;

    try {
      const svc = this._getService();
      if (!svc) throw new Error('KBService not found');
      await svc.remove(this.type, rid);
      window.UI?.toast?.('已刪除', { type: 'success' });
      this._renderTagChips();
      this.updateList();
    } catch (err) {
      console.error(err);
      window.ErrorHandler?.log?.('HIGH', 'KBUI', 'Remove failed', { error: err });
      window.UI?.toast?.('刪除失敗', { type: 'error' });
    }
  }
}

const kbUI = new KBUI();
if (typeof window !== 'undefined') {
  window.kbUI = kbUI;
  try { window.AppRegistry?.register?.('KBUI', kbUI); } catch (_) {}
}

// Inline event handlers（onclick/oninput）在瀏覽器會以 Global Lexical Binding 的 KBUI class 解析，
// 因此需提供 static wrapper 轉呼叫 singleton instance（window.kbUI）。
Object.assign(KBUI, {
  render(containerId = 'main-content') {
    try { window.kbUI?.render?.(containerId); } catch (e) { console.error(e); }
  },

  setType(t) {
    try { window.kbUI?.setType?.(t); } catch (e) { console.error(e); }
  },

  handleSearch(ev) {
    try { window.kbUI?.handleSearch?.(ev); } catch (e) { console.error(e); }
  },

  toggleTag(tag) {
    try { window.kbUI?.toggleTag?.(tag); } catch (e) { console.error(e); }
  },

  clearTags() {
    try { window.kbUI?.clearTags?.(); } catch (e) { console.error(e); }
  },

  updateList() {
    try { window.kbUI?.updateList?.(); } catch (e) { console.error(e); }
  },

  openCreate() {
    try { window.kbUI?.openCreate?.(); } catch (e) { console.error(e); }
  },

  openEdit(id) {
    try { window.kbUI?.openEdit?.(id); } catch (e) { console.error(e); }
  },

  openView(id) {
    try { window.kbUI?.openView?.(id); } catch (e) { console.error(e); }
  },

  openModal(html) {
    try { window.kbUI?.openModal?.(html); } catch (e) { console.error(e); }
  },

  closeModal() {
    try { window.kbUI?.closeModal?.(); } catch (e) { console.error(e); }
  },

  remove(id) {
    try { return window.kbUI?.remove?.(id); } catch (e) { console.error(e); }
  },
});

try { console.log('✅ KBUI loaded'); } catch (_) {}
