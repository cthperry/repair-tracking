/**
 * 客戶管理 - UI（表單/詳情）
 */

class CustomerUIForms {
  _escapeHtml(value) {
    return (value === null || value === undefined ? '' : String(value))
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  _escapeAttr(value) {
    return this._escapeHtml(value).replace(/\n/g, ' ').replace(/\r/g, ' ');
  }

  _escapeMultiline(value) {
    const safe = this._escapeHtml(value || '');
    return safe ? safe.replace(/\n/g, '<br>') : '-';
  }

  _formatDateTime(value) {
    if (!value) return '—';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return String(value);
    }
  }

  renderForm(customer = null, presetCompany = '') {
    const isEdit = !!customer;
    const c = customer || {};
    const customerSvc = (typeof window._svc === 'function') ? window._svc('CustomerService') : null;
    const companies = (customerSvc && typeof customerSvc.getCompanies === 'function') ? customerSvc.getCompanies() : [];
    const companyOptions = (companies || []).map((name) => {
      const safe = this._escapeAttr(name || '');
      return safe ? `<option value="${safe}"></option>` : '';
    }).join('');

    const companyValue = (c.name || presetCompany || '').toString();
    const companyLocked = !isEdit && !!presetCompany;
    const contactValue = (c.contact || '').toString();
    const phoneValue = (c.phone || '').toString();
    const emailValue = (c.email || '').toString();
    const addressValue = (c.address || '').toString();
    const noteValue = (c.note || '').toString();
    const repairCount = Number(c.repairCount);
    const hasHistory = Number.isFinite(repairCount) && repairCount > 0;

    return `
      <form id="customer-form" class="modal-dialog modal-large customer-form-dialog" novalidate onsubmit="event.preventDefault(); event.stopPropagation(); window.CustomerUIForms.handleSubmit(event); return false;">
        <input type="hidden" name="id" value="${this._escapeAttr(c.id || '')}" />

        <div class="modal-header">
          <h3>${isEdit ? '編輯聯絡人' : '新增聯絡人'}</h3>
          <button type="button" class="modal-close" data-action="closeModal" aria-label="關閉">✕</button>
        </div>

        <div class="modal-body enterprise-form customer-form-body">
          <p class="customer-form-intro">${isEdit ? '直接維護既有聯絡人資料，儲存後會同步更新客戶清單中的該筆聯絡人。' : '新增公司聯絡窗口時，欄位順序與桌機 / 手機顯示保持一致。'}</p>
          <div class="form-context-bar customer-form-statusbar" aria-label="表單狀態摘要">
            <div class="form-context-main customer-form-status-left">
              <span class="form-context-title">${isEdit ? '聯絡人編輯' : '聯絡人建立'}</span>
              <div class="form-context-pills">
                <span class="customer-summary-pill ${isEdit ? 'is-edit' : 'is-create'}">${isEdit ? '編輯模式' : '新增模式'}</span>
                ${hasHistory ? `<span class="customer-summary-pill">累計維修 ${repairCount}</span>` : '<span class="customer-summary-pill">尚無維修歷史</span>'}
                ${companyLocked ? '<span class="form-context-pill is-lock">來源公司已鎖定</span>' : ''}
              </div>
            </div>
            <div class="customer-form-status-note form-context-note">主欄位固定為公司、聯絡人、電話與 Email，補充資料獨立成段管理。</div>
          </div>

          <div class="customer-form-layout">
            <section class="form-section customer-form-section customer-form-section-main">
              <div class="form-section-head">
                <h4 class="form-section-title">基本資訊</h4>
                <p class="form-section-desc">先完成公司名稱、聯絡人、電話與 Email，建立後台、現場與商務共用的正式聯絡主檔。</p>
              </div>
              <div class="form-grid customer-form-grid customer-form-grid-basic">
                <div class="form-group customer-field-span-company">
                  <label class="form-label required" for="customer-form-name">公司名稱</label>
                  ${companyLocked ? `
                    <input id="customer-form-name" type="text" name="name" class="input" value="${this._escapeAttr(companyValue)}" readonly aria-readonly="true" required data-required-msg="請輸入公司名稱" />
                    <div class="form-readonly-note">此流程從既有公司直接新增聯絡人，公司關聯已固定，避免誤切換到其他公司。</div>
                  ` : `
                    <input id="customer-form-name" type="text" name="name" class="input" value="${this._escapeAttr(companyValue)}" placeholder="請輸入公司名稱" list="company-pick-list" autocomplete="organization" required data-required-msg="請輸入公司名稱" />
                    <div class="form-help">以公司名稱作為分組主鍵，編輯公司名稱時會影響客戶清單分組與更名同步流程。</div>
                    <datalist id="company-pick-list">${companyOptions}</datalist>
                  `}
                </div>
                <div class="form-group customer-field-span-contact">
                  <label class="form-label" for="customer-form-contact">聯絡人</label>
                  <input id="customer-form-contact" type="text" name="contact" class="input" value="${this._escapeAttr(contactValue)}" placeholder="請輸入聯絡人姓名" autocomplete="name" />
                  <div class="form-help">建議填寫主要窗口姓名，讓現場維修與商務追蹤可快速比對。</div>
                </div>
                <div class="form-group customer-field-span-phone">
                  <label class="form-label" for="customer-form-phone">電話</label>
                  <input id="customer-form-phone" type="tel" name="phone" class="input" value="${this._escapeAttr(phoneValue)}" placeholder="請輸入電話" autocomplete="tel" inputmode="tel" />
                  <div class="form-help">可填分機或手機，避免把聯絡資訊全部塞在備註。</div>
                </div>
                <div class="form-group customer-field-span-email">
                  <label class="form-label" for="customer-form-email">Email</label>
                  <input id="customer-form-email" type="email" name="email" class="input" value="${this._escapeAttr(emailValue)}" placeholder="請輸入 Email" autocomplete="email" />
                  <div class="form-help">Email 會做格式檢查，格式錯誤時會直接標示在欄位旁。</div>
                </div>
              </div>
            </section>

            <section class="form-section customer-form-section customer-form-section-side">
              <div class="form-section-head">
                <h4 class="form-section-title">地址與備註</h4>
                <p class="form-section-desc">地址與備註僅放補充資訊，不混寫主要聯絡欄位。</p>
              </div>
              <div class="form-grid customer-form-grid customer-form-grid-detail">
                <div class="form-group customer-field-span-2">
                  <label class="form-label" for="customer-form-address">地址</label>
                  <input id="customer-form-address" type="text" name="address" class="input" value="${this._escapeAttr(addressValue)}" placeholder="請輸入地址" autocomplete="street-address" />
                </div>
                <div class="form-group customer-field-span-2">
                  <label class="form-label" for="customer-form-note">備註</label>
                  <textarea id="customer-form-note" name="note" class="textarea" placeholder="補充說明，例如：部門窗口、可聯繫時段、特殊提醒">${this._escapeHtml(noteValue)}</textarea>
                  <div class="form-help">備註僅放補充資訊，不建議替代正式聯絡欄位。</div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="modal-footer sticky customer-form-footer">
          <div class="form-actions-note">${isEdit ? '刪除屬於軟刪除，保留歷史資料。' : '建立後可再回到聯絡人詳情編輯。'}</div>
          <div class="customer-form-footer-actions">
            ${isEdit ? `<button type="button" class="btn danger" data-action="confirmDelete" data-id="${this._escapeAttr(c.id)}">刪除</button>` : ''}
            <button type="button" class="btn" data-action="closeModal">取消</button>
            <button type="submit" class="btn primary">儲存</button>
          </div>
        </div>
      </form>
    `;
  }

  renderDetail(customer) {
    const c = customer || {};
    const phone = c.phone ? `<a href="tel:${this._escapeAttr(c.phone)}">${this._escapeHtml(c.phone)}</a>` : '<span class="muted">未填寫</span>';
    const email = c.email ? `<a href="mailto:${this._escapeAttr(c.email)}">${this._escapeHtml(c.email)}</a>` : '<span class="muted">未填寫</span>';
    const address = c.address ? this._escapeHtml(c.address) : '未填寫';
    const repairCount = Number(c.repairCount);
    const safeRepairCount = Number.isFinite(repairCount) ? repairCount : 0;
    const note = String(c.note || '').trim();
    const contactName = String(c.contact || '').trim() || '未填寫聯絡人';
    const companyName = String(c.name || '').trim() || '未命名公司';
    const createdAt = this._formatDateTime(c.createdAt);
    const updatedAt = this._formatDateTime(c.updatedAt);
    const hasAddress = !!String(c.address || '').trim();
    const hasNote = !!note;
    const notePreview = hasNote ? this._escapeHtml(note.length > 54 ? `${note.slice(0, 54)}…` : note) : '尚未補充維護備註';
    const statHTML = (window.UI && typeof window.UI.enterpriseStatHTML === 'function')
      ? window.UI.enterpriseStatHTML
      : (label, value) => `<div class="enterprise-mini-stat"><span>${this._escapeHtml(label)}</span><strong>${this._escapeHtml(value || '—')}</strong></div>`;
    const itemHTML = (window.UI && typeof window.UI.enterpriseOverviewItemHTML === 'function')
      ? window.UI.enterpriseOverviewItemHTML
      : (label, value) => `<div class="enterprise-detail-overview-item"><span>${this._escapeHtml(label)}</span><strong>${value || '—'}</strong></div>`;
    const noteHTML = (window.UI && typeof window.UI.enterpriseOverviewNoteHTML === 'function')
      ? window.UI.enterpriseOverviewNoteHTML
      : (label, value, options = {}) => `<div class="enterprise-detail-overview-note"><span>${this._escapeHtml(label)}</span><div>${options.allowHtml ? (value || '—') : this._escapeHtml(value || '—')}</div></div>`;
    const heroStatsHtml = [
      statHTML('累計維修', String(safeRepairCount)),
      statHTML('建立時間', this._escapeHtml(createdAt), { allowHtml: true }),
      statHTML('最後更新', this._escapeHtml(updatedAt), { allowHtml: true }),
      statHTML('備註狀態', hasNote ? '已補充' : '未補充')
    ].join('');
    const contactOverviewHtml = [
      itemHTML('聯絡人', this._escapeHtml(contactName), { allowHtml: true }),
      itemHTML('電話', phone, { allowHtml: true }),
      itemHTML('Email', email, { allowHtml: true }),
      itemHTML('地址完整度', hasAddress ? '已建立地址資訊' : '尚未建立地址資訊')
    ].join('');
    const lifecycleOverviewHtml = [
      itemHTML('建立時間', this._escapeHtml(createdAt), { allowHtml: true }),
      itemHTML('最後更新', this._escapeHtml(updatedAt), { allowHtml: true })
    ].join('');
    const notePreviewHtml = noteHTML('快速預覽', notePreview, { allowHtml: true });
    const fullNoteGridHtml = [
      noteHTML('地址', address, { allowHtml: true }),
      noteHTML('備註', hasNote ? this._escapeMultiline(note) : '未填寫', { allowHtml: true })
    ].join('');

    return `
      <div class="modal-dialog customer-detail-dialog customer-detail-surface">
        <div class="modal-header customer-detail-header">
          <h3>聯絡人詳情</h3>
          <button type="button" class="modal-close" data-action="closeModal" aria-label="關閉">✕</button>
        </div>

        <div class="modal-body customer-detail-body customer-detail-body-enterprise">
          <p class="customer-form-intro customer-detail-intro">以公司、聯絡方式與維護資訊三層閱讀，讓現場與商務共用同一份正式客戶主檔。</p>
          <section class="enterprise-detail-hero customer-detail-hero-enterprise">
            <div class="enterprise-detail-hero-copy">
              <div class="enterprise-detail-overline">Customer Master</div>
              <div class="enterprise-detail-title-row">
                <div>
                  <h4 class="enterprise-detail-title">${this._escapeHtml(companyName)}</h4>
                  <p class="enterprise-detail-subtitle">${this._escapeHtml(contactName)}</p>
                </div>
                <div class="enterprise-detail-title-aside">
                  <span class="enterprise-detail-chip">聯絡人主檔</span>
                  <span class="enterprise-detail-chip is-muted">維修歷史 ${safeRepairCount} 筆</span>
                </div>
              </div>
              <div class="enterprise-detail-chip-row">
                <span class="enterprise-detail-chip">${String(c.phone || '').trim() ? '已填電話' : '待補電話'}</span>
                <span class="enterprise-detail-chip">${String(c.email || '').trim() ? '已填 Email' : '待補 Email'}</span>
                <span class="enterprise-detail-chip is-muted">${hasAddress ? '已填地址' : '待補地址'}</span>
              </div>
            </div>
            <div class="enterprise-detail-hero-stats">${heroStatsHtml}</div>
          </section>

          <section class="enterprise-detail-overview-board customer-detail-overview-board">
            <article class="enterprise-detail-overview-card enterprise-detail-overview-card-primary">
              <div class="enterprise-detail-overview-card-head">
                <div>
                  <div class="enterprise-detail-overview-eyebrow">聯絡方式</div>
                  <div class="enterprise-detail-overview-title">主要聯絡資訊</div>
                </div>
                <div class="enterprise-detail-overview-signal-row">
                  <span class="enterprise-detail-overview-chip tone-primary">公司主檔</span>
                  <span class="enterprise-detail-overview-chip ${String(c.email || '').trim() ? 'tone-success' : 'tone-warning'}">${String(c.email || '').trim() ? 'Email 完整' : 'Email 待補'}</span>
                </div>
              </div>
              <div class="enterprise-detail-overview-grid enterprise-detail-overview-grid-4 customer-detail-overview-grid-4">${contactOverviewHtml}</div>
            </article>

            <article class="enterprise-detail-overview-card">
              <div class="enterprise-detail-overview-card-head">
                <div>
                  <div class="enterprise-detail-overview-eyebrow">維護資訊</div>
                  <div class="enterprise-detail-overview-title">建立與更新節點</div>
                </div>
              </div>
              <div class="enterprise-detail-overview-grid enterprise-detail-overview-grid-2">${lifecycleOverviewHtml}</div>
            </article>

            <article class="enterprise-detail-overview-card">
              <div class="enterprise-detail-overview-card-head">
                <div>
                  <div class="enterprise-detail-overview-eyebrow">備註摘要</div>
                  <div class="enterprise-detail-overview-title">維護說明</div>
                </div>
              </div>
              ${notePreviewHtml}
            </article>

            <article class="enterprise-detail-overview-card customer-detail-overview-card-full">
              <div class="enterprise-detail-overview-card-head">
                <div>
                  <div class="enterprise-detail-overview-eyebrow">地址與備註</div>
                  <div class="enterprise-detail-overview-title">完整補充資訊</div>
                </div>
              </div>
              <div class="enterprise-detail-overview-grid enterprise-detail-overview-grid-2 customer-detail-overview-grid-2">${fullNoteGridHtml}</div>
            </article>
          </section>
        </div>

        <div class="modal-footer sticky customer-form-footer customer-detail-footer">
          <div class="form-actions-note">如需調整公司名稱，建議先確認是否要同步影響同公司其他聯絡人與商務資料。</div>
          <div class="customer-form-footer-actions">
            <button type="button" class="btn" data-action="closeModal">關閉</button>
            <button type="button" class="btn primary" data-action="openForm" data-id="${this._escapeAttr(c.id)}">編輯</button>
          </div>
        </div>
      </div>
    `;
  }
}

const customerUIForms = new CustomerUIForms();
const customerUIFormsApi = {
  renderForm(...args) {
    return customerUIForms.renderForm(...args);
  },
  renderDetail(...args) {
    return customerUIForms.renderDetail(...args);
  },
  handleSubmit(...args) {
    return CustomerUIForms.handleSubmit(...args);
  },
  confirmDelete(...args) {
    return CustomerUIForms.confirmDelete(...args);
  }
};
if (typeof window !== 'undefined') {
  window.customerUIForms = customerUIForms;
  window.customerUIFormsApi = customerUIFormsApi;
  window.CustomerUIForms = customerUIFormsApi;
}

Object.assign(CustomerUIForms, {
  _submitting: false,

  _normalizePayload(form) {
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = (value === null || value === undefined) ? '' : String(value).trim();
    }
    return data;
  },

  _applyValidationErrors(form, errors) {
    if (!form || !Array.isArray(errors) || !window.FormValidate) return false;

    let applied = false;
    errors.forEach((item) => {
      const field = (item && item.field) ? String(item.field) : '';
      const message = (item && item.message) ? String(item.message) : '欄位內容有誤';
      if (!field) return;
      const control = form.querySelector(`[name="${field}"]`);
      if (!control) return;
      window.FormValidate.setControlError(control, message);
      applied = true;
    });

    if (applied) {
      const summary = errors.map((item) => item?.message).filter(Boolean).join('；') || '請修正表單欄位後再儲存';
      window.FormValidate.showSummary(form, summary);
      window.FormValidate.focusFirstInvalid(form);
    }
    return applied;
  },

  async handleSubmit(event) {
    try { event.preventDefault(); } catch (_) {}
    try { event.stopPropagation(); } catch (_) {}
    try { event.stopPropagation(); } catch (_) {}

    if (CustomerUIForms._submitting) return;

    const form = event?.target?.closest ? (event.target.closest('form') || event.target) : event?.target;
    // 用 getAttribute('id') 而非 form.id：
    // 因為表單內有 <input name="id">，瀏覽器 named access 會讓 form.id 回傳該 input 元素而非字串
    const formId = form && typeof form.getAttribute === 'function' ? form.getAttribute('id') : '';
    if (!form || formId !== 'customer-form') return;

    try {
      if (window.FormValidate) {
        window.FormValidate.bindForm(form);
        window.FormValidate.clearCustomErrors(form);
        const ok = window.FormValidate.validateForm(form, { summaryMessage: '請先完成公司名稱等必要欄位' });
        if (!ok) {
          window.UI?.toast?.('請先完成必要欄位', { type: 'warning' });
          return;
        }
      } else if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
        return;
      }
    } catch (e) {
      console.warn('customer form validate failed:', e);
    }

    const payload = CustomerUIForms._normalizePayload(form);
    const id = (payload.id || '').trim();
    delete payload.id;

    try {
      if (window.CustomerModel && typeof window.CustomerModel.validate === 'function') {
        const preview = id
          ? window.CustomerModel.update(window._svc('CustomerService').get(id) || {}, payload)
          : window.CustomerModel.create(payload);
        const validation = window.CustomerModel.validate(preview);
        if (!validation?.isValid) {
          CustomerUIForms._applyValidationErrors(form, validation.errors || []);
          window.UI?.toast?.('請修正欄位後再儲存', { type: 'warning' });
          return;
        }
      }
    } catch (e) {
      console.warn('customer model validation failed:', e);
    }

    CustomerUIForms._submitting = true;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '儲存中...';
    }

    try {
      const customerSvc = (typeof window._svc === 'function') ? window._svc('CustomerService') : null;
      if (!customerSvc) throw new Error('CustomerService not available');

      if (id) {
        await customerSvc.update(id, payload);
      } else {
        await customerSvc.create(payload);
      }

      window.customerUI?.closeModal?.();
      window.customerUI?.updateList?.();
      window.UI?.toast?.(id ? '聯絡人已更新' : '聯絡人已建立', { type: 'success' });
    } catch (error) {
      console.error('Customer submit error:', error);
      const message = '儲存失敗：' + (error?.message || error);
      if (window.FormValidate) {
        window.FormValidate.showSummary(form, message, { tone: 'warning' });
      }
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(message, { type: 'error' });
      else alert(message);
    } finally {
      CustomerUIForms._submitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText || '儲存';
      }
    }
  },

  async confirmDelete(id) {
    if (!id) return;
    {
      const msg = '確定要刪除此聯絡人？\n\n（軟刪除：可保留歷史資料）';
      const ok = (window.UI && typeof window.UI.confirm === 'function')
        ? await window.UI.confirm({ title: '確認刪除聯絡人', message: msg, okText: '刪除', cancelText: '取消', tone: 'danger' })
        : confirm(msg);
      if (!ok) return;
    }

    try {
      await window._svc('CustomerService').delete(id);
      window.customerUI.closeModal();
      window.customerUI.updateList();
      window.UI?.toast?.('聯絡人已刪除', { type: 'success' });
    } catch (error) {
      console.error('Customer delete error:', error);
      const msg = '刪除失敗：' + (error?.message || error);
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
      else alert(msg);
    }
  }
});

console.log('✅ CustomerUIForms loaded');
