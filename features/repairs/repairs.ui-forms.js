/**
 * 維修管理 - UI 層（續）
 * V160 - Repairs Module - UI Layer (Forms & Details)
 * 
 * 擴充 RepairUI 類別，新增表單和詳情渲染功能
 */


// Phase 1：registry-first 取得 Service（避免直接 window.XxxService）
// 注意：本專案為非 module script（同一 global scope），避免宣告可重複載入時會衝突的 top-level const。
// 擴充 RepairUI 原型
Object.assign(RepairUI.prototype, {
  /**
   * 渲染表單（新增/編輯）
   */
  renderForm() {
    const isEdit = !!this.currentRepair;
    // 新增模式要吃 AppConfig 預設值，否則 <select> 會落到第一個 option（目前是「低」）
    const repair = this.currentRepair || {
      status: AppConfig.business.defaults.repairStatus,
      progress: AppConfig.business.defaults.progress,
      priority: AppConfig.business.defaults.priority
    };

    // 注意：新增維修單不得帶入「上一次選擇」的預設值（避免造成誤填/誤判為內建值）
    // - 版本：V161.133 起取消 localStorage 的 recent defaults 行為
    // - 仍保留 AppConfig 的系統預設值（status/progress/priority）
    const statuses = AppConfig.business.repairStatus;
    const priorities = AppConfig.business.priority;

    const escapeHtml = (input) => {
      const s = (input === null || input === undefined) ? '' : String(input);
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
    const escapeAttr = (input) => escapeHtml(input).split('\\n').join(' ').split('\\r').join(' ');

    // 公司清單（以 customers.name 去重）
    const companies = (window._svc('CustomerService') && typeof window._svc('CustomerService').getCompanies === 'function')
      ? window._svc('CustomerService').getCompanies()
      : (window._svc('CustomerService') && typeof window._svc('CustomerService').getAll === 'function'
          ? Array.from(new Set(window._svc('CustomerService').getAll().map(c => (c.name || '').toString().trim()).filter(Boolean)))
          : []);
    const companyOptions = (companies || []).map(name => {
      const safe = escapeAttr(name || '');
      return safe ? `<option value="${safe}"></option>` : '';
    }).join('');

    // 聯絡人清單（依公司動態）
    const companyName = (repair.customer || '').toString().trim();
    const contacts = (window._svc('CustomerService') && typeof window._svc('CustomerService').getContactsByCompanyName === 'function' && companyName)
      ? window._svc('CustomerService').getContactsByCompanyName(companyName)
      : [];
    const contactOptions = Array.from(new Set((contacts || []).map(c => (c.contact || '').toString().trim()).filter(Boolean)))
      .map(n => {
        const safe = escapeAttr(n || '');
        return safe ? `<option value="${safe}"></option>` : '';
      }).join('');

    // 維修日期（createdDate：YYYY-MM-DD）
    const todayStr = (window.RepairModel && typeof window.RepairModel.getTaiwanDateString === 'function')
      ? window.RepairModel.getTaiwanDateString(new Date())
      : new Date().toISOString().slice(0, 10);
    const createdDateValue = escapeAttr((repair.createdDate || todayStr) || todayStr);

    // 收費/下單狀態（billing）
    const billing = (repair && typeof repair === 'object' && repair.billing && typeof repair.billing === 'object') ? repair.billing : {};
    const chargeableVal = (billing.chargeable === true) ? 'true' : (billing.chargeable === false ? 'false' : 'null');
    const orderStatusVal = (billing.orderStatus === 'ordered') ? 'ordered' : (billing.orderStatus === 'not_ordered' ? 'not_ordered' : 'null');
    const notOrderedStageVal = ((billing.notOrdered && typeof billing.notOrdered === 'object') ? (billing.notOrdered.stageCode || '') : '').toString();
    const notOrderedReasonVal = ((billing.notOrdered && typeof billing.notOrdered === 'object') ? (billing.notOrdered.reasonCode || '') : (billing.notOrderedReason || '')).toString();
    const notOrderedNoteVal = ((billing.notOrdered && typeof billing.notOrdered === 'object') ? (billing.notOrdered.note || '') : '').toString();
    const notOrderedStageOptions = (window.AppConfig && typeof window.AppConfig.getBillingNotOrderedStageOptions === 'function')
      ? window.AppConfig.getBillingNotOrderedStageOptions()
      : [
          { value: 'quote_pending', label: '待報價' },
          { value: 'procurement', label: '請購中' },
          { value: 'reviewing', label: '客戶評估中' },
          { value: 'budget_review', label: '預算確認中' },
          { value: 'on_hold', label: '暫緩' },
          { value: 'other', label: '其他' }
        ];
    const notOrderedReasonOptions = (window.AppConfig && typeof window.AppConfig.getBillingNotOrderedReasonOptions === 'function')
      ? window.AppConfig.getBillingNotOrderedReasonOptions()
      : [
          { value: 'price', label: '價格過高' },
          { value: 'budget', label: '客戶預算不足' },
          { value: 'internal', label: '客戶內部流程/延後' },
          { value: 'spec', label: '規格/內容待確認' },
          { value: 'other', label: '其他' }
        ];

    // 設備產品線 / 機型清單（選擇產品線後，設備名稱提供對應機型）
    const machineCatalog = (window.AppConfig && typeof window.AppConfig.getMachineCatalog === 'function')
      ? window.AppConfig.getMachineCatalog()
      : ((window.AppConfig && window.AppConfig.business && window.AppConfig.business.machineCatalog)
        ? window.AppConfig.business.machineCatalog
        : {});

    const inferProductLine = (machineName) => {
      try {
        const name = (machineName || '').toString().trim();
        if (!name) return '';
        for (const [line, models] of Object.entries(machineCatalog || {})) {
          if (Array.isArray(models) && models.includes(name)) return line;
        }
      } catch (_) {}
      return '';
    };

    const initialProductLine = (repair.productLine || '').toString().trim() || inferProductLine(repair.machine);
    const productLines = Array.from(new Set([
      ...Object.keys(machineCatalog || {}),
      ...(initialProductLine ? [initialProductLine] : [])
    ])).filter(Boolean);

    // 固定順序（若有 MAR/MAP 優先）
    const preferredOrder = ['MAR', 'MAP'];
    productLines.sort((a, b) => {
      const ia = preferredOrder.indexOf(a);
      const ib = preferredOrder.indexOf(b);
      if (ia !== -1 || ib !== -1) {
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      }
      return a.localeCompare(b);
    });

    const productLineOptions = productLines.map(line => {
      const safe = escapeAttr(line);
      return `<option value="${safe}" ${initialProductLine === line ? 'selected' : ''}>${escapeHtml(line)}</option>`;
    }).join('');

    const modelsForLine = (initialProductLine && Array.isArray(machineCatalog[initialProductLine])) ? machineCatalog[initialProductLine] : [];
    const currentMachine = (repair.machine || '').toString().trim();
    const machineInList = !!(modelsForLine && modelsForLine.includes(currentMachine));
    const useSelectInitially = !!(initialProductLine && modelsForLine && modelsForLine.length > 0);

    const machineSelectOptions = [
      `<option value="">請選擇設備名稱</option>`,
      ...(modelsForLine || []).map(m => {
        const safe = escapeAttr(m);
        return `<option value="${safe}" ${(machineInList && currentMachine === m) ? 'selected' : ''}>${escapeHtml(m)}</option>`;
      }),
      `<option value="__manual__" ${useSelectInitially && currentMachine && !machineInList ? 'selected' : ''}>其他 / 手動輸入</option>`
    ].join('');

    const machineManualValue = (!useSelectInitially || (useSelectInitially && currentMachine && !machineInList)) ? currentMachine : '';
    // 顯示手動輸入：
    // 1) 未選產品線或無對照表 -> 手動輸入
    // 2) 已選產品線但現有值不在清單 -> 手動輸入（以保留既有資料）
    const showManualInitially = (!useSelectInitially) || (useSelectInitially && currentMachine && !machineInList);
    const currentStatusLabel = (statuses.find(s => s.value === repair.status)?.label || repair.status || '新建').toString();
    const currentPriorityLabel = (priorities.find(p => p.value === repair.priority)?.label || repair.priority || '一般').toString();
    const currentCustomerLabel = (repair.customer || '').toString().trim() || '尚未指定客戶';
    const currentMachineLabel = (currentMachine || '').toString().trim() || '尚未指定設備';
    
    return `
      <div class="modal-dialog modal-large repair-form-modal">
        <div class="modal-header">
          <h3>${isEdit ? '編輯維修單' : '新增維修單'}</h3>
          <button class="modal-close" type="button" data-action="repairs.closeModal">✕</button>
        </div>
        
        <form id="repair-form" class="modal-body enterprise-form repair-form" data-action="repairs.handleSubmit">
          <div class="form-context-bar repair-form-context">
            <div class="form-context-main">
              <span class="form-context-title">${isEdit ? '維修單編輯' : '維修單建立'}</span>
              <div class="form-context-pills">
                <span class="form-context-pill is-strong">${escapeHtml(currentStatusLabel)}</span>
                <span class="form-context-pill">優先級：${escapeHtml(currentPriorityLabel)}</span>
                <span class="form-context-pill">客戶：${escapeHtml(currentCustomerLabel)}</span>
                <span class="form-context-pill">設備：${escapeHtml(currentMachineLabel)}</span>
              </div>
            </div>
            <p class="form-context-note">表單固定分成狀態、客戶、設備、問題、零件與商務段落，降低手機與桌機切換時的閱讀落差。</p>
          </div>

          <!-- 狀態與優先級 -->
          <div class="form-section">
            <div class="form-section-head"><h4 class="form-section-title">狀態管理</h4><p class="form-section-desc">集中管理維修日期、狀態、進度與優先級，避免流程判斷分散。</p></div>
            
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">維修日期</label>
                <input
                  type="date"
                  name="createdDate"
                  class="input"
                  value="${createdDateValue}"
                />
              </div>

              <div class="form-group">
                <label class="form-label">狀態</label>
                <select name="status" class="input" data-action="repairs.handleStatusChange">
                  ${statuses.map(s => `
                    <option value="${s.value}" ${repair.status === s.value ? 'selected' : ''}>
                      ${s.label}
                    </option>
                  `).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">進度 (<span id="progress-value">${repair.progress || 0}</span>%)</label>
                <input
                  type="range"
                  name="progress"
                  class="input-range"
                  min="0"
                  max="100"
                  step="10"
                  value="${repair.progress || 0}"
                  data-action="repairs.handleProgressChange"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">優先級</label>
                <select name="priority" class="input">
                  ${priorities.map(p => `
                    <option value="${p.value}" ${repair.priority === p.value ? 'selected' : ''}>
                      ${p.label}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
          
          <!-- 零件相關 -->
          <!-- 客戶資訊 -->
          <div class="form-section">
            <div class="form-section-head"><h4 class="form-section-title">客戶資訊</h4><p class="form-section-desc">公司、聯絡窗口與歷史帶入集中在同一區，手機與桌機維持一致閱讀順序。</p></div>
            <!-- 模板（V161.105） -->
            <div class="form-row template-row">
              <div class="form-label">模板</div>
              <div class="form-field template-field">
                <select class="input" id="repair-template-select">
                  <option value="">（不使用模板）</option>
                </select>
                <button class="btn" type="button" id="btn-template-manage" data-action="repairs.templateManage">管理模板</button>
              </div>
            </div>


            <div class="quick-picks" id="company-quick-picks">
              <div class="quick-row">
                <div class="quick-label">常用公司</div>
                <div class="quick-chips" id="pinned-company-chips"><span class="muted">載入中...</span></div>
              </div>
              <div class="quick-row">
                <div class="quick-label">最近使用</div>
                <div class="quick-chips" id="recent-company-chips"></div>
              </div>
            </div>
            
            <div class="form-grid">
              <div class="form-group field-span-full">
                <label class="form-label required label-with-actions">
                  <span>公司名稱</span>
                  <span class="label-actions">
                    <button type="button" class="btn ghost mini" id="btn-pin-company">釘選</button>
                    <button type="button" class="btn ghost mini" id="btn-history-company">歷史帶入</button>
                  </span>
                </label>
                <div class="input-with-dropdown">
                  <input
                    type="text"
                    name="customer"
                    class="input"
                    value="${escapeAttr(repair.customer || '')}"
                    placeholder="請輸入公司名稱"
                    list="company-list" data-action="repairs.handleCustomerPick" autocomplete="off"
                    required
                  />
                  <button type="button" class="input-dropdown-btn" data-dd="company" data-action="repairs.toggleCompanyDropdown" aria-label="選擇公司" title="選擇公司">▾</button>
                </div>
                <datalist id="company-list">${companyOptions}</datalist>
              </div>
              
              <div class="form-group">
                <label class="form-label">聯絡人</label>
                <div class="input-with-dropdown">
                  <input
                    type="text"
                    name="contact"
                    class="input"
                    value="${escapeAttr(repair.contact || '')}"
                    placeholder="請輸入聯絡人"
                    list="contact-list" data-action="repairs.handleContactPick" autocomplete="off"
                  />
                  <button type="button" class="input-dropdown-btn" data-dd="contact" data-action="repairs.toggleContactDropdown" aria-label="選擇聯絡人" title="選擇聯絡人">▾</button>
                </div>
                <datalist id="contact-list">${contactOptions}</datalist>
              </div>
              
              <div class="form-group">
                <label class="form-label">電話</label>
                <input
                  type="tel"
                  name="phone"
                  class="input"
                  value="${escapeAttr(repair.phone || '')}"
                  placeholder="請輸入電話"
                />
              </div>
              
              <div class="form-group field-span-full">
                <label class="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  class="input"
                  value="${escapeAttr(repair.email || '')}"
                  placeholder="請輸入 Email"
                />
              </div>
            </div>
          </div>
          
          <!-- 設備資訊 -->
          <div class="form-section">
            <div class="form-section-head"><h4 class="form-section-title">設備資訊</h4><p class="form-section-desc">產品線、設備名稱與序號採固定順序，降低現場輸入時的視覺跳動。</p></div>
            
            <div class="form-grid three">
              <div class="form-group">
                <label class="form-label">產品線</label>
                <select name="productLine" id="product-line" class="input" data-action="repairs.handleProductLineChange">
                  <option value="" ${!initialProductLine ? 'selected' : ''}>（不指定）</option>
                  ${productLineOptions}
                </select>
                <div class="help">選擇產品線後，設備名稱會提供對應機型清單。</div>
              </div>

              <div class="form-group">
                <label class="form-label required machine-label"><span>設備名稱</span><button type="button" class="btn ghost sm machine-filter-btn" style="visibility:hidden;pointer-events:none;" data-action="repairs.toggleMachineFilter">篩選</button></label>
<!-- 最終寫回的欄位（保持既有資料結構：machine） -->
<input type="hidden" name="machine" id="machine-final" value="${escapeAttr(currentMachine)}" />

<!-- 下拉搜尋（type-to-filter） -->
<div id="machine-search-wrap" class="machine-search-wrap" style="${(useSelectInitially && this._machineFilterOpen) ? '' : 'display:none;'}">
  <input
    type="text"
    id="machine-search"
    name="_machineSearch"
    class="input"
    value=""
    placeholder="搜尋機型（輸入即可篩選）"
    data-action="repairs.handleMachineSearchInput"
    autocomplete="off"
  />
</div>

                <!-- 產品線模式：下拉清單 -->
                <select
                  name="_machinePick"
                  id="machine-select"
                  class="input"
                  style="${useSelectInitially ? '' : 'display:none;'}"
                  data-action="repairs.handleMachineSelectChange"
                >
                  ${machineSelectOptions}
                </select>

                <!-- 手動輸入（產品線未指定或選擇『其他/手動輸入』時顯示） -->
                <input
                  type="text"
                  name="_machineManual"
                  id="machine-manual"
                  class="input"
                  value="${escapeAttr(machineManualValue)}"
                  placeholder="請輸入設備名稱"
                  style="${showManualInitially ? '' : 'display:none;'}"
                  data-action="repairs.handleMachineManualInput"
                  autocomplete="off"
                />

                <div class="help" id="machine-help">${useSelectInitially ? '可從清單選擇；若清單沒有，請選擇「其他 / 手動輸入」。' : '未指定產品線時，請直接輸入設備名稱。'}</div>
              </div>
              
              <div class="form-group">
                <label class="form-label">序號</label>
                <input
                  type="text"
                  name="serialNumber"
                  class="input"
                  value="${escapeAttr(repair.serialNumber || '')}"
                  placeholder="請輸入設備序號"
                />
<div class="serial-suggest" id="serial-suggest" style="display:none;">
  <div class="serial-label">最近序號</div>
  <div class="quick-chips" id="serial-suggest-chips"></div>
</div>
              </div>
            </div>
          </div>
          
          <!-- 問題描述 -->
          <div class="form-section">
            <div class="form-section-head"><h4 class="form-section-title">問題描述</h4><p class="form-section-desc">先填問題描述，再補工作內容，讓維修表單、詳情頁與週報輸出共用同一套契約。</p></div>
            
            <div class="form-group">
              <label class="form-label required">問題描述</label>
              <input
                type="text"
                name="issue"
                class="input"
                value="${escapeAttr(repair.issue || '')}"
                placeholder="請輸入問題描述"
                required
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">工作內容（週報用）</label>
              <textarea
                name="content"
                class="input"
                rows="4"
                placeholder="請填寫本次實際處理內容（週報的「工作內容」會使用此欄位）"
              >${escapeHtml(repair.content || '')}</textarea>
            </div>
          </div>
          <!-- 零件相關 -->
          <div class="form-section">
            <div class="form-section-head"><h4 class="form-section-title">零件管理</h4><p class="form-section-desc">零件需求、下單、到貨、更換統一放在同一組布林欄位，避免判讀分散。</p></div>
            
            <div class="form-grid">
              <div class="form-group">
                <label class="form-checkbox">
                  <input
                    type="checkbox"
                    name="needParts"
                    ${repair.needParts ? 'checked' : ''}
                  data-action="repairs.handleNeedPartsChange"
                  />
                  <span>需要零件</span>
                </label>
              </div>
              
              <div class="form-group">
                <label class="form-checkbox">
                  <input
                    type="checkbox"
                    name="partsOrdered"
                    ${repair.partsOrdered ? 'checked' : ''}
                  />
                  <span>已訂購</span>
                </label>
              </div>
              
              <div class="form-group">
                <label class="form-checkbox">
                  <input
                    type="checkbox"
                    name="partsArrived"
                    ${repair.partsArrived ? 'checked' : ''}
                  />
                  <span>已到貨</span>
                </label>
              </div>

              <div class="form-group">
                <label class="form-checkbox">
                  <input
                    type="checkbox"
                    name="partsReplaced"
                    ${repair.partsReplaced ? 'checked' : ''}
                  />
                  <span>已更換</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 收費 / 下單 -->
          <div class="form-section">
            <div class="form-section-head"><h4 class="form-section-title">收費 / 下單</h4><p class="form-section-desc">商務追蹤獨立成段，與零件需求分離，避免使用者誤認為同一流程。</p></div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">維修後是否需要收費</label>
                <div class="radio-row">
                  <label class="form-radio"><input type="radio" name="billing_chargeable" value="null" ${chargeableVal === 'null' ? 'checked' : ''} data-action="repairs.handleBillingChargeableChange" /> 尚未決定</label>
                  <label class="form-radio"><input type="radio" name="billing_chargeable" value="false" ${chargeableVal === 'false' ? 'checked' : ''} data-action="repairs.handleBillingChargeableChange" /> 不需收費</label>
                  <label class="form-radio"><input type="radio" name="billing_chargeable" value="true" ${chargeableVal === 'true' ? 'checked' : ''} data-action="repairs.handleBillingChargeableChange" /> 需收費</label>
                </div>
                <div class="help">用於追蹤維修後是否需向客戶收費（不等同於零件需求）。</div>
              </div>

              <div class="form-group" id="billing-order-wrap" style="${chargeableVal === 'true' ? '' : 'display:none;'}">
                <label class="form-label">客戶是否已下單</label>
                <div class="radio-row">
                  <label class="form-radio"><input type="radio" name="billing_orderStatus" value="null" ${orderStatusVal === 'null' ? 'checked' : ''} data-action="repairs.handleBillingOrderStatusChange" /> 尚未確認</label>
                  <label class="form-radio"><input type="radio" name="billing_orderStatus" value="ordered" ${orderStatusVal === 'ordered' ? 'checked' : ''} data-action="repairs.handleBillingOrderStatusChange" /> 已下單</label>
                  <label class="form-radio"><input type="radio" name="billing_orderStatus" value="not_ordered" ${orderStatusVal === 'not_ordered' ? 'checked' : ''} data-action="repairs.handleBillingOrderStatusChange" /> 未下單</label>
                </div>

                <div id="billing-reason-wrap" style="${(chargeableVal === 'true' && orderStatusVal === 'not_ordered') ? '' : 'display:none;'}; margin-top:8px;">
                  <div class="form-grid">
                    <div class="form-group">
                      <label class="form-label">未下單狀態</label>
                      <select name="billing_notOrderedStageCode" class="input">
                        <option value="" ${!notOrderedStageVal ? 'selected' : ''}>（請選擇）</option>
                        ${notOrderedStageOptions.map(opt => {
                          const value = escapeAttr(opt.value || '');
                          const label = escapeHtml(opt.label || opt.value || '');
                          return `<option value="${value}" ${notOrderedStageVal === String(opt.value || '') ? 'selected' : ''}>${label}</option>`;
                        }).join('')}
                      </select>
                      <div class="help">提供常用內建狀態，讓未下單案件在手機與桌機都能快速更新。</div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">未下單原因</label>
                      <select name="billing_notOrderedReasonCode" class="input">
                        <option value="" ${!notOrderedReasonVal ? 'selected' : ''}>（未填）</option>
                        ${notOrderedReasonOptions.map(opt => {
                          const value = escapeAttr(opt.value || '');
                          const label = escapeHtml(opt.label || opt.value || '');
                          return `<option value="${value}" ${notOrderedReasonVal === String(opt.value || '') ? 'selected' : ''}>${label}</option>`;
                        }).join('')}
                      </select>
                    </div>
                  </div>
                  <textarea
                    name="billing_notOrderedNote"
                    class="input"
                    rows="2"
                    maxlength="300"
                    placeholder="補充說明（可填）"
                    style="margin-top:8px;"
                  >${escapeHtml(notOrderedNoteVal || '')}</textarea>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 備註 -->
          <div class="form-section">
            <div class="form-section-head"><h4 class="form-section-title">備註</h4><p class="form-section-desc">保留非結構化補充說明，避免主表單欄位過度擴張。</p></div>
            
            <div class="form-group">
              <textarea
                name="notes"
                class="input"
                rows="3"
                placeholder="其他備註事項"
              >${escapeHtml(repair.notes || '')}</textarea>
            </div>
          </div>
          
          <input type="hidden" name="id" value="${escapeAttr(repair.id || '')}" />
        </form>
        
        <div class="modal-footer">
          <button type="button" class="btn" data-action="repairs.closeModal">
            取消
          </button>
          <button type="submit" form="repair-form" class="btn primary">
            ${isEdit ? '更新' : '建立'}
          </button>
        </div>
      </div>
    `;
  },
  
  /**
   * 渲染詳情頁面
   */
  renderDetail() {
    const repair = this.currentRepair;
    if (!repair) return '';
    
    const display = window.RepairModel.toDisplay(repair);
    const history = window._svc('RepairService').getHistory(repair.id);
    const historyCount = Array.isArray(history) ? history.length : 0;
    const historyTabLabel = historyCount ? `變更記錄 (${historyCount})` : '變更記錄';
    const workLogCount = (window._svc('WorkLogService') && typeof window._svc('WorkLogService').getForRepair === 'function')
      ? (window._svc('WorkLogService').getForRepair(repair.id) || []).length
      : 0;
    

    const escapeHtml = (input) => {
      const s = (input === null || input === undefined) ? '' : String(input);
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
    const escapeAttr = (input) => escapeHtml(input).split('\\n').join(' ').split('\\r').join(' ');
    const safeTelHref = (phone) => {
      const raw = (phone === null || phone === undefined) ? '' : String(phone);
      const cleaned = raw.replace(/[^0-9+]/g, '');
      return cleaned ? `tel:${cleaned}` : '';
    };
    const safeMailtoHref = (email) => {
      const raw = (email === null || email === undefined) ? '' : String(email).trim();
      // mailto: 後方只允許基本字元，避免引號/尖括號破壞 DOM
      const cleaned = raw.replace(/[^a-zA-Z0-9@._+\-]/g, '');
      return cleaned ? `mailto:${cleaned}` : '';
    };

    const safeId = escapeHtml(repair.id);
    const safeCustomer = escapeHtml(repair.customer);
    const safeContact = escapeHtml(repair.contact);
    const safePhone = escapeHtml(repair.phone);
    const safeEmail = escapeHtml(repair.email);
    const machineCatalog = (window.AppConfig && typeof window.AppConfig.getMachineCatalog === 'function')
      ? window.AppConfig.getMachineCatalog()
      : ((window.AppConfig && window.AppConfig.business && window.AppConfig.business.machineCatalog)
        ? window.AppConfig.business.machineCatalog
        : {});
    const inferProductLine = (machineName) => {
      try {
        const name = (machineName || '').toString().trim();
        if (!name) return '';
        for (const [line, models] of Object.entries(machineCatalog || {})) {
          if (Array.isArray(models) && models.includes(name)) return line;
        }
      } catch (_) {}
      return '';
    };
    const productLineValue = (repair.productLine || '').toString().trim() || inferProductLine(repair.machine);
    const safeProductLine = escapeHtml(productLineValue);
    const safeMachine = escapeHtml(repair.machine);
    const safeSerial = escapeHtml(repair.serialNumber);
    const safeIssue = escapeHtml(repair.issue);
    const safeContent = escapeHtml(repair.content || '').replace(/\n/g, '<br>');
    const safeNotes = escapeHtml(repair.notes || '').replace(/\n/g, '<br>');
    const safeCreatedDate = escapeHtml((repair.createdDate || '').toString());

    // 收費/下單狀態顯示（統一走 AppConfig billing flow helper）
    const b = (repair.billing && typeof repair.billing === 'object') ? repair.billing : {};
    const billingFlow = (window.AppConfig && typeof window.AppConfig.getBillingFlowMeta === 'function')
      ? window.AppConfig.getBillingFlowMeta(b)
      : {
          chargeableMeta: null,
          orderDecisionMeta: null,
          stageMeta: null,
          reasonMeta: null,
          note: '',
          isChargeable: b.chargeable === true,
          isNotOrdered: b.chargeable === true && b.orderStatus === 'not_ordered',
          isOrdered: b.chargeable === true && b.orderStatus === 'ordered',
          isOrderUnknown: b.chargeable === true && b.orderStatus !== 'ordered' && b.orderStatus !== 'not_ordered'
        };
    const chargeableLabel = billingFlow.chargeableMeta?.label || '尚未決定';
    const orderLabel = billingFlow.orderDecisionMeta?.label || '';
    const stageLabel = billingFlow.stageMeta?.label || '';
    const reasonLabel = billingFlow.reasonMeta?.label || '';
    const reasonNote = billingFlow.note || '';
    const safeChargeableLabel = escapeHtml(chargeableLabel);
    const safeOrderLabel = escapeHtml(orderLabel);
    const safeStageLabel = escapeHtml(stageLabel);
    const safeReasonLabel = escapeHtml(reasonLabel);
    const safeReasonNote = escapeHtml(reasonNote);
    const billingSummaryTone = billingFlow.isChargeable
      ? (billingFlow.isOrdered ? 'tone-info' : (billingFlow.isNotOrdered ? 'tone-warning' : 'tone-primary'))
      : (billingFlow.isFree ? 'tone-success' : '');
    const billingSummaryLabel = escapeHtml((billingFlow.summaryLabel || chargeableLabel).toString());
    const safePriorityLabel = escapeHtml(display.priorityLabel || '一般');
    const safeOwnerName = escapeHtml(repair.ownerName || '—');
    const safeCreatedAt = escapeHtml(display.createdAtFormatted || '—');
    const safeUpdatedAt = escapeHtml(display.updatedAtFormatted || '—');
    const contactDisplay = safeContact || '—';
    const phoneDisplay = safePhone ? `<a href="${safeTelHref(repair.phone)}">${safePhone}</a>` : '—';
    const emailDisplay = safeEmail ? `<a href="${safeMailtoHref(repair.email)}">${safeEmail}</a>` : '—';
    const overviewSignals = [];
    if (repair.needParts) overviewSignals.push('<span class="repair-overview-chip tone-warning">需要零件</span>');
    if (repair.partsOrdered) overviewSignals.push('<span class="repair-overview-chip tone-info">已訂購</span>');
    if (repair.partsArrived) overviewSignals.push('<span class="repair-overview-chip tone-success">已到貨</span>');
    if (repair.partsReplaced) overviewSignals.push('<span class="repair-overview-chip tone-success">已更換</span>');
    if (billingFlow.isChargeable || billingFlow.isFree || billingFlow.isUndecided) {
      overviewSignals.push('<span class="repair-overview-chip ' + billingSummaryTone + '">' + billingSummaryLabel + '</span>');
    }
    const overviewSignalsHtml = overviewSignals.length ? overviewSignals.join('') : '<span class="repair-overview-chip">尚未建立延伸標記</span>';
    const statHTML = (window.UI && typeof window.UI.enterpriseStatHTML === 'function')
      ? window.UI.enterpriseStatHTML
      : (label, value) => `<div class="enterprise-mini-stat"><span>${escapeHtml(label)}</span><strong>${value || '—'}</strong></div>`;
    const itemHTML = (window.UI && typeof window.UI.enterpriseOverviewItemHTML === 'function')
      ? window.UI.enterpriseOverviewItemHTML
      : (label, value, options = {}) => `<div class="enterprise-detail-overview-item"><span>${escapeHtml(label)}</span><strong>${options.allowHtml ? (value || '—') : escapeHtml(value || '—')}</strong></div>`;
    const noteHTML = (window.UI && typeof window.UI.enterpriseOverviewNoteHTML === 'function')
      ? window.UI.enterpriseOverviewNoteHTML
      : (label, value, options = {}) => `<div class="enterprise-detail-overview-note"><span>${escapeHtml(label)}</span><div>${options.allowHtml ? (value || '—') : escapeHtml(value || '—')}</div></div>`;
    const sectionHeaderHTML = (window.UI && typeof window.UI.enterpriseSectionHeaderHTML === 'function')
      ? window.UI.enterpriseSectionHeaderHTML
      : (options = {}) => `
          <div class="enterprise-section-head">
            <div class="enterprise-section-copy">
              ${options.eyebrow ? `<div class="enterprise-section-eyebrow">${escapeHtml(options.eyebrow)}</div>` : ''}
              ${options.title ? `<div class="enterprise-section-title">${escapeHtml(options.title)}</div>` : ''}
              ${options.desc ? `<div class="enterprise-section-desc">${escapeHtml(options.desc)}</div>` : ''}
            </div>
            ${options.actionsHtml ? `<div class="enterprise-section-actions">${options.actionsHtml}</div>` : ''}
          </div>
        `.trim();
    const heroStatsHtml = [
      statHTML('進度', `${repair.progress}%`),
      statHTML('維修天數', `${display.ageInDays} 天`),
      statHTML('工作記錄', String(workLogCount)),
      statHTML('變更記錄', String(historyCount))
    ].join('');
    const repairOverviewHtml = [
      itemHTML('處理狀態', escapeHtml(display.statusLabel), { allowHtml: true }),
      itemHTML('優先級', safePriorityLabel, { allowHtml: true }),
      itemHTML('負責人', safeOwnerName, { allowHtml: true }),
      itemHTML('維修日期', safeCreatedDate || escapeHtml(display.createdAtFormatted.slice(0, 10)), { allowHtml: true }),
      itemHTML('建立時間', safeCreatedAt, { allowHtml: true }),
      itemHTML('最後更新', safeUpdatedAt, { allowHtml: true }),
      itemHTML('維修天數', `${display.ageInDays} 天`),
      itemHTML('進度', `${repair.progress}%`)
    ].join('');
    const customerOverviewHtml = [
      itemHTML('客戶名稱', safeCustomer, { allowHtml: true }),
      itemHTML('聯絡人', contactDisplay, { allowHtml: true }),
      itemHTML('電話', phoneDisplay, { allowHtml: true }),
      itemHTML('Email', emailDisplay, { allowHtml: true })
    ].join('');
    const machineOverviewHtml = [
      itemHTML('設備名稱', safeMachine, { allowHtml: true }),
      itemHTML('產品線', safeProductLine || '—', { allowHtml: true }),
      itemHTML('序號', safeSerial || '—', { allowHtml: true }),
      itemHTML('案件識別', safeId, { allowHtml: true })
    ].join('');
    const billingOverviewHtml = [
      itemHTML('收費判定', safeChargeableLabel, { allowHtml: true }),
      itemHTML('下單決策', safeOrderLabel || '—', { allowHtml: true }),
      itemHTML('未下單狀態', safeStageLabel || '—', { allowHtml: true }),
      itemHTML('未下單原因', safeReasonLabel || '—', { allowHtml: true })
    ].join('');
    const billingNoteHtml = safeReasonNote ? noteHTML('商務備註', safeReasonNote, { allowHtml: true }) : '';

    return `
      <div class="modal-dialog modal-wide">
        <div class="modal-header">
          <div class="detail-header-left">
            <button class="btn" type="button" data-action="repairs.closeModal">← 返回</button>
            <div>
              <h3>${safeId}</h3>
            <span class="muted">📅 維修日期：${safeCreatedDate || display.createdAtFormatted.slice(0, 10)}</span>
          </div>
          </div>
          <button class="modal-close" type="button" data-action="repairs.closeModal">✕</button>
        </div>
        
        <div class="modal-body">
          <!-- 標籤（P3：變更記錄） -->
          <div class="detail-tabbar chip-row" role="tablist" aria-label="維修詳情標籤">
            <button type="button" class="chip active" id="repair-detail-tab-btn-main" data-action="repairs.switchDetailTab" data-value="main" aria-selected="true">總覽</button>
            <button type="button" class="chip" id="repair-detail-tab-btn-history" data-action="repairs.switchDetailTab" data-value="history" aria-selected="false">${historyTabLabel}</button>
          </div>

          <div id="repair-detail-tab-main">
            <section class="enterprise-detail-hero repair-detail-hero repair-detail-hero-enterprise">
              <div class="enterprise-detail-hero-copy repair-detail-hero-copy">
                <div class="enterprise-detail-overline repair-detail-overline">Repair Job Center</div>
                <div class="enterprise-detail-title-row repair-detail-title-row">
                  <h4 class="enterprise-detail-title repair-detail-title">${safeCustomer}｜${safeMachine}</h4>
                  <span class="status-badge custom" style="--badge-color:${display.statusColor};">${display.statusLabel}</span>
                </div>
                <div class="enterprise-detail-subtitle repair-detail-subtitle">${safeIssue}</div>
                <div class="enterprise-detail-chip-row repair-detail-chip-row">
                  <span class="enterprise-detail-chip repair-detail-chip is-muted">案件識別 ${safeId}</span>
                  ${safeProductLine ? `<span class="enterprise-detail-chip repair-detail-chip">產品線 ${safeProductLine}</span>` : ''}
                  ${safeSerial ? `<span class="enterprise-detail-chip repair-detail-chip">序號 ${safeSerial}</span>` : ''}
                  <span class="enterprise-detail-chip repair-detail-chip">負責人 ${escapeHtml(repair.ownerName || '—')}</span>
                </div>
              </div>
              <div class="enterprise-detail-hero-stats repair-detail-hero-stats">${heroStatsHtml}</div>
            </section>

            <section class="enterprise-detail-overview-board repair-overview-board">
              <article class="enterprise-detail-overview-card enterprise-detail-overview-card-primary repair-overview-card repair-overview-card-primary">
                <div class="enterprise-detail-overview-card-head repair-overview-card-head">
                  <div>
                    <div class="enterprise-detail-overview-eyebrow repair-overview-eyebrow">案件總覽</div>
                    <div class="enterprise-detail-overview-title repair-overview-title">維修作業總覽</div>
                  </div>
                  <div class="enterprise-detail-overview-signal-row repair-overview-signal-row">${overviewSignalsHtml}</div>
                </div>
                <div class="enterprise-detail-overview-grid enterprise-detail-overview-grid-4 repair-overview-grid repair-overview-grid-4">${repairOverviewHtml}</div>
              </article>

              <article class="enterprise-detail-overview-card repair-overview-card">
                <div class="enterprise-detail-overview-card-head repair-overview-card-head">
                  <div>
                    <div class="repair-overview-eyebrow">Customer Profile</div>
                    <div class="repair-overview-title">客戶與聯絡資訊</div>
                  </div>
                </div>
                <div class="enterprise-detail-overview-grid enterprise-detail-overview-grid-2 repair-overview-grid repair-overview-grid-2">${customerOverviewHtml}</div>
              </article>

              <article class="enterprise-detail-overview-card repair-overview-card">
                <div class="enterprise-detail-overview-card-head repair-overview-card-head">
                  <div>
                    <div class="repair-overview-eyebrow">Equipment Profile</div>
                    <div class="repair-overview-title">設備與機台資訊</div>
                  </div>
                </div>
                <div class="enterprise-detail-overview-grid enterprise-detail-overview-grid-2 repair-overview-grid repair-overview-grid-2">${machineOverviewHtml}</div>
              </article>

              <article class="enterprise-detail-overview-card repair-overview-card">
                <div class="enterprise-detail-overview-card-head repair-overview-card-head">
                  <div>
                    <div class="repair-overview-eyebrow">Commercial Tracking</div>
                    <div class="repair-overview-title">收費與下單追蹤</div>
                  </div>
                  <div class="repair-overview-signal-row">
                    <span class="repair-overview-chip ${billingSummaryTone}">${billingSummaryLabel}</span>
                    ${safeStageLabel ? `<span class="repair-overview-chip tone-warning">${safeStageLabel}</span>` : ''}
                  </div>
                </div>
                <div class="repair-overview-grid repair-overview-grid-2">
                  <div class="repair-overview-item"><span>收費判定</span><strong>${safeChargeableLabel}</strong></div>
                  <div class="repair-overview-item"><span>下單決策</span><strong>${safeOrderLabel || '—'}</strong></div>
                  <div class="repair-overview-item"><span>未下單狀態</span><strong>${safeStageLabel || '—'}</strong></div>
                  <div class="repair-overview-item"><span>未下單原因</span><strong>${safeReasonLabel || '—'}</strong></div>
                </div>
                ${safeReasonNote ? `<div class="repair-overview-note"><span>商務備註</span><div>${safeReasonNote}</div></div>` : ''}
              </article>
            </section>

            <div class="enterprise-detail-command-bar repair-detail-command-bar">
              <div class="enterprise-detail-command-copy repair-detail-command-copy">
                <div class="enterprise-detail-command-title repair-detail-command-title">案件操作</div>
                <div class="enterprise-detail-command-desc repair-detail-command-desc">總覽已整合狀態、進度、時序與商務資訊；桌機改以單一主視圖閱讀，不再保留舊版右側摘要欄。</div>
              </div>
              <div class="detail-buttons enterprise-detail-command-actions repair-detail-command-actions">
                <button class="btn" data-action="repairs.openForm" data-id="${repair.id}">✏️ 編輯</button>
                <button class="btn" type="button" data-action="repairs.duplicateRepair" data-id="${repair.id}" title="複製成新維修單">📄 複製</button>
                <button class="btn danger" data-action="repairs.confirmDelete" data-id="${repair.id}">🗑️ 刪除</button>
              </div>
            </div>

            <div class="repair-detail-layout repair-detail-layout-enterprise">
              <div class="repair-detail-main">
                <section class="detail-block repair-problem-card repair-problem-card-enterprise">
                  ${sectionHeaderHTML({ eyebrow: '案件背景', title: '問題描述與處理背景', desc: '集中閱讀異常描述、處理背景與內部補充說明。' })}
                  <div class="detail-body repair-problem-body">
                    <div class="detail-issue">${safeIssue}</div>
                    ${repair.content ? `<div class="detail-text">${safeContent}</div>` : '<div class="detail-text muted">尚未填寫補充描述</div>'}
                    ${repair.notes ? `<div class="repair-overview-note"><span>內部備註</span><div>${safeNotes}</div></div>` : ''}
                  </div>
                </section>

                ${window.WorkLogUI ? window.WorkLogUI.renderSection(repair.id) : `
                  <section class="detail-block worklog-section" id="repair-worklog-section">
                    ${sectionHeaderHTML({ eyebrow: '工作記錄', title: '工作記錄', desc: '統整本案處置歷程，方便快速回顧執行內容。' })}
                    <div class="detail-body"><div class="muted">載入中...</div></div>
                  </section>
                `}

                <section class="detail-block" id="repair-activity-timeline-block">
                  ${sectionHeaderHTML({ eyebrow: '活動追蹤', title: '活動時間軸', desc: '依時間序檢視本案的重要更新與操作紀錄。' })}
                  <div class="detail-body">
                    <div id="repair-activity-timeline" data-repair-id="${repair.id}"><div class="muted">載入中...</div></div>
                  </div>
                </section>

                <section class="repair-support-board" aria-label="維修詳情支援模組">

                  <section class="detail-block repair-support-card" id="repair-billing-mini">
                    ${sectionHeaderHTML({ eyebrow: '商務協作', title: '請款 / 商務追蹤', desc: '集中檢視收費判定、下單決策與商務備註。' })}
                    <div class="detail-body">
                      <div class="repair-billing-mini-grid">
                        <div class="repair-billing-mini-item">
                          <span>收費判定</span>
                          <strong>${safeChargeableLabel}</strong>
                        </div>
                        <div class="repair-billing-mini-item">
                          <span>下單決策</span>
                          <strong>${safeOrderLabel || '—'}</strong>
                        </div>
                        <div class="repair-billing-mini-item">
                          <span>未下單狀態</span>
                          <strong>${safeStageLabel || '—'}</strong>
                        </div>
                        <div class="repair-billing-mini-item">
                          <span>未下單原因</span>
                          <strong>${safeReasonLabel || '—'}</strong>
                        </div>
                      </div>
                      ${safeReasonNote ? `<div class="repair-billing-note"><span>商務備註</span><div>${safeReasonNote}</div></div>` : '<div class="muted repair-support-desc">目前未填寫商務備註，可在編輯維修單時更新。</div>'}
                      <div class="repair-support-button-row">
                        <button class="btn" type="button" data-action="repairs.openForm" data-id="${repair.id}">更新商務狀態</button>
                      </div>
                    </div>
                  </section>

                  <section class="detail-block repair-support-card" id="repair-quote-order-mini">
                    ${sectionHeaderHTML({ eyebrow: '商務單據', title: '報價 / 訂單', desc: '從同一區塊銜接報價與訂單建立動作。' })}
                    <div class="detail-body">
                      <div class="mini-summary" id="quote-order-summary">載入中...</div>
                      <div class="chip-row repair-support-chip-row" id="quote-order-actions">
                        <button class="chip" type="button" id="btn-open-create-quote" data-action="quote-open-create">建立報價</button>
                        <button class="chip" type="button" id="btn-open-create-order" data-action="order-open-create">建立訂單</button>
                      </div>
                    </div>
                  </section>

                  <section class="detail-block repair-support-card" id="repair-detail-parts">
                    ${sectionHeaderHTML({ eyebrow: '料件進度', title: '零件追蹤', desc: '追蹤需求、下單、到貨與更換節點。' })}
                    <div class="detail-body">
                      <div class="muted repair-support-desc">用於追蹤更換零件狀態（需求 → 報價 → 下單 → 到貨 → 更換）。</div>
                      <div id="repair-parts-mini" data-repair-id="${repair.id}"><div class="muted">載入中...</div></div>
                      <div class="repair-support-button-row">
                        <button class="btn" data-action="repairs.openRepairParts" data-id="${repair.id}">管理零件</button>
                        <button class="btn" data-action="repairs.openRepairParts" data-id="${repair.id}" data-quick-add="1">+ 新增用料</button>
                      </div>
                    </div>
                  </section>

                  <section class="detail-block repair-support-card" id="repair-sops-mini-block">
                    ${sectionHeaderHTML({ eyebrow: '作業標準', title: 'SOP（作業流程）', desc: '維持本案作業流程、關聯文件與版本脈絡。' })}
                    <div class="detail-body">
                      <div class="mini-summary" id="repair-sops-mini" data-repair-id="${repair.id}">載入中...</div>
                      <div class="chip-row repair-support-chip-row">
                        <button class="chip" type="button" data-action="repairs.linkSop" data-id="${repair.id}">關聯 SOP</button>
                        <button class="chip" type="button" data-action="repairs.openSopsHub" data-id="${repair.id}">開啟 SOP Hub</button>
                      </div>
                      <div class="help repair-support-help">SOP 來自「SOP Hub（🧾）」模組，可在此維修單內建立關聯，方便追溯作業流程與附件版本。</div>
                    </div>
                  </section>

                  <section class="detail-block repair-support-card" id="repair-attachments-placeholder">
                    ${sectionHeaderHTML({ eyebrow: '附件管理', title: '附件', desc: '預留附件能力與後續文件整合位置。' })}
                    <div class="detail-body">
                      <div class="muted">附件功能尚未啟用（目前僅保留占位）。</div>
                      <div class="repair-support-button-row"><button class="btn" type="button" disabled>上傳附件（尚未啟用）</button></div>
                    </div>
                  </section>
                </section>
              </div>
            </div>

            <div class="repair-mobile-actions">
              <button class="btn primary" type="button" data-action="repairs.focusWorklog" data-id="${repair.id}" data-value="add">＋處置</button>
              <button class="btn" type="button" data-action="repairs.openForm" data-id="${repair.id}">✏️ 編輯</button>
              <button class="btn" type="button" data-action="repairs.openRepairParts" data-id="${repair.id}">零件</button>
            </div>

          </div><!-- /repair-detail-tab-main -->

          <div id="repair-detail-tab-history" hidden>
            <div class="detail-section" id="repair-detail-history">
              ${sectionHeaderHTML({ eyebrow: '歷程稽核', title: '變更記錄', desc: '保留本案調整歷程，方便回溯與交接。' })}
              ${historyCount > 0 ? `
                <div class="detail-timeline">
                  ${history.map(h => this.renderHistoryItem(h)).join('')}
                </div>
              ` : `<div class="muted">尚無變更記錄</div>`}
            </div>
          </div><!-- /repair-detail-tab-history -->
        </div>
      </div>
    `;
  },
  
  /**
   * 渲染歷程項目
   */
  renderHistoryItem(history) {
  const date = window.RepairModel.formatDateTime(history.timestamp);

  // HTML 安全：避免歷史內容包含引號/尖括號導致 DOM 破壞或無法操作
  const escapeHtml = (input) => {
    const s = (input === null || input === undefined) ? '' : String(input);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  const escapeAttr = (input) => escapeHtml(input).split('\\n').join(' ').split('\\r').join(' ');

  // 欄位名稱對照
  const fieldLabel = {
    customer: '客戶名稱',
    contact: '聯絡人',
    phone: '電話',
    email: 'Email',
    machine: '設備名稱',
    serialNumber: '序號',
    issue: '問題描述',
    content: '處理內容',
    status: '狀態',
    progress: '進度',
    priority: '優先級',
    needParts: '需要零件',
    partsOrdered: '已下單',
    partsArrived: '已到貨',
    partsReplaced: '已更換',
    'billing.chargeable': '是否收費',
    'billing.orderStatus': '客戶是否下單',
    'billing.notOrdered.stageCode': '未下單狀態',
    'billing.notOrdered.reasonCode': '未下單原因',
    'billing.notOrdered.note': '未下單備註',
    notes: '備註',
    tags: '標籤',
    attachments: '附件'
  };

  const action = (history.action || '').toString().toUpperCase();
  const byName = history.byName || '';

  const toText = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? '是' : '否';
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  };

  const clip = (s, n = 60) => {
    const str = (s || '').toString();
    if (str.length <= n) return str;
    return str.slice(0, n) + '…';
  };

  // 依 action 決定標題
  let title = '';
  if (action === 'CREATE') title = '建立維修單';
  else if (action === 'DELETE') title = '刪除維修單';
  else if (action === 'UPDATE') title = '更新維修單';
  else if (history.fromStatus || history.toStatus) title = '狀態更新';
  else title = '更新';

  // 舊版相容：若有 fromStatus/toStatus，顯示狀態箭頭
  const statusLine = (history.fromStatus || history.toStatus) && (history.fromStatus !== history.toStatus)
    ? `${history.fromStatus || ''} → ${history.toStatus || ''}`
    : '';

  // 變更清單（最多顯示 6 筆）
  const changes = Array.isArray(history.changed) ? history.changed : [];
  const maxItems = 6;
  const shown = changes.slice(0, maxItems);
  const moreCount = Math.max(0, changes.length - shown.length);

  const changeHtml = shown.length > 0 ? `
    <div class="timeline-changes">
      ${shown.map(c => {
        const label = fieldLabel[c.field] || c.field;
        const from = clip(toText(c.from), 40);
        const to = clip(toText(c.to), 40);
        const safeTitle = escapeAttr(`${label}: ${toText(c.from)} → ${toText(c.to)}`);
        return `
          <div class="timeline-change" title="${safeTitle}">
            <span class="timeline-change-label">${escapeHtml(label)}</span>
            <span class="timeline-change-value">${escapeHtml(from)} → ${escapeHtml(to)}</span>
          </div>
        `;
      }).join('')}
      ${moreCount > 0 ? `<div class="timeline-more">＋${moreCount} 項變更</div>` : ''}
    </div>
  ` : '';

  const safeTitleText = escapeHtml(title);
  const safeStatusLine = escapeHtml(statusLine);
  const safeNote = history.note ? escapeHtml(history.note).replace(/\n/g, '<br>') : '';
  const safeByName = escapeHtml(byName);

  return `
    <div class="timeline-item">
      <div class="timeline-marker"></div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-action">
            ${safeTitleText}${statusLine ? `：${safeStatusLine}` : ''}
          </span>
          <span class="timeline-date">${date}</span>
        </div>

        ${history.note ? `<div class="timeline-note">${safeNote}</div>` : ''}

        ${changeHtml}

        <div class="timeline-user">👤 ${safeByName}</div>
      </div>
    </div>
  `;
},

/**
 * 表單送出（新增/更新）
 * - 一律 preventDefault，避免瀏覽器原生 submit 造成整頁 reload（看起來像「重登」）
 */
  async handleSubmit(event) {
    event.preventDefault();

    if (this._submitting) return;

    const form = event.target;

    // 先把畫面上的設備欄位正規化回寫到最終欄位（machine），
    // 避免 visible control 與 hidden final input 脫鉤，造成看起來已選機型但送出仍為空值。
    try {
      if (typeof this._resolveMachineValue === 'function') this._resolveMachineValue(form);
      if (typeof this._applyEquipmentRequired === 'function') this._applyEquipmentRequired();
    } catch (e) {
      console.warn('machine field sync failed before submit:', e);
    }

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
        // 保底：使用瀏覽器原生驗證（若有 required）
        if (!form.reportValidity()) return;
      }
    } catch (e) {
      console.warn('form validate failed:', e);
    }

    this._submitting = true;

    const submitBtn = document.querySelector('button[form="repair-form"][type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '儲存中...';
    }

    try {
      const formData = new FormData(form);
      const data = {};
      for (const [key, value] of formData.entries()) {
        data[key] = (value ?? '').toString();
      }

      const id = (data.id || '').trim();
      delete data.id;

      // 顯示欄位與實際寫入欄位採單一路徑：送出時再次從畫面解出最終設備值。
      if (typeof this._resolveMachineValue === 'function') {
        data.machine = this._resolveMachineValue(form);
      }

      // 表單輔助欄位（不寫入資料庫）
      delete data._machinePick;
      delete data._machineManual;
      delete data._machineSearch;// P0：機型搜尋欄位不寫入資料庫


      // Checkbox（未勾選時 FormData 不會帶值）
      const boolVal = (name) => !!form.querySelector(`input[name="${name}"]`)?.checked;
      data.needParts = boolVal('needParts');
      data.partsOrdered = boolVal('partsOrdered');
      data.partsArrived = boolVal('partsArrived');
      data.partsReplaced = boolVal('partsReplaced');

      // 收費/下單（billing）— 以 billing 物件寫回（避免新增頂層欄位）
      const pickRadio = (name) => form.querySelector(`input[name="${name}"]:checked`)?.value;
      const chargeable = pickRadio('billing_chargeable');
      const orderStatus = pickRadio('billing_orderStatus');
      const stageCode = (data.billing_notOrderedStageCode || '').toString();
      const reasonCode = (data.billing_notOrderedReasonCode || '').toString();
      const note = (data.billing_notOrderedNote || '').toString();

      // 移除表單 helper 欄位，改寫入 data.billing
      delete data.billing_chargeable;
      delete data.billing_orderStatus;
      delete data.billing_notOrderedStageCode;
      delete data.billing_notOrderedReasonCode;
      delete data.billing_notOrderedNote;

      if (chargeable !== undefined) {
        const os = (orderStatus === 'ordered') ? 'ordered' : (orderStatus === 'not_ordered' ? 'not_ordered' : null);
        const cleanNote = (note || '').trim().slice(0, 300);
        data.billing = {
          chargeable: (chargeable === 'true') ? true : (chargeable === 'false' ? false : null),
          orderStatus: os,
          notOrdered: (chargeable === 'true' && os === 'not_ordered')
            ? {
                stageCode: (stageCode || '').trim() || null,
                reasonCode: (reasonCode || '').trim() || null,
                note: cleanNote || null
              }
            : { stageCode: null, reasonCode: null, note: null }
        };
      }

      // 數值
      const p = Number(data.progress || 0);
      data.progress = Number.isFinite(p) ? p : 0;

      // 設備名稱：在 submit 階段做一次結構性保底，不再依賴 hidden input 先前是否成功同步。
      data.machine = (data.machine || '').toString().trim();
      if (!data.machine) {
        const msg = '設備名稱為必填';
        if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'warning' });
        else alert(msg);
        try {
          const focusEl = (typeof this._getVisibleMachineField === 'function')
            ? this._getVisibleMachineField(form)
            : (form.querySelector('#machine-manual') || form.querySelector('#machine-select'));
          focusEl?.focus?.();
        } catch (_) {}
        return;
      }

      // 字串 trim（避免搜尋/顯示混亂）
      [
        'customer','contact','phone','email',
        'productLine','machine','serialNumber','issue','content','notes'
      ].forEach(k => {
        if (typeof data[k] === 'string') data[k] = data[k].trim();
      });

      // P0：資料品質檢查（電話/Email）
      const email = (data.email || '').toString().trim();
      if (email) {
        const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
        if (!okEmail) {
          const msg = 'Email 格式不正確';
          if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'warning' });
          else alert(msg);
          try { form.querySelector('input[name="email"]')?.focus?.(); } catch (_) {}
          return;
        }
      }
      const phone = (data.phone || '').toString().trim();
      if (phone) {
        const digits = phone.replace(/[^0-9]/g, '');
        const okPhone = digits.length >= 6 && digits.length <= 20;
        if (!okPhone) {
          const msg = '電話格式不正確（建議至少 6 碼數字）';
          if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'warning' });
          else alert(msg);
          try { form.querySelector('input[name="phone"]')?.focus?.(); } catch (_) {}
          return;
        }
      }

      // 維修日期（YYYY-MM-DD）
      if (typeof data.createdDate === 'string') data.createdDate = data.createdDate.trim();

      if (!window._svc('RepairService')) throw new Error('RepairService not found');

      // 狀態/進度規則由 Model 統一正規化（create/update 內會處理）
      if (id) {
        await window._svc('RepairService').update(id, data);
      } else {
        await window._svc('RepairService').create(data);
      }

      // 注意：V161.133 起不再把「產品線/設備/優先級」寫入 localStorage 作為下一次新增預設
      // （避免新增表單出現使用者未選擇的內建值）

      // 成功後關閉 modal
      if (typeof this.closeModal === 'function') {
        this.closeModal();
      } else if (window.RepairUI && typeof window.RepairUI.closeModal === 'function') {
        window.RepairUI.closeModal();
      }
    } catch (error) {
      console.error('Repair submit error:', error);
      const msg = '儲存失敗：' + (error?.message || error);
      if (window.UI && typeof window.UI.toast === 'function') window.UI.toast(msg, { type: 'error' });
      else alert(msg);
    } finally {
      this._submitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText || '儲存';
      }
    }
  },

  /**
   * 狀態變更：同步進度與「需要零件」勾選
   */
  handleStatusChange(event) {
    try {
      const status = (event?.target?.value || '').toString();
      const form = document.getElementById('repair-form');
      if (!form) return;

      const progressEl = form.querySelector('input[name="progress"]');
      const progressValueEl = document.getElementById('progress-value');
      const needPartsEl = form.querySelector('input[name="needParts"]');

      // 依狀態給預設進度（僅更新進度，不再強制清除「需要零件」）
      const defaultProgress = (window.RepairModel && typeof window.RepairModel.getProgressByStatus === 'function')
        ? window.RepairModel.getProgressByStatus(status)
        : (status === '已完成' ? 100 : (status === '需要零件' ? 50 : 10));

      // 只在狀態為「需要零件」時同步勾選；其他狀態不強制改勾選（避免無法保留「曾需要零件」的紀錄）
      if (needPartsEl && status === '需要零件') {
        needPartsEl.checked = true;
      }

      if (progressEl) progressEl.value = String(defaultProgress);
      if (progressValueEl) progressValueEl.textContent = String(defaultProgress);
    } catch (e) {
      console.warn('handleStatusChange failed:', e);
    }
  },

  /**
   * 需要零件：勾選時強制狀態=需要零件（反之回到進行中）
   */
  handleNeedPartsChange(event) {
    try {
      const checked = !!event?.target?.checked;
      const form = document.getElementById('repair-form');
      if (!form) return;

      const statusEl = form.querySelector('select[name="status"]');

      // 勾選「需要零件」：僅在未完成狀態時，將狀態切換為「需要零件」
      // 取消勾選：若目前狀態為「需要零件」，則回到「進行中」
      const currentStatus = (statusEl?.value || '').toString();
      if (checked) {
        if (statusEl && currentStatus !== '已完成') statusEl.value = '需要零件';
      } else {
        if (statusEl && currentStatus === '需要零件') statusEl.value = '進行中';
      }

      // 不再強制把進度鎖到 50%，讓使用者可自行調整（包含可標記為 100%）
    } catch (e) {
      console.warn('handleNeedPartsChange failed:', e);
    }
  },

  /**
   * 收費：切換是否需收費（需收費才顯示「客戶是否下單」）
   */
  handleBillingChargeableChange(event) {
    try {
      const v = (event?.target?.value || '').toString();
      const show = v === 'true';
      const wrap = document.getElementById('billing-order-wrap');
      if (wrap) wrap.style.display = show ? '' : 'none';

      if (!show) {
        // 清空 orderStatus + reason 顯示
        const reasonWrap = document.getElementById('billing-reason-wrap');
        if (reasonWrap) reasonWrap.style.display = 'none';
      }
    } catch (e) {
      console.warn('handleBillingChargeableChange failed:', e);
    }
  },

  /**
   * 下單狀態：未下單才顯示原因
   */
  handleBillingOrderStatusChange(event) {
    try {
      const v = (event?.target?.value || '').toString();
      const reasonWrap = document.getElementById('billing-reason-wrap');
      if (reasonWrap) reasonWrap.style.display = (v === 'not_ordered') ? '' : 'none';
    } catch (e) {
      console.warn('handleBillingOrderStatusChange failed:', e);
    }
  },

  /**
   * 進度拉桿：即時更新顯示，並同步狀態（100% -> 已完成）
   */
  handleProgressChange(event) {
    try {
      const value = Number(event?.target?.value || 0);
      const progress = Number.isFinite(value) ? value : 0;

      const progressValueEl = document.getElementById('progress-value');
      if (progressValueEl) progressValueEl.textContent = String(progress);

      const form = document.getElementById('repair-form');
      if (!form) return;

      const statusEl = form.querySelector('select[name="status"]');
      const needPartsEl = form.querySelector('input[name="needParts"]');

      if (progress >= 100) {
        if (statusEl) statusEl.value = '已完成';
        // 不再強制取消「需要零件」，允許完成後仍保留「曾需要零件」的標記
      } else if (needPartsEl?.checked) {
        if (statusEl) statusEl.value = '需要零件';
      } else {
        if (statusEl) statusEl.value = '進行中';
      }
    } catch (e) {
      console.warn('handleProgressChange failed:', e);
    }
  },

  _syncEquipmentPickerState({ productLine, currentMachine } = {}) {
    const catalog = (window.AppConfig && typeof window.AppConfig.getMachineCatalog === 'function')
      ? window.AppConfig.getMachineCatalog()
      : ((window.AppConfig && window.AppConfig.business && window.AppConfig.business.machineCatalog)
        ? window.AppConfig.business.machineCatalog
        : {});

    const plEl = document.getElementById('product-line');
    const selectEl = document.getElementById('machine-select');
    const manualEl = document.getElementById('machine-manual');
    const finalEl = document.getElementById('machine-final');
    const helpEl = document.getElementById('machine-help');

    if (!plEl || !selectEl || !manualEl || !finalEl) return;

    const line = (productLine ?? plEl.value ?? '').toString().trim();
    const models = (line && Array.isArray(catalog[line])) ? catalog[line] : [];
    const searchWrapEl = document.getElementById('machine-search-wrap');
    const searchEl = document.getElementById('machine-search');

    // machine picker state cache (for type-to-filter)
    const prevLine = (this._machinePickerPrevLine || '').toString();
    const lineChanged = prevLine !== line;
    this._machinePickerPrevLine = line;
    this._machinePickerModels = Array.isArray(models) ? models.slice() : [];

    const listMode = !!(line && models.length > 0);

    // 篩選按鈕：僅在清單模式可用，但不切 display（避免造成 reflow / 欄位上下跳動）
    const filterBtn = document.querySelector('.machine-filter-btn');
    if (filterBtn) {
      filterBtn.style.visibility = listMode ? 'visible' : 'hidden';
      filterBtn.style.pointerEvents = listMode ? '' : 'none';
    }
    if (!listMode) this._machineFilterOpen = false;


    // 顯示/隱藏搜尋框；產品線變更時清空搜尋，避免殘留造成「看起來沒資料」
    if (searchWrapEl) searchWrapEl.style.display = (listMode && this._machineFilterOpen) ? '' : 'none';
    if (searchEl) {
      if (!listMode || !this._machineFilterOpen) searchEl.value = '';
      else if (lineChanged) searchEl.value = '';
    }

    const machineVal = (currentMachine ?? finalEl.value ?? '').toString().trim();

    // 清單模式
    if (line && models.length > 0) {
      // 顯示 select
      selectEl.style.display = '';
      selectEl.disabled = false;
      // 更新 options（避免產品線切換後仍殘留上一線的選項）
      // - 支援 type-to-filter：依搜尋字串篩選機型
      // - 若目前 machineVal 不符合篩選條件，仍保留一筆「目前」選項（避免值消失）
      const term = (searchEl?.value || '').toString().trim().toLowerCase();
      const filtered = term
        ? (models || []).filter(m => (m || '').toString().toLowerCase().includes(term))
        : (models || []);

      const inList = models.includes(machineVal);
      const includeCurrent = !!(term && machineVal && inList && !filtered.includes(machineVal));

      const optionsHtml = [
        `<option value="">${term ? '（請選擇）' : '請選擇設備名稱'}</option>`,
        ...(includeCurrent ? [`<option value="${this._escapeAttr(machineVal)}">${this._escapeHtml(machineVal)}（目前）</option>`] : []),
        ...filtered.map(m => `<option value="${this._escapeAttr(m)}">${this._escapeHtml(m)}</option>`),
        `<option value="__manual__">其他 / 手動輸入</option>`
      ].join('');
      selectEl.innerHTML = optionsHtml;

      if (machineVal && inList) {
        selectEl.value = machineVal;
        manualEl.style.display = 'none';
        manualEl.value = '';
        finalEl.value = machineVal;
      } else if (machineVal) {
        // 現有值不在清單：改走手動
        selectEl.value = '__manual__';
        manualEl.style.display = '';
        manualEl.value = machineVal;
        finalEl.value = machineVal;
      } else {
        // 尚未填寫：保持等待選擇
        selectEl.value = '';
        manualEl.style.display = 'none';
        manualEl.value = '';
        finalEl.value = '';
      }


      if (helpEl) helpEl.textContent = '可從清單選擇；若清單沒有，請選擇「其他 / 手動輸入」。';
    } else {
      // 手動模式（未指定產品線）
      selectEl.style.display = 'none';
      selectEl.disabled = true;
      if (searchWrapEl) searchWrapEl.style.display = 'none';
      if (searchEl) searchEl.value = '';
      manualEl.style.display = '';
      manualEl.value = machineVal;
      finalEl.value = machineVal;
      if (helpEl) helpEl.textContent = '未指定產品線時，請直接輸入設備名稱。';
    }

    // required 同步
    try { if (typeof this._applyEquipmentRequired === 'function') this._applyEquipmentRequired(); } catch (_) {}
  },

  handleProductLineChange(event) {
    try {
      const line = (event?.target?.value || '').toString();
      const finalEl = document.getElementById('machine-final');
      const current = (finalEl?.value || '').toString();
      this._syncEquipmentPickerState({ productLine: line, currentMachine: current });
      try { if (typeof this.updateSerialHints === 'function') this.updateSerialHints(); } catch (_) {}
    } catch (e) {
      console.warn('handleProductLineChange failed:', e);
    }
  },

  handleMachineSelectChange(event) {
    try {
      const value = (event?.target?.value || '').toString();
      const manualEl = document.getElementById('machine-manual');
      const finalEl = document.getElementById('machine-final');
      if (!finalEl || !manualEl) return;

      if (value === '__manual__') {
        manualEl.style.display = '';
        manualEl.focus?.();
        finalEl.value = (manualEl.value || '').toString().trim();
      } else {
        manualEl.style.display = 'none';
        manualEl.value = '';
        finalEl.value = (value || '').toString().trim();
      }

      try { if (typeof this._applyEquipmentRequired === 'function') this._applyEquipmentRequired(); } catch (_) {}

      try { if (typeof this.updateSerialHints === 'function') this.updateSerialHints(); } catch (_) {}
    } catch (e) {
      console.warn('handleMachineSelectChange failed:', e);
    }
  },

  handleMachineManualInput(event) {
    try {
      const value = (event?.target?.value || '').toString();
      const finalEl = document.getElementById('machine-final');
      if (finalEl) finalEl.value = value;
      try { if (typeof this.updateSerialHints === 'function') this.updateSerialHints(); } catch (_) {}
    } catch (e) {
      console.warn('handleMachineManualInput failed:', e);
    }
  },
  // 設備名稱下拉：type-to-filter（不影響最終 machine 值，僅協助快速定位）
  handleMachineSearchInput(event) {
    try {
      const term = (event?.target?.value || '').toString();
      this._applyMachineTypeFilter(term);
    } catch (e) {
      console.warn('handleMachineSearchInput failed:', e);
    }
  },

  // 設備名稱：展開/收合「機型篩選」輸入框（避免預設出現兩排控制項）
  toggleMachineFilter(event) {
    try {
      const wrap = document.getElementById('machine-search-wrap');
      const searchEl = document.getElementById('machine-search');
      if (!wrap) return;

      const isHidden = (wrap.style.display === 'none' || (window.getComputedStyle && window.getComputedStyle(wrap).display === 'none'));
      const nextShow = !!isHidden;
      this._machineFilterOpen = nextShow;
      wrap.style.display = nextShow ? '' : 'none';

      if (searchEl) {
        if (nextShow) {
          searchEl.focus?.();
        } else {
          // 收合時清空關鍵字並還原選項
          searchEl.value = '';
          try { if (typeof this._applyMachineTypeFilter === 'function') this._applyMachineTypeFilter(''); } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('toggleMachineFilter failed:', e);
    }
  },

  _applyMachineTypeFilter(termRaw = '') {
    const selectEl = document.getElementById('machine-select');
    const finalEl = document.getElementById('machine-final');
    const manualEl = document.getElementById('machine-manual');
    const searchEl = document.getElementById('machine-search');
    if (!selectEl || !finalEl) return;
    if (selectEl.style.display === 'none' || selectEl.disabled) return;

    const models = Array.isArray(this._machinePickerModels) ? this._machinePickerModels : [];
    const term = (termRaw || searchEl?.value || '').toString().trim().toLowerCase();

    const filtered = term
      ? models.filter(m => (m || '').toString().toLowerCase().includes(term))
      : models;

    const currentSelectValue = (selectEl.value || '').toString();
    const machineVal = (finalEl.value || '').toString().trim();

    const selectedModel = (currentSelectValue && currentSelectValue !== '__manual__') ? currentSelectValue : (models.includes(machineVal) ? machineVal : '');
    const includeSelected = !!(selectedModel && !filtered.includes(selectedModel) && models.includes(selectedModel));

    const optionsHtml = [
      `<option value="">${term ? '（請選擇）' : '請選擇設備名稱'}</option>`,
      ...(includeSelected ? [`<option value="${this._escapeAttr(selectedModel)}">${this._escapeHtml(selectedModel)}（目前）</option>`] : []),
      ...filtered.map(m => `<option value="${this._escapeAttr(m)}">${this._escapeHtml(m)}</option>`),
      `<option value="__manual__">其他 / 手動輸入</option>`
    ].join('');

    selectEl.innerHTML = optionsHtml;

    // 還原選擇與 UI 狀態（不強制覆寫 finalEl）
    if (currentSelectValue === '__manual__') {
      selectEl.value = '__manual__';
      if (manualEl) manualEl.style.display = '';
    } else if (selectedModel && (includeSelected || filtered.includes(selectedModel))) {
      selectEl.value = selectedModel;
    } else {
      selectEl.value = '';
    }

    try { if (typeof this._applyEquipmentRequired === 'function') this._applyEquipmentRequired(); } catch (_) {}
  },



  _getVisibleMachineField(form = null) {
    const root = form || document.getElementById('repair-form') || document;
    const selectEl = root.querySelector ? root.querySelector('#machine-select') : document.getElementById('machine-select');
    const manualEl = root.querySelector ? root.querySelector('#machine-manual') : document.getElementById('machine-manual');

    const isVisible = (el) => {
      if (!el) return false;
      if (el.disabled) return false;
      if (el.style && el.style.display === 'none') return false;
      if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
        try {
          return window.getComputedStyle(el).display !== 'none';
        } catch (_) {
          return true;
        }
      }
      return true;
    };

    if (isVisible(manualEl)) return manualEl;
    if (isVisible(selectEl)) return selectEl;
    return manualEl || selectEl || null;
  },

  _resolveMachineValue(form = null) {
    const root = form || document.getElementById('repair-form') || document;
    const finalEl = root.querySelector ? root.querySelector('#machine-final') : document.getElementById('machine-final');
    const selectEl = root.querySelector ? root.querySelector('#machine-select') : document.getElementById('machine-select');
    const manualEl = root.querySelector ? root.querySelector('#machine-manual') : document.getElementById('machine-manual');

    const trim = (v) => (v === null || v === undefined) ? '' : String(v).trim();
    const isVisible = (el) => {
      if (!el) return false;
      if (el.disabled) return false;
      if (el.style && el.style.display === 'none') return false;
      if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
        try {
          return window.getComputedStyle(el).display !== 'none';
        } catch (_) {
          return true;
        }
      }
      return true;
    };

    let value = trim(finalEl?.value);

    if (!value && isVisible(selectEl)) {
      const picked = trim(selectEl.value);
      if (picked && picked !== '__manual__') value = picked;
    }

    if ((!value || (isVisible(selectEl) && trim(selectEl?.value) === '__manual__')) && isVisible(manualEl)) {
      value = trim(manualEl.value);
    }

    if (finalEl) finalEl.value = value;
    return value;
  },

  _applyEquipmentRequired() {
    const form = document.getElementById('repair-form');
    if (!form) return;

    const finalEl = document.getElementById('machine-final');
    const selectEl = document.getElementById('machine-select');
    const manualEl = document.getElementById('machine-manual');
    const activeEl = this._getVisibleMachineField(form);

    const setReq = (el, on) => {
      if (!el) return;
      try { el.required = !!on; } catch (_) {}
      try {
        if (on) el.setAttribute('aria-required', 'true');
        else el.removeAttribute('aria-required');
      } catch (_) {}
    };

    setReq(finalEl, false);
    setReq(selectEl, activeEl === selectEl);
    setReq(manualEl, activeEl === manualEl);

    try { if (typeof this._resolveMachineValue === 'function') this._resolveMachineValue(form); } catch (_) {}
  },

  _escapeHtml(input) {
    const s = (input === null || input === undefined) ? '' : String(input);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  _escapeAttr(input) {
    return this._escapeHtml(input).split('\n').join(' ').split('\r').join(' ');
  }
});

console.log('✅ RepairUI (Forms & Details) loaded');


// Static delegates：讓 HTML inline handler 可直接呼叫 RepairUI.xxx
// （RepairUI 實作主要在 window.repairUI 實例上）
Object.assign(RepairUI, {
  handleSubmit: (event) => {
    try { if (typeof window.repairUI?.handleSubmit === 'function') return window.repairUI.handleSubmit(event); }
    catch (e) { console.warn('handleSubmit failed:', e); }
  },
  handleStatusChange: (event) => {
    try { if (typeof window.repairUI?.handleStatusChange === 'function') return window.repairUI.handleStatusChange(event); }
    catch (e) { console.warn('handleStatusChange failed:', e); }
  },
  handleProgressChange: (event) => {
    try { if (typeof window.repairUI?.handleProgressChange === 'function') return window.repairUI.handleProgressChange(event); }
    catch (e) { console.warn('handleProgressChange failed:', e); }
  },
  handleNeedPartsChange: (event) => {
    try { if (typeof window.repairUI?.handleNeedPartsChange === 'function') return window.repairUI.handleNeedPartsChange(event); }
    catch (e) { console.warn('handleNeedPartsChange failed:', e); }
  },
  handleBillingChargeableChange: (event) => {
    try { if (typeof window.repairUI?.handleBillingChargeableChange === 'function') return window.repairUI.handleBillingChargeableChange(event); }
    catch (e) { console.warn('handleBillingChargeableChange failed:', e); }
  },
  handleBillingOrderStatusChange: (event) => {
    try { if (typeof window.repairUI?.handleBillingOrderStatusChange === 'function') return window.repairUI.handleBillingOrderStatusChange(event); }
    catch (e) { console.warn('handleBillingOrderStatusChange failed:', e); }
  },
  handleCustomerPick: (event) => {
    try { if (typeof window.repairUI?.handleCustomerPick === 'function') return window.repairUI.handleCustomerPick(event); }
    catch (e) { console.warn('handleCustomerPick failed:', e); }
  },
  handleContactPick: (event) => {
    try { if (typeof window.repairUI?.handleContactPick === 'function') return window.repairUI.handleContactPick(event); }
    catch (e) { console.warn('handleContactPick failed:', e); }
  },
  handleProductLineChange: (event) => {
    try { if (typeof window.repairUI?.handleProductLineChange === 'function') return window.repairUI.handleProductLineChange(event); }
    catch (e) { console.warn('handleProductLineChange failed:', e); }
  },
  handleMachineSelectChange: (event) => {
    try { if (typeof window.repairUI?.handleMachineSelectChange === 'function') return window.repairUI.handleMachineSelectChange(event); }
    catch (e) { console.warn('handleMachineSelectChange failed:', e); }
  },
  handleMachineManualInput: (event) => {
    try { if (typeof window.repairUI?.handleMachineManualInput === 'function') return window.repairUI.handleMachineManualInput(event); }
    catch (e) { console.warn('handleMachineManualInput failed:', e); }
  },
  handleMachineSearchInput: (event) => {
    try { if (typeof window.repairUI?.handleMachineSearchInput === 'function') return window.repairUI.handleMachineSearchInput(event); }
    catch (e) { console.warn('handleMachineSearchInput failed:', e); }
  },
  toggleMachineFilter: (event) => {
    try { if (typeof window.repairUI?.toggleMachineFilter === 'function') return window.repairUI.toggleMachineFilter(event); }
    catch (e) { console.warn('toggleMachineFilter failed:', e); }
  },
  confirmDelete: (id) => {
    try { if (typeof window.repairUI?.confirmDelete === 'function') return window.repairUI.confirmDelete(id); }
    catch (e) { console.warn('confirmDelete failed:', e); }
  },

  // MNT-4：維修單 ↔ 保養連動
  closeAndWriteMaintenance: (id) => {
    try { if (typeof window.repairUI?.closeAndWriteMaintenance === 'function') return window.repairUI.closeAndWriteMaintenance(id); }
    catch (e) { console.warn('closeAndWriteMaintenance failed:', e); }
  },
  closeModal: (options) => {
    try { if (typeof window.repairUI?.closeModal === 'function') return window.repairUI.closeModal(options); }
    catch (e) { console.warn('closeModal failed:', e); }
    return false;
  },
  isModalOpen: () => {
    try { return !!window.repairUI?.isModalOpen?.(); }
    catch (_) { return false; }
  }
});
