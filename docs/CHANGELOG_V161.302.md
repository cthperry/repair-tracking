## V161.302 - 2026-03-13

### 主題
企業級表單系統第二波收斂（Enterprise Form System Convergence Phase 2）

### 根因導向修正
1. 大型表單 modal 長期讓整個 dialog 一起捲動，造成首屏資訊壓縮、header 與 footer 的層級不明確。
2. 主要表單缺乏首屏上下文資訊，使用者進入編輯時需要先閱讀多段內容才知道目前模式、單號、狀態與關聯對象。
3. Customer 模組在「既有公司下新增聯絡人」時仍沿用可選公司欄位元件，導致公司名稱出現不合理的下拉暗示，與流程語意不一致。

### 本版調整
- 補上 `form-context-bar` 元件，統一呈現模式、關鍵狀態、客戶/單號、資料用途。
- 將 Repair / Quote / Order / Customer 大型表單 modal 收斂為 `header + scroll body + sticky footer`。
- 收斂 enterprise-form section 與只讀欄位樣式，讓正式表單與資訊提示層級更穩定。
- 維修單表單的公司名稱、Email 改為全寬關鍵欄位。
- Customer 新增聯絡人於既有公司模式改為鎖定公司名稱，不再顯示可切換的下拉暗示。

### 驗證
- `node --check core/config.js`
- `node --check features/repairs/repairs.ui-forms.js`
- `node --check features/quotes/quotes.ui.js`
- `node --check features/orders/orders.ui.js`
- `node --check features/worklogs/worklog.ui.js`
- `node --check features/customers/customers.ui-forms.js`
