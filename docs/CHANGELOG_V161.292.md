# CHANGELOG V161.292

日期：2026-03-13

## 本版主題
Form System Audit + Enterprise UI Convergence 第一波。

## 變更摘要
1. 版號推進至 BUILD_NUMBER 292。
2. 在 `core/ui.css` 新增 `enterprise-form` 收斂規格，統一表單 section、label、help、radio、action row。
3. Repair 主表單改為正式企業級段落說明與固定寬版 modal，降低欄位拼裝感。
4. Quote / Order 建立與明細表單補齊段落說明，並固定狀態、項目、備註、歷史區的閱讀順序。
5. WorkLog 新增/編輯表單改寫為共用核心表單規格，不再維持獨立且風格偏舊的輸入樣式。
6. Settings 卡片內表單改為固定 label 欄寬與分隔線節奏，提升正式度。
7. SOP 新增、詳情、上傳版本表單改為同一表單語言，避免像臨時管理頁。

## 驗證項目
- JavaScript 語法檢查：`core/config.js`、`features/repairs/repairs.ui-forms.js`、`features/quotes/quotes.ui.js`、`features/orders/orders.ui.js`、`features/worklogs/worklog.ui.js`、`features/settings/settings.ui.js`、`features/sops/sops.ui.js`
- ZIP 維持單層結構

## 後續建議
1. 第二波可進一步統一表單錯誤訊息顯示位置與必填提示
2. 補 Dashboard / Detail KPI 卡片與 toolbar 尺寸規格
3. 針對 Repair / Quote / Order 補 smoke test 與手機實機回歸案例
