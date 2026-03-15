# CHANGELOG V161.325

日期：2026-03-14（Asia/Taipei）

## 本版重點
- 以同一組 team 的方式，把 enterprise detail surface 正式收斂成共用 helper + 共用樣式。
- Repairs 詳情頁與 Customers 詳情頁同步導入，避免主檔 detail page 再各自長出不同模板。

## 主要修正
1. `core/ui.js`
   - 新增 `UI.enterpriseStatHTML()`
   - 新增 `UI.enterpriseOverviewItemHTML()`
   - 新增 `UI.enterpriseOverviewNoteHTML()`
2. `features/repairs/repairs.ui-forms.js`
   - hero / overview / command bar 改走 enterprise detail helper
   - history tab 預設改走 `hidden`
3. `features/repairs/repairs.ui.js`
   - `switchDetailTab()` 改成 `hidden + aria-selected`
4. `features/customers/customers.ui-forms.js`
   - 詳情頁改吃共用 enterprise detail helper
5. `core/ui.css`
   - 補上 enterprise detail tone-info 與 surface 細節樣式

## 影響範圍
- 維修詳情頁
- 客戶詳情頁
- 後續所有 enterprise detail 類模組
