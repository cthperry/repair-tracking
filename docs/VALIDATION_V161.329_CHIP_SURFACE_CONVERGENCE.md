# VALIDATION V161.329

## 驗證範圍
- `core/ui.js`
- `core/ui.css`
- `features/machines/machines.ui.js`
- `features/parts/parts.ui.js`
- `features/repairs/repairs.ui.js`

## 已確認
- `UI.chipHTML()` 已存在，並可產生帶 tone / active / static 狀態的 chip。
- `core/ui.css` 已新增 `.chip.tone-*`、`.enterprise-detail-chip.tone-*` 與 `.stat-card.tone-*`。
- Parts quick filter chips 與 summary stats 已不再依賴 inline `--chip-color` / `--accent`。
- Machines 的序號清單、維修履歷與流程摘要已改走共用 chip helper。
- Repairs 的 scope / status / history date preset 與 quick summary chips 已改走共用 helper。
