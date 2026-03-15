# V161.323 變更紀錄

- BUILD_NUMBER：322 → 323
- 日期：2026-03-14

## 本版目標
- 以同一組 team 的方式，將 Customers / Parts 納入同一輪全站收斂。
- 同步處理架構、視覺、排版、互動狀態管理與文件。

## 重點修正
1. Customers
   - 首屏改走 `ops-module-shell` / `ops-toolbar` / `ops-kpi` 語法。
   - 篩選面板改用 `hidden` 控制，不再直接寫 `style.display`。
   - empty state 改走 `UI.emptyStateHTML()`，並同步收斂 modal 顯示規則。
2. Parts
   - 首屏 toolbar / summary / filters / empty state 納入同一輪 page grammar。
   - filters 與 modal 改用 `hidden` 控制。
   - tracker / catalog 無資料時改走共用 empty state。
3. 文件
   - 新增 `docs/SITE_CONVERGENCE_PLAN_V161.323.md`
   - 新增 `docs/VALIDATION_V161.323_CUSTOMERS_PARTS_CONVERGENCE.md`

## 主要變更檔案
- `core/config.js`
- `features/customers/customers.ui.js`
- `features/customers/customers.css`
- `features/parts/parts.ui.js`
- `features/parts/parts.css`
- `docs/README.md`
- `docs/CHANGELOG.md`
- `docs/HANDOFF.md`
