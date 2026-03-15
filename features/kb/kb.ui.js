/**
 * 知識庫（KB）- UI
 * KB-1（MVP）
 */

class KBUI {
  constructor(){
    this.type = 'faq'; // faq | failure | sop | case
    this.searchText = '';
    this.searchDraft = '';
    this.selectedTags = new Set();
    this._renderedContainerId = '';

    // 效能：避免每個 key stroke 都全量重繪
    this.searchDebounce = null;
    this._renderToken = 0;

    // Phase 1：事件委派（移除 inline onclick/oninput/onchange）
    this._delegationBound = false;
    this._delegationRoot = null;
    this._onDelegatedClick = null;
    this._onDelegatedInput = null;
    this._onDelegatedKeydown = null;
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

  _escapeAttr(input) {
    const s = (input === null || input === undefined) ? '' : String(input);
    // 避免 value="..." 斷裂；同時移除換行避免屬性注入
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .split('\n').join(' ')
      .split('\r').join(' ');
  }

  _getService(){
    // registry-first；避免直接 window.KBService
    try {
      if (typeof window._svc === 'function') return window._svc('KBService');
      if (window.AppRegistry && typeof window.AppRegistry.get === 'function') return window.AppRegistry.get('KBService');
    } catch (_) {}
    return null;
  }

  _bindDelegation(rootEl){
    const root = rootEl || document.querySelector('.kb-module');
    if (!root) return;

    // 若已綁定且 root 未變更，直接跳過
    if (this._delegationBound && this._delegationRoot === root) return;

    // 若 root 變更，解除舊綁定
    try {
      if (this._delegationBound && this._delegationRoot) {
        if (this._onDelegatedClick) this._delegationRoot.removeEventListener('click', this._onDelegatedClick);
        if (this._onDelegatedInput) this._delegationRoot.removeEventListener('input', this._onDelegatedInput);
        if (this._onDelegatedKeydown) this._delegationRoot.removeEventListener('keydown', this._onDelegatedKeydown);
      }
    } catch (_) {}

    this._delegationRoot = root;

    // click
    this._onDelegatedClick = (ev) => {
      try {
        const btn = ev?.target?.closest?.('[data-action]');
        if (!btn || !root.contains(btn)) return;
        const action = (btn.getAttribute('data-action') || '').toString();
        if (!action) return;

        // 預設避免 form button 觸發 submit
        try { ev.preventDefault(); } catch (_) {}

        if (action === 'kb-apply-search') return this.applySearch();
        if (action === 'kb-clear-all') return this.clearAll();
        if (action === 'kb-open-create') return this.openCreate();
        if (action === 'kb-close-modal') return this.closeModal();
        if (action === 'kb-set-type') return this.setType(btn.dataset.type || 'faq');
        if (action === 'kb-clear-tags') return this.clearTags();
        if (action === 'kb-toggle-tag') return this.toggleTag(btn.dataset.tag || '');
        if (action === 'kb-open-view') return this.openView(btn.dataset.id || '');
        if (action === 'kb-open-edit') return this.openEdit(btn.dataset.id || '');
        if (action === 'kb-remove') return this.remove(btn.dataset.id || '');
      } catch (e) {
        console.warn('KBUI delegated click failed:', e);
      }
    };

    // input
    this._onDelegatedInput = (ev) => {
      try {
        const t = ev?.target;
        if (!t || !root.contains(t)) return;
        if (t && t.id === 'kb-search') {
          this.onSearchDraft(ev);
        }
      } catch (_) {}
    };

    // keydown
    this._onDelegatedKeydown = (ev) => {
      try {
        const t = ev?.target;
        if (!t || !root.contains(t)) return;
        if (t && t.id === 'kb-search') {
          this.onSearchKeydown(ev);
        }
      } catch (_) {}
    };

    root.addEventListener('click', this._onDelegatedClick);
    root.addEventListener('input', this._onDelegatedInput);
    root.addEventListener('keydown', this._onDelegatedKeydown);
    this._delegationBound = true;
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
            <input id="kb-search" class="input" style="max-width:360px" placeholder="搜尋：關鍵字 / Tag / 設備 / 料號..." value="${this._escapeAttr(this.searchDraft || '')}" />
            <button class="btn" data-action="kb-apply-search">搜尋</button>
            <button class="btn ghost" data-action="kb-clear-all">清除</button>
            <button class="btn primary" data-action="kb-open-create">＋ 新增</button>
          </div>
        </div>

        <div class="panel" style="padding:14px 16px;">
          <div class="chip-row" id="kb-type-chips"></div>
          <div style="height:10px"></div>
          <div class="chip-row" id="kb-tag-chips"></div>
        </div>

        <div id="kb-list" class="card-list"></div>

        <div id="kb-modal" class="modal" style="display:none;">
          <div class="modal-backdrop" data-action="kb-close-modal"></div>
          <div class="modal-content" id="kb-modal-content"></div>
        </div>
      </div>
    `;

    this._renderTypeChips();
    this._renderTagChips();
    this.updateList();

    // Phase 1：事件委派（第二個模組）
    try {
      const root = host.querySelector('.kb-module');
      this._bindDelegation(root);
    } catch (_) {}

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
      return `<button class="chip ${active}" data-action="kb-set-type" data-type="${this._escapeAttr(meta.key)}">${meta.icon} ${meta.label}</button>`;
    }).join('');
  }

  _renderTagChips(){
    const el = document.getElementById('kb-tag-chips');
    if (!el) return;
    const svc = this._getService();
    const tags = (svc && typeof svc.getTags === 'function') ? svc.getTags(this.type) : [];

    const chips = [];
    const allActive = (this.selectedTags.size === 0);
    chips.push(`<button class="chip ${allActive ? 'active' : ''}" data-action="kb-clear-tags">🏷️ 全部</button>`);

    for (const t of tags) {
      const a = this.selectedTags.has(t) ? 'active' : '';
      chips.push(`<button class="chip ${a}" data-action="kb-toggle-tag" data-tag="${this._escapeAttr(t)}">${this._escape(t)}</button>`);
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

  onSearchDraft(ev){
    const v = (ev?.target?.value || '').toString();
    this.searchDraft = v;
  }

  onSearchKeydown(ev){
    const key = ev?.key || ev?.keyCode;
    if (key === 'Enter' || key === 13) {
      try { ev.preventDefault(); } catch (_) {}
      this.applySearch();
    }
  }

  applySearch(){
    this.searchText = (this.searchDraft || '').toString();
    this.updateList();
  }

  clearAll(){
    this.searchDraft = '';
    this.searchText = '';
    this.selectedTags.clear();
    try { const inp = document.getElementById('kb-search'); if (inp) inp.value = ''; } catch (_) {}
    this._renderTagChips();
    this.updateList();
  }

  // 相容舊呼叫（避免其他地方仍呼叫 handleSearch）
  handleSearch(ev){
    this.onSearchDraft(ev);
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
            <button class="btn sm" data-action="kb-open-view" data-id="${this._escapeAttr(it.id)}">開啟</button>
            <button class="btn sm ghost" data-action="kb-open-edit" data-id="${this._escapeAttr(it.id)}">編輯</button>
            <button class="btn sm danger" data-action="kb-remove" data-id="${this._escapeAttr(it.id)}">刪除</button>
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

  _resolveStructuredItem(item){
    const it = item || {};
    if (this.type === 'failure') {
      return {
        title: it.title || it.failureMode || it.symptom || '',
        summary: it.summary || it.symptom || it.rootCause || it.fix || '',
        sections: [
          { label:'症狀', value: it.symptom },
          { label:'故障模式', value: it.failureMode },
          { label:'根因分析', value: it.rootCause || it.diagnostics },
          { label:'處置 / 修復', value: it.fix || it.actions }
        ]
      };
    }
    if (this.type === 'sop') {
      return {
        title: it.title || 'SOP',
        summary: it.summary || it.steps || '',
        sections: [
          { label:'目的 / 說明', value: it.summary },
          { label:'步驟', value: it.steps },
          { label:'注意事項', value: it.precautions || it.notes }
        ]
      };
    }
    if (this.type === 'case') {
      return {
        title: it.title || it.problem || '案例',
        summary: it.summary || it.solution || it.analysis || it.outcome || '',
        sections: [
          { label:'問題描述', value: it.problem },
          { label:'分析 / 根因', value: it.analysis || it.rootCause },
          { label:'處置 / 結論', value: it.solution },
          { label:'結果 / 後續', value: it.outcome || it.notes }
        ]
      };
    }
    return {
      title: it.title || it.question || 'FAQ',
      summary: it.summary || it.answer || '',
      sections: [
        { label:'問題', value: it.question },
        { label:'解答', value: it.answer }
      ]
    };
  }

  _renderView({ meta, item }){
    const esc = (s) => this._escape(s);
    const info = this._resolveStructuredItem(item);
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const tagCount = tags.length;
    const tagsHtml = tags.map(x => `<span class="enterprise-detail-chip">${esc(x)}</span>`).join('');
    const relatedRepairNos = Array.isArray(item.relatedRepairNos) ? item.relatedRepairNos.filter(Boolean) : [];

    const sections = (info.sections || [])
      .filter(x => x && String(x.value || '').trim())
      .map(x => `
        <div class="form-section kb-view-section">
          <div class="form-section-head">
            <div class="form-section-title">${esc(x.label)}</div>
          </div>
          <div class="kb-view-copy">${esc(x.value || '')}</div>
        </div>
      `).join('');

    return `
      <div class="kb-modal-shell kb-detail-modal">
        <div class="modal-header">
          <div>
            <h3>${meta.icon} ${meta.label} · 檢視</h3>
            <div class="muted" style="margin-top:6px;">知識庫條目詳情與關聯資訊</div>
          </div>
          <button class="modal-close" type="button" data-action="kb-close-modal">×</button>
        </div>
        <div class="modal-body kb-modal-body">
          <div class="enterprise-detail-hero">
            <div class="enterprise-detail-hero-copy">
              <div class="enterprise-detail-overline">Knowledge Base</div>
              <div class="enterprise-detail-title-row">
                <h3 class="enterprise-detail-title">${esc(info.title || '-')}</h3>
                <div class="enterprise-detail-title-aside">
                  <span class="enterprise-detail-chip">${meta.icon} ${meta.label}</span>
                  <span class="enterprise-detail-chip is-muted">Tags ${tagCount}</span>
                </div>
              </div>
              <p class="enterprise-detail-subtitle">${esc(info.summary || '尚未填寫摘要')}</p>
              ${tagsHtml ? `<div class="enterprise-detail-chip-row">${tagsHtml}</div>` : ''}
            </div>
            <div class="enterprise-detail-hero-stats">
              <div class="enterprise-mini-stat"><span>建立者</span><strong>${esc(item.createdBy || '-')}</strong></div>
              <div class="enterprise-mini-stat"><span>最後更新</span><strong>${esc(item.updatedAt || '-')}</strong></div>
              <div class="enterprise-mini-stat"><span>關聯維修單</span><strong>${esc(relatedRepairNos.join(', ') || '-')}</strong></div>
              <div class="enterprise-mini-stat"><span>設備 / 模組</span><strong>${esc([item.equipment, item.model].filter(Boolean).join(' / ') || '-')}</strong></div>
            </div>
          </div>

          <div class="enterprise-detail-command-bar enterprise-detail-command-bar-compact">
            <div class="enterprise-detail-command-copy">
              <div class="enterprise-detail-command-title">條目操作</div>
              <div class="enterprise-detail-command-desc">可直接編輯、返回列表，或在確認後刪除此知識庫條目。</div>
            </div>
            <div class="enterprise-detail-command-actions">
              <button class="btn ghost" type="button" data-action="kb-close-modal">返回列表</button>
              <button class="btn" type="button" data-action="kb-open-edit" data-id="${this._escapeAttr(item.id)}">編輯</button>
              <button class="btn danger" type="button" data-action="kb-remove" data-id="${this._escapeAttr(item.id)}">刪除</button>
            </div>
          </div>

          <div class="enterprise-detail-overview-board">
            <div class="enterprise-detail-overview-card enterprise-detail-overview-card-primary">
              <div class="enterprise-detail-overview-card-head">
                <div>
                  <div class="enterprise-detail-overview-eyebrow">Content</div>
                  <div class="enterprise-detail-overview-title">內容摘要</div>
                </div>
              </div>
              <div class="kb-view-sections">
                ${sections || `<div class="enterprise-detail-overview-note"><span>內容</span><div>尚未填寫詳細內容</div></div>`}
              </div>
            </div>
            <div class="enterprise-detail-overview-card">
              <div class="enterprise-detail-overview-card-head">
                <div>
                  <div class="enterprise-detail-overview-eyebrow">Relation</div>
                  <div class="enterprise-detail-overview-title">關聯資訊</div>
                </div>
              </div>
              <div class="enterprise-detail-overview-grid enterprise-detail-overview-grid-2">
                <div class="enterprise-detail-overview-item"><span>設備</span><strong>${esc(item.equipment || '-')}</strong></div>
                <div class="enterprise-detail-overview-item"><span>機型 / 模組</span><strong>${esc(item.model || '-')}</strong></div>
                <div class="enterprise-detail-overview-item"><span>料號 / 零件</span><strong>${esc(item.partNo || '-')}</strong></div>
                <div class="enterprise-detail-overview-item"><span>關聯維修單</span><strong>${esc(relatedRepairNos.join(', ') || '-')}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderForm({ mode, meta, item }){
    const it = item || {};
    const esc = (s) => this._escape(s);
    const info = this._resolveStructuredItem(it);
    const tags = esc((Array.isArray(it.tags) ? it.tags.join(', ') : (it.tagsText || '')));
    const relatedRepairNos = esc((Array.isArray(it.relatedRepairNos) ? it.relatedRepairNos.join(', ') : (it.relatedRepairNos || '')));
    const isEdit = mode === 'edit';
    const hid = isEdit ? `<input type="hidden" name="id" value="${esc(it.id)}" />` : '';

    const field = (label, name, value, opts = {}) => {
      const req = opts.required ? 'required' : '';
      const ph = esc(opts.placeholder || '');
      const cls = opts.full ? 'field field-span-full' : 'field';
      return `
        <div class="${cls}">
          <label class="${opts.required ? 'required' : ''}">${esc(label)}</label>
          <input class="input" name="${esc(name)}" ${req} placeholder="${ph}" value="${esc(value || '')}" />
          ${opts.help ? `<div class="help">${esc(opts.help)}</div>` : ''}
        </div>
      `;
    };

    const textarea = (label, name, value, opts = {}) => {
      const req = opts.required ? 'required' : '';
      const ph = esc(opts.placeholder || '');
      const rows = Number(opts.rows || 6);
      const cls = opts.full ? 'field field-span-full' : 'field';
      return `
        <div class="${cls}">
          <label class="${opts.required ? 'required' : ''}">${esc(label)}</label>
          <textarea class="input" name="${esc(name)}" ${req} rows="${rows}" placeholder="${ph}">${esc(value || '')}</textarea>
          ${opts.help ? `<div class="help">${esc(opts.help)}</div>` : ''}
        </div>
      `;
    };

    let bodyFields = '';
    if (this.type === 'faq') {
      bodyFields = `
        <div class="form-grid">
          ${field('問題', 'question', it.question, { required:true, placeholder:'例如：Loader 無法上電？', full:true, help:'FAQ 以「問題 → 解答」為主結構，標題可留空。' })}
          ${field('標題（選填）', 'title', it.title, { placeholder:'例如：Power On 失敗' })}
          ${field('摘要（選填）', 'summary', it.summary, { placeholder:'一句話摘要，供列表首屏閱讀使用' })}
        </div>
        ${textarea('解答', 'answer', it.answer, { required:true, rows:9, placeholder:'請輸入解答 / 處置方式', full:true })}
      `;
    } else if (this.type === 'failure') {
      bodyFields = `
        <div class="form-grid">
          ${field('症狀', 'symptom', it.symptom, { required:true, placeholder:'例如：RF 打不出 / Pressure not stable', full:true })}
          ${field('故障模式', 'failureMode', it.failureMode, { placeholder:'例如：Power Supply 故障' })}
          ${field('摘要（選填）', 'summary', it.summary, { placeholder:'一句話摘要，供列表與首屏閱讀使用' })}
        </div>
        ${textarea('根因分析', 'rootCause', it.rootCause || it.diagnostics, { rows:6, placeholder:'量測點、Log、判斷依據', full:true })}
        ${textarea('處置 / 修復', 'fix', it.fix || it.actions, { required:true, rows:8, placeholder:'實際修復步驟與驗證結果', full:true })}
      `;
    } else if (this.type === 'sop') {
      bodyFields = `
        <div class="form-grid">
          ${field('標題', 'title', it.title, { required:true, placeholder:'例如：更換 MFC 校正流程', full:true })}
          ${field('摘要（選填）', 'summary', it.summary, { placeholder:'此 SOP 的用途與適用範圍' })}
        </div>
        ${textarea('步驟', 'steps', it.steps, { required:true, rows:10, placeholder:'1) ...\n2) ...\n3) ...', full:true })}
        ${textarea('注意事項 / 檢查點', 'precautions', it.precautions || it.notes, { rows:6, placeholder:'安全、ESD、清潔、驗證條件', full:true })}
      `;
    } else {
      bodyFields = `
        <div class="form-grid">
          ${field('標題', 'title', it.title, { required:true, placeholder:'例如：ASEK21 - FlexTRAK 27V PS 故障', full:true })}
          ${field('摘要（選填）', 'summary', it.summary, { placeholder:'供列表與首屏閱讀的案例摘要' })}
        </div>
        ${textarea('問題描述', 'problem', it.problem, { required:true, rows:6, placeholder:'客訴、現象與發生條件', full:true })}
        ${textarea('分析 / 根因', 'analysis', it.analysis || it.rootCause, { rows:5, placeholder:'根因分析、證據或判斷過程', full:true })}
        ${textarea('處置 / 結論', 'solution', it.solution, { required:true, rows:6, placeholder:'更換、調整與驗證結果', full:true })}
        ${textarea('結果 / 後續', 'outcome', it.outcome || it.notes, { rows:5, placeholder:'成效、後續追蹤或補充說明', full:true })}
      `;
    }

    return `
      <div class="kb-modal-shell kb-form-modal">
        <div class="modal-header">
          <div>
            <h3>${meta.icon} ${meta.label} · ${mode === 'edit' ? '編輯' : '新增'}</h3>
            <div class="muted" style="margin-top:6px;">表單採正式 submit 流程；必填欄位與錯誤會在欄位旁與摘要同步顯示。</div>
          </div>
          <button class="modal-close" type="button" data-action="kb-close-modal">×</button>
        </div>
        <form id="kb-form" class="kb-form-shell" autocomplete="off">
          ${hid}
          <div class="modal-body enterprise-form kb-modal-body">
            <div class="form-context-bar">
              <div class="form-context-main">
                <div class="form-context-title">${mode === 'edit' ? '編輯知識條目' : '新增知識條目'}</div>
                <div class="form-context-pills">
                  <span class="form-context-pill is-strong">${meta.icon} ${meta.label}</span>
                  <span class="form-context-pill">Tags：${(Array.isArray(it.tags) ? it.tags.length : 0)}</span>
                  <span class="form-context-pill">關聯維修：${(Array.isArray(it.relatedRepairNos) ? it.relatedRepairNos.length : 0)}</span>
                </div>
              </div>
              <p class="form-context-note">先完成主內容，再補齊設備、模組與關聯維修資訊，避免知識條目只剩零散備註。</p>
            </div>

            <div class="form-section">
              <div class="form-section-head">
                <div class="form-section-title">基本資訊</div>
                <p class="form-section-desc">所有知識條目都應至少包含標籤、摘要與關聯資訊，方便後續搜尋與維護。</p>
              </div>
              <div class="form-grid">
                ${field('Tags（以逗號分隔）', 'tags', tags, { placeholder:'例如：FlexTRAK, Power, 27V', full:true, help:'用於快速篩選與搜尋。' })}
                ${field('關聯維修單（以逗號分隔）', 'relatedRepairNos', relatedRepairNos, { placeholder:'例如：R20251229-001, R20260106-002', full:true, help:'可選填，用於把知識條目與實際維修單關聯。' })}
              </div>
            </div>

            <div class="form-section">
              <div class="form-section-head">
                <div class="form-section-title">內容主體</div>
                <p class="form-section-desc">依條目類型固定主欄位結構，避免 FAQ、故障模式、SOP、案例混用不同命名。</p>
              </div>
              ${bodyFields}
            </div>

            <div class="form-section">
              <div class="form-section-head">
                <div class="form-section-title">關聯設備</div>
                <p class="form-section-desc">補齊設備、模組與料號，讓知識條目能在搜尋與後續維護時快速被定位。</p>
              </div>
              <div class="form-grid three">
                ${field('設備 / 產品線', 'equipment', it.equipment, { placeholder:'例如：FlexTRAK-S' })}
                ${field('機型 / 模組', 'model', it.model, { placeholder:'例如：CCP / Downstream' })}
                ${field('料號 / 零件', 'partNo', it.partNo, { placeholder:'例如：Parker 601XF' })}
              </div>
            </div>
          </div>

          <div class="modal-footer sticky">
            <div class="form-actions-note">${mode === 'edit' ? `編輯中：${esc(info.title || '-')}，儲存後會直接更新現有條目。` : '建立後即可回到列表、搜尋與編輯；請先確認類型與主內容結構正確。'}</div>
            <button class="btn ghost" type="button" data-action="kb-close-modal">取消</button>
            <button class="btn primary" type="submit" id="kb-save-btn">${mode === 'edit' ? '儲存' : '建立'}</button>
          </div>
        </form>
      </div>
    `;
  }

  _bindForm(mode, item){
    const form = document.getElementById('kb-form');
    const btn = document.getElementById('kb-save-btn');
    if (!form || !btn) return;

    try { window.FormValidate?.bindForm?.(form); } catch (_) {}

    const onSubmit = async (e) => {
      e.preventDefault();
      try {
        const ok = window.FormValidate?.validateForm ? window.FormValidate.validateForm(form) : true;
        if (!ok) return;

        btn.disabled = true;
        const oldText = btn.textContent;
        btn.textContent = mode === 'edit' ? '儲存中...' : '建立中...';

        const fd = new FormData(form);
        const payload = {};
        fd.forEach((v,k) => { payload[k] = (v === null || v === undefined) ? '' : String(v); });

        // 正規化：移除前端暫存或舊欄位別名，維持 KB 欄位契約一致
        if (payload.relatedRepairNos && typeof payload.relatedRepairNos === 'string') {
          payload.relatedRepairNos = payload.relatedRepairNos.split(/[,;\n]/g).map(s => s.trim()).filter(Boolean);
        }
        if (this.type === 'failure') {
          delete payload.diagnostics;
          delete payload.actions;
        }
        if (this.type === 'sop') {
          delete payload.notes;
        }
        if (this.type === 'case') {
          delete payload.rootCause;
          delete payload.notes;
        }

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
      } finally {
        btn.disabled = false;
        btn.textContent = mode === 'edit' ? '儲存' : '建立';
      }
    };

    form.addEventListener('submit', onSubmit);
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
  window.KBUI = KBUI;
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

  onSearchDraft(ev) {
    try { window.kbUI?.onSearchDraft?.(ev); } catch (e) { console.error(e); }
  },

  onSearchKeydown(ev) {
    try { window.kbUI?.onSearchKeydown?.(ev); } catch (e) { console.error(e); }
  },

  applySearch() {
    try { window.kbUI?.applySearch?.(); } catch (e) { console.error(e); }
  },

  clearAll() {
    try { window.kbUI?.clearAll?.(); } catch (e) { console.error(e); }
  },

  // 相容舊呼叫
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
