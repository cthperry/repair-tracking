# RepairTracking V161.355 變更紀錄

## 本版修正

### 客戶管理 submit 鏈 root cause 修正
- 修正 `features/customers/customers.ui.js` 的 modal direct submit handler
- 修正 `features/customers/customers.ui.js` 的 container submit delegation
- 統一改用 `form.getAttribute('id')` 判斷表單 id，避免被 `<input name="id">` 的 named access 覆蓋
- 修正 `render()` 重新進頁面時主動重置 `_domBound`，避免第二次進客戶頁事件失效

## 影響流程
- 客戶管理 → 編輯聯絡人 → 儲存
- 客戶管理 → 新增聯絡人 → 儲存
- 客戶管理 → 公司更名同步 → 送出
- 客戶頁第二次進入後工具列與按鈕事件
