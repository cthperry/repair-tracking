/**
 * 維修管理 - UI 層（下拉自動完成（公司 / 聯絡人））
 * Extracted from repairs.ui.js (originally from line 2444)
 * Extends RepairUI.prototype (instance methods) and RepairUI (static methods).
 */

// Instance methods → RepairUI.prototype
Object.assign(RepairUI.prototype, {
  // ========================================
  // 公司下拉（自訂）
  // - 解決：公司欄位要換公司時，必須先手動刪除再選取的操作成本
  // - 保留：仍可直接輸入 + datalist 快速匹配
  // ========================================

  _closeCompanyDropdown(silent) {
    try {
      const el = this._companyDropdownEl;
      if (el && el.parentNode) el.parentNode.removeChild(el);
      this._companyDropdownEl = null;

      try { if (this._companyDropdownAC && typeof this._companyDropdownAC.abort === 'function') this._companyDropdownAC.abort(); } catch (_) {}
      this._companyDropdownAC = null;

      if (this._companyDropdownScrollHandler) {
        window.removeEventListener('scroll', this._companyDropdownScrollHandler, true);
        window.removeEventListener('resize', this._companyDropdownScrollHandler, true);
        this._companyDropdownScrollHandler = null;
      }
      if (this._companyDropdownOutsideHandler) {
        document.removeEventListener('mousedown', this._companyDropdownOutsideHandler, true);
        this._companyDropdownOutsideHandler = null;
      }
      if (this._companyDropdownKeyHandler) {
        document.removeEventListener('keydown', this._companyDropdownKeyHandler, true);
        this._companyDropdownKeyHandler = null;
      }
    } catch (e) {
      if (!silent) console.warn('_closeCompanyDropdown failed:', e);
    }
  },

  async toggleCompanyDropdown(event) {
    try {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // 先關閉其他下拉（避免兩個同時開啟造成遮擋/誤判）
      try { if (this._contactDropdownEl) this._closeContactDropdown(true); } catch (_) {}

      // 已開啟 → 關閉
      if (this._companyDropdownEl) {
        this._closeCompanyDropdown(true);
        return;
      }

      const customerEl = this._getFormEl('customer');
      if (!customerEl) return;

      if (!window._svc('CustomerService')) return;

      // 取得公司清單（去重）
      let all = [];
      try {
        all = (typeof window._svc('CustomerService').getAll === 'function')
          ? (window._svc('CustomerService').getAll() || [])
          : (Array.isArray(window._svc('CustomerService').customers) ? window._svc('CustomerService').customers : []);
      } catch (_) {
        all = [];
      }

      const seen = new Set();
      const names = [];
      for (const c of (all || [])) {
        const name = (c && !c.isDeleted ? (c.name || '') : '').toString().trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        names.push(name);
      }

      if (!names.length) return;

      let q = (customerEl.value || '').toString().trim().toLowerCase();
      const picked = (customerEl.dataset && customerEl.dataset.companyPicked === '1');
      if (picked) q = '';
      // 若目前欄位值已是「完整公司名」（精確匹配），視同已選定公司：下拉預設改顯示完整清單
      const exact = q && names.some(n => n.toLowerCase() === q);
      if (exact) q = '';
      let list = names;

      // 排序策略
      if (q) {
        // 有輸入：先過濾，再讓「開頭匹配」排前面
        list = names
          .filter(n => n.toLowerCase().includes(q))
          .sort((a, b) => {
            const aa = a.toLowerCase();
            const bb = b.toLowerCase();
            const as = aa.startsWith(q) ? 0 : 1;
            const bs = bb.startsWith(q) ? 0 : 1;
            if (as !== bs) return as - bs;
            return aa.localeCompare(bb, 'zh-Hant');
          });
      } else {
        // 無輸入：釘選優先，其餘依字母排序
        let settings = null;
        try { settings = await this.getSettingsSafe(); } catch (_) { settings = null; }
        const pinned = Array.isArray(settings?.pinnedCompanies) ? settings.pinnedCompanies : [];
        const pinnedKeys = new Set(pinned.map(x => String(x || '').toLowerCase()));

        const pinnedOrdered = [];
        for (const p of pinned) {
          const name = (p || '').toString().trim();
          if (!name) continue;
          const key = name.toLowerCase();
          if (!seen.has(key)) continue; // 不在客戶主檔就不顯示
          pinnedOrdered.push(name);
        }

        const rest = names
          .filter(n => !pinnedKeys.has(n.toLowerCase()))
          .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'zh-Hant'));

        list = [...pinnedOrdered, ...rest];
      }

      // 避免清單過長造成操作困難
      list = list.slice(0, 80);
      if (!list.length) return;

      const rect = customerEl.getBoundingClientRect();
      const dd = document.createElement('div');
      dd.className = 'rt-company-dd';
      dd.style.left = `${Math.max(8, rect.left)}px`;
      dd.style.width = `${Math.max(260, rect.width)}px`;

      const spaceBelow = window.innerHeight - rect.bottom;
      const preferHeight = Math.min(320, list.length * 42 + 16);
      if (spaceBelow < 180 && rect.top > 220) {
        const top = Math.max(8, rect.top - preferHeight - 8);
        dd.style.top = `${top}px`;
      } else {
        dd.style.top = `${Math.min(window.innerHeight - 8, rect.bottom + 6)}px`;
      }

      dd.innerHTML = list.map(name => {
        const safeText = this.escapeBasic(name);
        const safeAttr = this.escapeBasic(name);
        return `<div class="rt-company-item" data-name="${safeAttr}">${safeText}</div>`;
      }).join('');

      dd.addEventListener('click', (e) => {
        try {
          const item = e.target && e.target.closest ? e.target.closest('.rt-company-item') : null;
          if (!item) return;
          const name = (item.getAttribute('data-name') || '').toString();
          if (!name) return;
          // 套用公司（並自動刷新聯絡人/電話/Email）
          this.applyCompanyToForm(name);
          // 觸發 change：讓既有的監聽（例如序號提示）保持一致
          try { customerEl.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
          this._closeCompanyDropdown(true);
          try { customerEl.focus(); } catch (_) {}
        } catch (_) {
          this._closeCompanyDropdown(true);
        }
      });

      document.body.appendChild(dd);
      this._companyDropdownEl = dd;

      // CodeOpt：用 AbortController 管理 window/document 事件，避免重複綁定殘留
      try { if (this._companyDropdownAC && typeof this._companyDropdownAC.abort === 'function') this._companyDropdownAC.abort(); } catch (_) {}
      this._companyDropdownAC = (window.EventUtils && typeof window.EventUtils.createController === 'function')
        ? window.EventUtils.createController()
        : null;

      const onDD = (el, evt, fn, opts) => {
        try {
          if (window.EventUtils && typeof window.EventUtils.on === 'function') {
            window.EventUtils.on(el, evt, fn, opts, this._companyDropdownAC);
          } else if (el) {
            el.addEventListener(evt, fn, opts || false);
          }
        } catch (_) {
          try { el && el.addEventListener(evt, fn, opts || false); } catch (_) {}
        }
      };

      // 注意：scroll 事件在 capture 階段會吃到「下拉本身的滾動」，
      // 若一律關閉會造成「清單無法滾動」（一滑就被關閉）。
      // 因此只有「頁面/外部」滾動才關閉；清單內部滾動要忽略。
      this._companyDropdownScrollHandler = (ev) => {
        try {
          const t = ev && ev.target ? ev.target : null;
          if (t && this._companyDropdownEl && this._companyDropdownEl.contains(t)) return;
          this._closeCompanyDropdown(true);
        } catch (_) {
          try { this._closeCompanyDropdown(true); } catch (_) {}
        }
      };
      onDD(window, 'scroll', this._companyDropdownScrollHandler, { capture: true, passive: true });
      onDD(window, 'resize', this._companyDropdownScrollHandler, { capture: true, passive: true });

      this._companyDropdownOutsideHandler = (e) => {
        try {
          const t = e && e.target ? e.target : null;
          const btn = t && t.closest ? t.closest('.input-dropdown-btn[data-dd="company"]') : null;
          const inside = (this._companyDropdownEl && this._companyDropdownEl.contains(t)) || btn;
          if (!inside) this._closeCompanyDropdown(true);
        } catch (_) {
          this._closeCompanyDropdown(true);
        }
      };
      onDD(document, 'mousedown', this._companyDropdownOutsideHandler, { capture: true });

      this._companyDropdownKeyHandler = (e) => {
        if (e && e.key === 'Escape') this._closeCompanyDropdown(true);
      };
      onDD(document, 'keydown', this._companyDropdownKeyHandler, { capture: true });

    } catch (e) {
      console.warn('toggleCompanyDropdown failed:', e);
      try { this._closeCompanyDropdown(true); } catch (_) {}
    }
  },

  // ========================================
  // 聯絡人下拉（自訂）
  // ========================================

  _closeContactDropdown(silent) {
    try {
      const el = this._contactDropdownEl;
      if (el && el.parentNode) el.parentNode.removeChild(el);
      this._contactDropdownEl = null;

      try { if (this._contactDropdownAC && typeof this._contactDropdownAC.abort === 'function') this._contactDropdownAC.abort(); } catch (_) {}
      this._contactDropdownAC = null;

      // 清理：滾動/縮放監聽（避免下拉選單「卡住」在畫面上）
      if (this._contactDropdownScrollHandler) {
        window.removeEventListener('scroll', this._contactDropdownScrollHandler, true);
        window.removeEventListener('resize', this._contactDropdownScrollHandler, true);
        this._contactDropdownScrollHandler = null;
      }

      if (this._contactDropdownOutsideHandler) {
        document.removeEventListener('mousedown', this._contactDropdownOutsideHandler, true);
        this._contactDropdownOutsideHandler = null;
      }
      if (this._contactDropdownKeyHandler) {
        document.removeEventListener('keydown', this._contactDropdownKeyHandler, true);
        this._contactDropdownKeyHandler = null;
      }
    } catch (e) {
      if (!silent) console.warn('_closeContactDropdown failed:', e);
    }
  },

  toggleContactDropdown(event) {
    try {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // 先關閉公司下拉（避免同時開啟造成遮擋/誤判）
      try { if (this._companyDropdownEl) this._closeCompanyDropdown(true); } catch (_) {}

      // 已開啟 → 關閉
      if (this._contactDropdownEl) {
        this._closeContactDropdown(true);
        return;
      }

      const contactEl = this._getFormEl('contact');
      const companyEl = this._getFormEl('customer');
      if (!contactEl || !companyEl) return;

      const company = (companyEl.value || '').toString().trim();
      if (!company) return;
      if (!window._svc('CustomerService') || typeof window._svc('CustomerService').getContactsByCompanyName !== 'function') return;

      const raw = window._svc('CustomerService').getContactsByCompanyName(company) || [];
      const list = (raw || [])
        .filter(c => c && (c.contact || '').toString().trim())
        .map(c => ({
          contact: (c.contact || '').toString().trim(),
          phone: (c.phone || '').toString().trim(),
          email: (c.email || '').toString().trim()
        }));

      if (list.length <= 0) return;

      // 去重：同 contact 若電話/Email 不同，仍保留第一筆（避免清單爆長）
      const seen = new Set();
      const uniq = [];
      for (const it of list) {
        const key = it.contact.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        uniq.push(it);
      }

      const rect = contactEl.getBoundingClientRect();
      const dd = document.createElement('div');
      dd.className = 'rt-contact-dd';
      dd.style.left = `${Math.max(8, rect.left)}px`;
      dd.style.width = `${Math.max(220, rect.width)}px`;

      // 盡量往下展開；若下方空間不足則往上
      const spaceBelow = window.innerHeight - rect.bottom;
      const preferHeight = Math.min(260, uniq.length * 54 + 16);
      if (spaceBelow < 160 && rect.top > 200) {
        const top = Math.max(8, rect.top - preferHeight - 8);
        dd.style.top = `${top}px`;
      } else {
        dd.style.top = `${Math.min(window.innerHeight - 8, rect.bottom + 6)}px`;
      }

      dd.innerHTML = uniq.map(it => {
        const safeName = (it.contact || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const meta = [it.phone, it.email].filter(Boolean).join(' / ');
        const safeMeta = meta.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const dataName = (it.contact || '').replace(/"/g, '&quot;');
        const dataPhone = (it.phone || '').replace(/"/g, '&quot;');
        const dataEmail = (it.email || '').replace(/"/g, '&quot;');
        return `
          <div class="rt-contact-item" data-name="${dataName}" data-phone="${dataPhone}" data-email="${dataEmail}">
            <div class="name">${safeName}</div>
            ${safeMeta ? `<div class="meta">${safeMeta}</div>` : ''}
          </div>
        `;
      }).join('');

      // 使用 click：允許清單滾動（pointerdown 會在觸控滑動時誤判為點選，造成「卡住/無法滑動」）
      dd.addEventListener('click', (e) => {
        try {
          const item = e.target && e.target.closest ? e.target.closest('.rt-contact-item') : null;
          if (!item) return;
          const name = (item.getAttribute('data-name') || '').toString();
          if (!name) return;
          contactEl.value = name;
          // 以同一套邏輯帶入 phone/email（允許覆寫先前的自動帶入值）
          this.handleContactPick({ target: { value: name } });
          this._closeContactDropdown(true);
          try { contactEl.focus(); } catch (_) {}
        } catch (_) {
          this._closeContactDropdown(true);
        }
      });

      document.body.appendChild(dd);
      this._contactDropdownEl = dd;

      // CodeOpt：用 AbortController 管理 window/document 事件，避免重複綁定殘留
      try { if (this._contactDropdownAC && typeof this._contactDropdownAC.abort === 'function') this._contactDropdownAC.abort(); } catch (_) {}
      this._contactDropdownAC = (window.EventUtils && typeof window.EventUtils.createController === 'function')
        ? window.EventUtils.createController()
        : null;

      const onDDContact = (el, evt, fn, opts) => {
        try {
          if (window.EventUtils && typeof window.EventUtils.on === 'function') {
            window.EventUtils.on(el, evt, fn, opts, this._contactDropdownAC);
          } else if (el) {
            el.addEventListener(evt, fn, opts || false);
          }
        } catch (_) {
          try { el && el.addEventListener(evt, fn, opts || false); } catch (_) {}
        }
      };

      // 任何滾動/縮放時關閉（下拉選單使用 position:fixed，避免表單捲動後選單位置不對而像「卡住」）
      // 同上：scroll capture 會抓到下拉本身的 scroll，若不判斷 target
      // 會導致聯絡人清單無法滾動。
      this._contactDropdownScrollHandler = (ev) => {
        try {
          const t = ev && ev.target ? ev.target : null;
          if (t && this._contactDropdownEl && this._contactDropdownEl.contains(t)) return;
          this._closeContactDropdown(true);
        } catch (_) {
          try { this._closeContactDropdown(true); } catch (_) {}
        }
      };
      onDDContact(window, 'scroll', this._contactDropdownScrollHandler, { capture: true, passive: true });
      onDDContact(window, 'resize', this._contactDropdownScrollHandler, { capture: true, passive: true });

      // 點擊外部關閉
      this._contactDropdownOutsideHandler = (e) => {
        try {
          const t = e && e.target ? e.target : null;
          const btn = t && t.closest ? t.closest('.input-dropdown-btn[data-dd="contact"]') : null;
          const inside = (this._contactDropdownEl && (this._contactDropdownEl.contains(t))) || btn;
          if (!inside) this._closeContactDropdown(true);
        } catch (_) {
          this._closeContactDropdown(true);
        }
      };
      onDDContact(document, 'mousedown', this._contactDropdownOutsideHandler, { capture: true });

      this._contactDropdownKeyHandler = (e) => {
        if (e && e.key === 'Escape') this._closeContactDropdown(true);
      };
      onDDContact(document, 'keydown', this._contactDropdownKeyHandler, { capture: true });

    } catch (e) {
      console.warn('toggleContactDropdown failed:', e);
      try { this._closeContactDropdown(true); } catch (_) {}
    }
  },

  /**
   * 表單後處理：載入「常用公司/最近使用」、綁定釘選與歷史帶入
   */
  async afterRenderForm() {
    // event binding (avoid duplicate)
    // CodeOpt：以 AbortController 管理表單事件，避免重複綁定與殘留
    try { if (this._formAC && typeof this._formAC.abort === 'function') this._formAC.abort(); } catch (_) {}
    this._formAC = (window.EventUtils && typeof window.EventUtils.createController === 'function')
      ? window.EventUtils.createController()
      : null;

    const onForm = (el, evt, fn, opts) => {
      try {
        if (window.EventUtils && typeof window.EventUtils.on === 'function') {
          window.EventUtils.on(el, evt, fn, opts, this._formAC);
        } else if (el) {
          el.addEventListener(evt, fn, opts || false);
        }
      } catch (_) {
        try { el && el.addEventListener(evt, fn, opts || false); } catch (_) {}
      }
    };

    const pinBtn = document.getElementById('btn-pin-company');
    const histBtn = document.getElementById('btn-history-company');
    const customerEl = document.querySelector('#repair-form input[name="customer"]');

    // baseline：記住當前公司（用於「公司變更」時清空並重新帶入聯絡人資料）
    try {
      const cur = (customerEl?.value || '').toString().trim();
      this._lastCustomerCompany = cur;
      // 是否存在於客戶主檔（避免使用者輸入中途字串被誤判）
      if (window._svc('CustomerService')) {
        const norm = (s) => (s || '').toString().trim().toLowerCase();
        const key = norm(cur);
        const all = (typeof window._svc('CustomerService').getAll === 'function')
          ? window._svc('CustomerService').getAll()
          : (Array.isArray(window._svc('CustomerService').customers) ? window._svc('CustomerService').customers : []);
        this._lastCustomerCompanyValid = !!(key && (all || []).some(c => c && !c.isDeleted && norm(c.name) === key));
      } else {
        this._lastCustomerCompanyValid = false;
      }
    } catch (_) {
      this._lastCustomerCompany = (customerEl?.value || '').toString().trim();
      this._lastCustomerCompanyValid = false;
    }

    if (pinBtn && !pinBtn.dataset.bound) {
      pinBtn.dataset.bound = '1';
      const onPin = async () => {
        const company = (customerEl?.value || '').toString().trim();
        if (!company) return;
        await this.togglePinnedCompany(company);
      };
      onForm(pinBtn, 'click', (window.guard ? window.guard(onPin, 'RepairsForm') : onPin));
    }

    if (histBtn && !histBtn.dataset.bound) {
      histBtn.dataset.bound = '1';
      const onHist = () => { this.openHistoryPicker(); };
      onForm(histBtn, 'click', (window.guard ? window.guard(onHist, 'RepairsForm') : onHist));
    }

    if (customerEl && !customerEl.dataset.boundQuick) {
      customerEl.dataset.boundQuick = '1';
      onForm(customerEl, 'input', () => {
        this.refreshPinButtonState();
        // 使用 debounce：避免每次鍵入都重算聯絡人清單
        try {
          if (this._customerPickTimer) clearTimeout(this._customerPickTimer);
          this._customerPickTimer = setTimeout(() => {
            try { this.handleCustomerPick({ target: customerEl }); } catch (_) {}
          }, 120);
        } catch (_) {}
        try { if (typeof this.updateSerialHints === 'function') this.updateSerialHints(); } catch (_) {}
      });
      onForm(customerEl, 'change', () => {
        this.refreshPinButtonState();
        // 變更（含 datalist 選取）時立即刷新聯絡人清單並帶入
        try { this.handleCustomerPick({ target: customerEl }); } catch (_) {}
        try { if (typeof this.updateSerialHints === 'function') this.updateSerialHints(); } catch (_) {}
      });

      // P0：公司已選定時，點一下輸入框即可開啟清單（免先刪除）
      onForm(customerEl, 'click', () => {
        try {
          const v = (customerEl.value || '').toString().trim();
          const picked = (customerEl.dataset && customerEl.dataset.companyPicked === '1');
          if (!v || !picked) return;
          // 若清單已開啟則不重複開（避免閃爍）
          if (this._companyDropdownEl) return;
          setTimeout(() => { try { this.toggleCompanyDropdown(); } catch (_) {} }, 0);
        } catch (_) {}
      });

      // P0：鍵盤快速開啟公司清單（F4 / Alt+↓）
      onForm(customerEl, 'keydown', (e) => {
        try {
          if (!e) return;
          const k = e.key;
          if (k === 'F4' || (k === 'ArrowDown' && e.altKey)) {
            e.preventDefault();
            this.toggleCompanyDropdown();
          }
        } catch (_) {}
      });
    }

    // chips (pinned / recent)
    try {
      await this.refreshCompanyQuickPicks({ force: true });
    } catch (e) {
      console.warn('refreshCompanyQuickPicks failed:', e);
      const pinnedEl = document.getElementById('pinned-company-chips');
      if (pinnedEl) pinnedEl.innerHTML = `<span class="muted">載入失敗</span>`;
      const recentEl = document.getElementById('recent-company-chips');
      if (recentEl && !recentEl.innerHTML) recentEl.innerHTML = `<span class="muted">載入失敗</span>`;
    }
    this.refreshPinButtonState();

    // 模板下拉（V161.127）：必須在表單初次 render 後立即綁定
    // 避免必須先觸發「公司名稱 input」才會填入模板選項。
    try {
      if (typeof this.bindTemplatePicker === 'function') this.bindTemplatePicker();
    } catch (_) {}

    // 設備產品線/機型級聯選擇（若 forms 模組有提供則初始化）
    try {
      if (typeof this.initEquipmentPicker === 'function') this.initEquipmentPicker();
    } catch (e) {
      console.warn('initEquipmentPicker failed in afterRenderForm:', e);
    }

    // P0：若為「複製」流程，帶入來源欄位（需在設備選擇器初始化後）
    try {
      if (typeof this._applyDuplicatePrefill === 'function') this._applyDuplicatePrefill();
    } catch (e) {
      console.warn('_applyDuplicatePrefill failed in afterRenderForm:', e);
    }

    // 序號提示 chips click（同公司+同機型 最近序號）
    const serialChipsEl = document.getElementById('serial-suggest-chips');
    if (serialChipsEl && !serialChipsEl.dataset.bound) {
      serialChipsEl.dataset.bound = '1';
      onForm(serialChipsEl, 'click', (e) => {
        const btn = e.target?.closest?.('button[data-serial]');
        if (!btn) return;
        const serial = (btn.getAttribute('data-serial') || '').toString();
        const serialInput = document.querySelector('#repair-form input[name="serialNumber"]');
        if (serialInput) {
          serialInput.value = serial;
          try { serialInput.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
        }
      });
    }

    try { if (typeof this.updateSerialHints === 'function') this.updateSerialHints(); } catch (_) {}

    // P3：必填欄位即時驗證提示（不新增 required，只針對既有 required 欄位）
    try {
      const form = document.getElementById('repair-form');
      if (form && window.FormValidate) {
        window.FormValidate.bindForm(form);
        window.FormValidate.resetForm(form);
      }
    } catch (e) {
      console.warn('FormValidate bind failed:', e);
    }
  },

  /**
   * 取得設定（含保底）
   */
  async getSettingsSafe() {
    try {
      if (window._svc('SettingsService') && typeof window._svc('SettingsService').getSettings === 'function') {
        const s = await window._svc('SettingsService').getSettings();
        return s || (window.SettingsModel ? window.SettingsModel.defaultSettings() : {});
      }
    } catch (e) {
      console.warn('getSettingsSafe failed:', e);
    }
    return (window.SettingsModel ? window.SettingsModel.defaultSettings() : {});
  },

  /**
   * 序號提示：同公司 + 同機型 最近序號（可點選快速帶入）
   */
  updateSerialHints() {
    try {
      const wrap = document.getElementById('serial-suggest');
      const chipsEl = document.getElementById('serial-suggest-chips');
      if (!wrap || !chipsEl) return;

      const customer = (document.querySelector('#repair-form input[name="customer"]')?.value || '').toString().trim();
      const machine = (document.getElementById('machine-final')?.value || '').toString().trim();
      const excludeId = (document.querySelector('#repair-form input[name="id"]')?.value || '').toString().trim();

      if (!customer || !machine || !window._svc('RepairService')) {
        wrap.style.display = 'none';
        chipsEl.innerHTML = '';
        return;
      }

      let serials = [];
      if (typeof window._svc('RepairService').getRecentSerialNumbers === 'function') {
        serials = window._svc('RepairService').getRecentSerialNumbers({ customer, machine, excludeId, limit: 6 }) || [];
      } else if (typeof window._svc('RepairService').getAll === 'function') {
        // fallback：使用 getAll() 篩選（較慢，但保底）
        const all = window._svc('RepairService').getAll() || [];
        const toEpoch = (window.TimeUtils && typeof window.TimeUtils.toEpoch === "function")
          ? ((v, fb = 0) => window.TimeUtils.toEpoch(v, fb))
          : ((v, fb = 0) => { const t = Date.parse(String(v ?? "")); return Number.isFinite(t) ? t : fb; });

        const toTime = (r) => {
          const s = (r && (r.updatedAt || r.createdAt)) ? String(r.updatedAt || r.createdAt) : '';
          const t1 = toEpoch(s, 0);
          if (t1) return t1;
          const d = (r && r.createdDate) ? String(r.createdDate) : "";
          const t2 = toEpoch(d ? `${d}T00:00:00+08:00` : "", 0);
          return t2;

        };
        const c = customer.toLowerCase();
        const m = machine.toLowerCase();
        const filtered = all.filter(r => {
          if (!r) return false;
          if (excludeId && String(r.id || '') === excludeId) return false;
          if (String(r.customer || '').trim().toLowerCase() !== c) return false;
          if (String(r.machine || '').trim().toLowerCase() !== m) return false;
          return !!String(r.serialNumber || '').trim();
        }).sort((a, b) => toTime(b) - toTime(a));
        const seen = new Set();
        for (const r of filtered) {
          const sn = String(r.serialNumber || '').trim();
          const key = sn.toLowerCase();
          if (!sn || seen.has(key)) continue;
          seen.add(key);
          serials.push(sn);
          if (serials.length >= 6) break;
        }
      }

      if (!Array.isArray(serials) || serials.length === 0) {
        wrap.style.display = 'none';
        chipsEl.innerHTML = '';
        return;
      }

      wrap.style.display = '';
      chipsEl.innerHTML = serials.map(sn => {
        const safe = this.escapeBasic(sn);
        return `<button type="button" class="chip quick" data-serial="${safe}" title="套用序號">${safe}</button>`;
      }).join('');
    } catch (e) {
      console.warn('updateSerialHints failed:', e);
    }
  },


  escapeBasic(input) {
    return (input ?? '').toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * 刷新：常用公司 / 最近使用 Chips
   */
  async refreshCompanyQuickPicks(opts = {}) {
    const pinnedEl = document.getElementById('pinned-company-chips');
    const recentEl = document.getElementById('recent-company-chips');
    if (!pinnedEl && !recentEl) return;

    // 先給使用者立即回饋（避免停在空白或永遠顯示舊狀態）
    if (pinnedEl) pinnedEl.innerHTML = `<span class="muted">載入中...</span>`;
    if (recentEl) recentEl.innerHTML = `<span class="muted">載入中...</span>`;

    let settings;
    try {
      settings = await this.getSettingsSafe();
    } catch (e) {
      console.warn('getSettingsSafe failed in refreshCompanyQuickPicks:', e);
      settings = (window.SettingsModel ? window.SettingsModel.defaultSettings() : {});
    }
    const topN = Number(settings.pinnedTopN || 8);
    const pinned = Array.isArray(settings.pinnedCompanies) ? settings.pinnedCompanies.slice(0, Math.max(1, Math.min(12, topN))) : [];

    const pinnedKeys = new Set((pinned || []).map(x => String(x || '').toLowerCase()));

    // pinned
    if (pinnedEl) {
      if (!pinned.length) {
        pinnedEl.innerHTML = `<span class="muted">尚未設定</span>`;
      } else {
        pinnedEl.innerHTML = pinned.map(name => {
          const safe = this.escapeBasic(name);
          return `<button type="button" class="chip quick" data-company="${safe}" title="套用公司">${safe}</button>`;
        }).join('');
      }

      if (!pinnedEl.dataset.bound) {
        pinnedEl.dataset.bound = '1';
        pinnedEl.addEventListener('click', (e) => {
          const btn = e.target?.closest?.('button[data-company]');
          if (!btn) return;
          const company = (btn.getAttribute('data-company') || '').toString();
          this.applyCompanyToForm(company);
        });
      }
    }

    // recent (unique, exclude pinned)
    if (recentEl) {
      const limit = Number(settings.recentCompaniesLimit ?? 8);
      const recentCompanies = this.getRecentCompanies(Math.max(0, Math.min(20, limit)), pinnedKeys);

      if (!recentCompanies.length) {
        recentEl.innerHTML = `<span class="muted">尚無近期紀錄</span>`;
      } else {
        recentEl.innerHTML = recentCompanies.map(name => {
          const safe = this.escapeBasic(name);
          return `<button type="button" class="chip quick" data-company="${safe}" title="套用公司">${safe}</button>`;
        }).join('');
      }

      if (!recentEl.dataset.bound) {
        recentEl.dataset.bound = '1';
        recentEl.addEventListener('click', (e) => {
          const btn = e.target?.closest?.('button[data-company]');
          if (!btn) return;
          const company = (btn.getAttribute('data-company') || '').toString();
          this.applyCompanyToForm(company);
        });
      }
    }
  },

  getRecentCompanies(limit, pinnedKeys) {
    try {
      if (!window._svc('RepairService') || typeof window._svc('RepairService').getAll !== 'function') return [];
      const list = window._svc('RepairService').getAll() || [];
      const toTs = (x) => {
        const t = new Date(x || 0).getTime();
        return Number.isFinite(t) ? t : 0;
      };
      const sorted = [...list].sort((a, b) => {
        const ta = Math.max(toTs(a.updatedAt), toTs(a.createdAt));
        const tb = Math.max(toTs(b.updatedAt), toTs(b.createdAt));
        return tb - ta;
      });

      const seen = new Set();
      const out = [];
      for (const r of sorted) {
        const name = (r.customer || '').toString().trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (pinnedKeys && pinnedKeys.has(key)) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(name);
        if (out.length >= limit) break;
      }
      return out;
    } catch (e) {
      console.warn('getRecentCompanies failed:', e);
      return [];
    }
  },

  /**
   * 套用公司到表單 + 更新聯絡人清單
   */
  applyCompanyToForm(company) {
    const customerEl = document.querySelector('#repair-form input[name="customer"]');
    if (!customerEl) return;
    customerEl.value = (company || '').toString().trim();
    // 同步更新聯絡人 datalist
    this.handleCustomerPick({ target: customerEl });
    this.refreshPinButtonState();
  },

  /**
   * 刷新釘選按鈕狀態
   */
  async refreshPinButtonState() {
    const btn = document.getElementById('btn-pin-company');
    const customerEl = document.querySelector('#repair-form input[name="customer"]');
    if (!btn || !customerEl) return;

    const company = (customerEl.value || '').toString().trim();
    if (!company) {
      btn.textContent = '釘選';
      btn.classList.remove('primary');
      return;
    }

    const settings = await this.getSettingsSafe();
    const arr = Array.isArray(settings.pinnedCompanies) ? settings.pinnedCompanies : [];
    const key = company.toLowerCase();
    const pinned = arr.some(x => String(x || '').toLowerCase() === key);

    btn.textContent = pinned ? '已釘選' : '釘選';
    btn.classList.toggle('primary', pinned);
  },

  /**
   * 釘選 / 取消釘選（以公司名稱為主）
   */
  async togglePinnedCompany(company) {
    if (!company) return;
    if (!window._svc('SettingsService') || typeof window._svc('SettingsService').getSettings !== 'function') return;

    const settings = await this.getSettingsSafe();
    const arr = Array.isArray(settings.pinnedCompanies) ? [...settings.pinnedCompanies] : [];
    const key = company.toLowerCase();
    const idx = arr.findIndex(x => String(x || '').toLowerCase() === key);

    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      // 新釘選放最前面，提高優先順序
      arr.unshift(company);
    }

    await window._svc('SettingsService').update({
      pinnedTopN: settings.pinnedTopN || 8,
      pinnedCompanies: arr
    });

    // refresh ui
    await this.refreshCompanyQuickPicks();
    await this.refreshPinButtonState();
  },

  /**
   * 歷史帶入：顯示該公司最近維修單，快速帶入聯絡資訊/設備資訊
   */
  async openHistoryPicker() {
    const customerEl = document.querySelector('#repair-form input[name="customer"]');
    const company = (customerEl?.value || '').toString().trim();
    if (!company) {
      const msg = '請先輸入公司名稱';
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'warning' });
      else alert(msg);
      return;
    }
    if (!window._svc('RepairService') || typeof window._svc('RepairService').getAll !== 'function') {
      const msg = 'RepairService 尚未就緒';
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
      else alert(msg);
      return;
    }

    // build list
    const all = window._svc('RepairService').getAll() || [];
    const toTs = (x) => {
      const t = new Date(x || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    const list = all
      .filter(r => (r.customer || '').toString().trim().toLowerCase() === company.toLowerCase())
      .sort((a, b) => Math.max(toTs(b.updatedAt), toTs(b.createdAt)) - Math.max(toTs(a.updatedAt), toTs(a.createdAt)))
      .slice(0, 30);

    const esc = (s) => this.escapeBasic(s);

    const modalId = 'history-picker-modal';
    // ensure single
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    modal.style.zIndex = '1200';

    const itemsHtml = list.length ? list.map(r => {
      const title = `${r.repairNo || r.id || ''}`.trim();
      const machine = (r.machine || '').toString().trim();
      const contact = (r.contact || '').toString().trim();
      const meta = [
        machine ? `設備：${machine}` : '',
        contact ? `聯絡人：${contact}` : '',
        r.status ? `狀態：${r.status}` : ''
      ].filter(Boolean).join('　');
      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('zh-TW') : '';
      return `
        <div class="list-item">
          <div class="left">
            <div class="title">${esc(title)} <span class="tag">${esc(dateStr)}</span></div>
            <div class="meta">${esc(meta || '—')}</div>
          </div>
          <div class="right">
            <button type="button" class="btn sm primary" data-act="apply" data-id="${esc(r.id)}">帶入</button>
          </div>
        </div>
      `;
    }).join('') : `<div class="muted">找不到該公司歷史維修單</div>`;

    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content modal-wide">
        <div class="modal-header">
          <div style="min-width:0;">
            <div class="modal-title">歷史帶入：${esc(company)}</div>
            <div class="muted" style="margin-top:4px;">點選「帶入」將套用聯絡資訊與設備資訊（不會覆寫問題描述/工作內容）</div>
          </div>
          <button type="button" class="btn ghost" data-act="close">關閉</button>
        </div>

        <div class="modal-body">
          <div class="settings-row" style="gap:8px;">
            <input class="input" id="history-picker-search" placeholder="搜尋（設備/聯絡人/單號）" />
            <button type="button" class="btn ghost" data-act="clear">清除</button>
          </div>

          <div class="list history-picker-list" id="history-picker-list">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      const el = document.getElementById(modalId);
      if (el) el.remove();
    };

    modal.querySelector('.modal-backdrop')?.addEventListener('click', close);
    modal.querySelector('button[data-act="close"]')?.addEventListener('click', close);

    const listEl = modal.querySelector('#history-picker-list');
    const searchEl = modal.querySelector('#history-picker-search');
    const clearBtn = modal.querySelector('button[data-act="clear"]');

    const renderFiltered = (keyword) => {
      const kw = (keyword || '').toString().trim().toLowerCase();
      const filtered = !kw ? list : list.filter(r => {
        const blob = `${r.repairNo||''} ${r.machine||''} ${r.contact||''} ${r.email||''} ${r.phone||''}`.toLowerCase();
        return blob.includes(kw);
      });
      if (!listEl) return;
      if (!filtered.length) {
        listEl.innerHTML = `<div class="muted">沒有符合的歷史資料</div>`;
        return;
      }
      listEl.innerHTML = filtered.map(r => {
        const title = `${r.repairNo || r.id || ''}`.trim();
        const machine = (r.machine || '').toString().trim();
        const contact = (r.contact || '').toString().trim();
        const meta = [
          machine ? `設備：${machine}` : '',
          contact ? `聯絡人：${contact}` : '',
          r.status ? `狀態：${r.status}` : ''
        ].filter(Boolean).join('　');
        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('zh-TW') : '';
        return `
          <div class="list-item">
            <div class="left">
              <div class="title">${esc(title)} <span class="tag">${esc(dateStr)}</span></div>
              <div class="meta">${esc(meta || '—')}</div>
            </div>
            <div class="right">
              <button type="button" class="btn sm primary" data-act="apply" data-id="${esc(r.id)}">帶入</button>
            </div>
          </div>
        `;
      }).join('');
    };

    let searchTimer = null;
    if (searchEl) {
      searchEl.addEventListener('input', () => {
        try { if (searchTimer) clearTimeout(searchTimer); } catch (_) {}
        searchTimer = setTimeout(() => {
          renderFiltered(searchEl.value);
        }, 300);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        try { if (searchTimer) clearTimeout(searchTimer); } catch (_) {}
        searchTimer = null;
        if (searchEl) searchEl.value = '';
        renderFiltered('');
      });
    }

    if (listEl) {
      const onApply = async (e) => {
        const btn = e.target?.closest?.('button[data-act="apply"]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        await this.applyHistoryToForm(id);
        close();
      };
      listEl.addEventListener('click', (window.guard ? window.guard(onApply, 'RepairsHistory') : onApply));
    }
  },

  /**
   * 將歷史資料套用到表單（聯絡資訊/設備資訊）
   * 規則：不跳確認，永遠直接覆寫（包含空值也會覆寫）
   * 僅覆寫聯絡/設備欄位，不影響問題描述/工作內容。
   */
  async applyHistoryToForm(repairId) {
    const r = window._svc('RepairService')?.get?.(repairId);
    if (!r) return;

    const form = document.getElementById('repair-form');
    if (!form) return;

    const norm = (v) => (v == null ? '' : String(v));

    const machineVal = norm(r.machine).toString().trim();

    const inferProductLine = (machineName) => {
      try {
        const name = (machineName || '').toString().trim();
        if (!name) return '';
        const catalog = (window.AppConfig && typeof window.AppConfig.getMachineCatalog === 'function')
          ? window.AppConfig.getMachineCatalog()
          : ((window.AppConfig && window.AppConfig.business && window.AppConfig.business.machineCatalog)
            ? window.AppConfig.business.machineCatalog
            : {});
        for (const [line, models] of Object.entries(catalog || {})) {
          if (Array.isArray(models) && models.includes(name)) return line;
        }
      } catch (_) {}
      return '';
    };

    const productLineVal = norm(r.productLine).toString().trim() || inferProductLine(machineVal);

    const fields = [
      ['contact', r.contact],
      ['phone', r.phone],
      ['email', r.email],
      ['serialNumber', r.serialNumber]
    ];

    for (const [name, value] of fields) {
      const el = (window.DomUtils && typeof window.DomUtils.byName === 'function')
        ? window.DomUtils.byName(form, name)
        : form.querySelector(`[name="${name}"]`);
      if (!el) continue;
      el.value = norm(value);
    }

    // 產品線 / 設備：同步到顯示用欄位（select / manual）與最終 machine 值
    const plEl = document.getElementById('product-line')
      || ((window.DomUtils && window.DomUtils.byName) ? window.DomUtils.byName(form, 'productLine') : form.querySelector('[name="productLine"]'));
    if (plEl) plEl.value = productLineVal;

    const machineEl = document.getElementById('machine-final')
      || ((window.DomUtils && window.DomUtils.byName) ? window.DomUtils.byName(form, 'machine') : form.querySelector('[name="machine"]'));
    if (machineEl) machineEl.value = machineVal;

    try {
      if (typeof this._syncEquipmentPickerState === 'function') {
        this._syncEquipmentPickerState({ productLine: productLineVal, currentMachine: machineVal });
      }
    } catch (e) {
      console.warn('applyHistoryToForm: sync equipment picker failed:', e);
    }

    try { if (typeof this.updateSerialHints === 'function') this.updateSerialHints(); } catch (_) {}


    // 同步更新聯絡人清單（若有選公司）
    const customerEl = (window.DomUtils && window.DomUtils.byName)
      ? window.DomUtils.byName(form, 'customer')
      : form.querySelector('[name="customer"]');
    if (customerEl && customerEl.value) {
      this.handleCustomerPick({ target: customerEl });
    }
  }
});

// Static methods → RepairUI
Object.assign(RepairUI, {

  toggleCompanyDropdown(event) {
    try {
      const instance = window.repairUI;
      if (!instance || typeof instance.toggleCompanyDropdown !== 'function') return;
      return instance.toggleCompanyDropdown(event);
    } catch (e) {
      console.warn('RepairUI.toggleCompanyDropdown wrapper failed:', e);
    }
  },

  /**
   * Static wrapper：供 UI 內 inline onclick 使用（RepairUI.toggleContactDropdown）。
   * 本專案採用 RepairUI(class) + repairUI(instance) 並存；
   * 因此所有 inline onclick 必須走 static wrapper 才能呼叫 instance method。
   */
  toggleContactDropdown(event) {
    try {
      const instance = window.repairUI;
      if (!instance || typeof instance.toggleContactDropdown !== 'function') return;
      return instance.toggleContactDropdown(event);
    } catch (e) {
      console.warn('RepairUI.toggleContactDropdown wrapper failed:', e);
    }
  },


  focusWorklog(repairId, mode) {
    const rid = (repairId || '').toString();
    const section = document.getElementById('repair-worklog-section');
    if (section && typeof section.scrollIntoView === 'function') {
      try { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) { section.scrollIntoView(true); }
    }
    if ((mode || '') === 'add' && window.WorkLogUI && typeof window.WorkLogUI.showAddForm === 'function') {
      try { window.WorkLogUI.showAddForm(rid); } catch (_) {}
    }
  },

  /**
   * Static wrappers for inline handlers
   */
  handleCustomerPick(event) {
    const instance = window.repairUI;
    if (instance && typeof instance.handleCustomerPick === 'function') {
      instance.handleCustomerPick(event);
      instance.refreshPinButtonState?.();
    }
  },

  handleContactPick(event) {
    const instance = window.repairUI;
    if (instance && typeof instance.handleContactPick === 'function') {
      instance.handleContactPick(event);
    }
  }
});

