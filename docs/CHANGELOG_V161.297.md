# V161.297 變更記錄

日期：2026-03-13

## 本版重點
- 修正客戶管理在既有公司下新增聯絡人時，點擊「儲存」無法送出的根因問題。

## 根因
- `customers.ui.js` 的事件委派與靜態開窗流程，依賴的是 `window.CustomerUIForms`。
- `customers.ui-forms.js` 實際只公開 `window.customerUIForms`，兩者公開契約不一致。
- 新增聯絡人視窗的儲存按鈕是 `type="button"`，完全依賴委派事件去呼叫表單處理器。
- 因為 forms API 名稱不一致，按下儲存時沒有真正進到 `handleSubmit()`，所以看起來像「無法儲存」。

## 結構性修正
- 建立統一的客戶表單公開 API：`window.customerUIFormsApi`。
- `customers.ui.js` 改為透過 `_getFormsApi()` 取得表單 API，不再硬綁單一全域名稱。
- `customers.ui-forms.js` 統一對外公開：
  - `window.customerUIForms`
  - `window.customerUIFormsApi`
  - `window.CustomerUIForms`（相容入口，指向同一份 API）
- 新增/編輯/刪除/詳情開窗都走同一份表單 API 契約。

## 影響範圍
- 客戶管理：
  - 既有公司下新增聯絡人
  - 從工具列新增聯絡人
  - 聯絡人詳情 → 編輯
  - 聯絡人刪除

## 驗證
- `node --check features/customers/customers.ui.js`
- `node --check features/customers/customers.ui-forms.js`
- `node --check core/config.js`
