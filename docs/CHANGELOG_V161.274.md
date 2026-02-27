# CHANGELOG — V161.274 (Phase 4)

## 修正
- Customers（客戶管理）：修正事件委派處理中誤用 `this.openForm/openDetail/openRenameCompany`，導致 `TypeError: this.openForm is not a function`，進而「新增聯絡人/開詳情/公司更名」無法操作。

## 影響範圍
- 僅修正 `features/customers/customers.ui.js` 的 delegated click action dispatch。
- 不變更 Service / Controller 初始化規則（維持 Phase 1–3 架構硬規則）。
