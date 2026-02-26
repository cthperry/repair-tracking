/**
 * 客戶管理 - UI（表單/詳情）
 */

class CustomerUIForms {
  renderForm(customer = null, presetCompany = '') {
    const isEdit = !!customer;
    const c = customer || {};
    const customerSvc = (typeof window._svc === 'function') ? window._svc('CustomerService') : null;
    const companies = (customerSvc && typeof customerSvc.getCompanies === 'function') ? customerSvc.getCompanies() : [];
    const companyOptions = (companies || []).map(n => {
      const safe = (n || '').toString().replace(/"/g, '&quot;');
      return safe ? `<option value="${safe}"></option>` : '';
    }).join('');

    const companyValue = (c.name || presetCompany || '').toString();

    return `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>${isEdit ? '編輯聯絡人' : '新增聯絡人'}</h3>
          <button class="modal-close" data-action="closeModal">✕</button>
        </div>

        <form id="customer-form" class="modal-body">
          <input type="hidden" name="id" value="${c.id || ''}" />

          <div class="form-section">
            <h4 class="form-section-title">基本資訊</h4>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label required">公司名稱</label>
                <input type="text" name="name" class="input" value="${companyValue}" placeholder="請輸入公司名稱" list="company-pick-list" autocomplete="off" required />
                <datalist id="company-pick-list">${companyOptions}</datalist>
              </div>
              <div class="form-group">
                <label class="form-label">聯絡人</label>
                <input type="text" name="contact" class="input" value="${c.contact || ''}" placeholder="請輸入聯絡人姓名" />
              </div>
              <div class="form-group">
                <label class="form-label">電話</label>
                <input type="tel" name="phone" class="input" value="${c.phone || ''}" placeholder="請輸入電話" />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" name="email" class="input" value="${c.email || ''}" placeholder="請輸入 Email" />
              </div>
              <div class="form-group" style="grid-column: 1 / -1;">
                <label class="form-label">地址</label>
                <input type="text" name="address" class="input" value="${c.address || ''}" placeholder="請輸入地址" />
              </div>
              <div class="form-group" style="grid-column: 1 / -1;">
                <label class="form-label">備註</label>
                <textarea name="note" class="textarea" placeholder="補充說明...">${c.note || ''}</textarea>
              </div>
            </div>
          </div>
        </form>

        <div class="modal-footer">
          ${isEdit ? `<button class="btn danger" data-action="confirmDelete" data-id="${c.id}">刪除</button>` : '<div></div>'}
          <div style="display:flex; gap:8px;">
            <button class="btn" data-action="closeModal">取消</button>
            <button type="submit" form="customer-form" class="btn primary">儲存</button>
          </div>
        </div>
      </div>
    `;
  }

  renderDetail(c) {
    const phone = c.phone ? `<a href="tel:${c.phone}">${c.phone}</a>` : '<span class="muted">無</span>';
    const email = c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : '<span class="muted">無</span>';

    return `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>聯絡人詳情</h3>
          <button class="modal-close" data-action="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">公司名稱</div>
              <div class="detail-value">${c.name || '-'}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">聯絡人</div>
              <div class="detail-value">${c.contact || '-'}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">電話</div>
              <div class="detail-value">${phone}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Email</div>
              <div class="detail-value">${email}</div>
            </div>
            <div class="detail-item" style="grid-column: 1 / -1;">
              <div class="detail-label">地址</div>
              <div class="detail-value">${c.address || '-'}</div>
            </div>
            <div class="detail-item" style="grid-column: 1 / -1;">
              <div class="detail-label">備註</div>
              <div class="detail-value">${(c.note || '-').replace(/\n/g, '<br>')}</div>
            </div>
          </div>

          <div class="muted" style="margin-top: 12px; font-size: 12px;">
            累計維修數：${typeof c.repairCount === 'number' ? c.repairCount : 0}
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn" data-action="openForm" data-id="${c.id}">編輯</button>
          <button class="btn" data-action="closeModal">關閉</button>
        </div>
      </div>
    `;
  }
}

const customerUIForms = new CustomerUIForms();
if (typeof window !== 'undefined') {
  window.customerUIForms = customerUIForms;
}

Object.assign(CustomerUIForms, {
  async handleSubmit(event) {
    event.preventDefault();

    if (CustomerUIForms._submitting) return;

    const form = event.target;

    // P3：必填欄位即時驗證（僅針對既有 required 欄位）
    try {
      if (form && window.FormValidate) {
        window.FormValidate.bindForm(form);
        const ok = window.FormValidate.validateForm(form);
        if (!ok) {
          if (window.UI && typeof window.UI.toast === 'function') window.UI.toast('請補齊必填欄位', { type: 'warning' });
          return;
        }
      } else if (form && typeof form.reportValidity === 'function') {
        if (!form.reportValidity()) return;
      }
    } catch (e) {
      console.warn('customer form validate failed:', e);
    }

    CustomerUIForms._submitting = true;

    const submitBtn = document.querySelector('button[form="customer-form"][type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '儲存中...';
    }

    try {
      const formData = new FormData(form);
      const data = {};
      for (const [key, value] of formData.entries()) {
        data[key] = (value || '').toString();
      }

      const id = (data.id || '').trim();
      delete data.id;

      if (id) {
        await window._svc('CustomerService').update(id, data);
      } else {
        await window._svc('CustomerService').create(data);
      }

      window.customerUI.closeModal();
      window.customerUI.updateList();

    } catch (error) {
      console.error('Customer submit error:', error);
      const msg = '儲存失敗：' + (error?.message || error);
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
      else alert(msg);
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
      const msg = '確定要刪除此客戶？\n\n（軟刪除：可保留歷史資料）';
      const ok = (window.UI && typeof window.UI.confirm === 'function')
        ? await window.UI.confirm({ title: '確認刪除客戶', message: msg, okText: '刪除', cancelText: '取消', tone: 'danger' })
        : confirm(msg);
      if (!ok) return;
    }

    try {
      await window._svc('CustomerService').delete(id);
      window.customerUI.closeModal();
      window.customerUI.updateList();
    } catch (error) {
      console.error('Customer delete error:', error);
      const msg = '刪除失敗：' + (error?.message || error);
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
      else alert(msg);
    }
  }
});

console.log('✅ CustomerUIForms loaded');
