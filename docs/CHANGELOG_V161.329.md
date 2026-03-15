# CHANGELOG V161.329

BUILD_NUMBER：329

## 本版重點
- 建立全站共用 `UI.chipHTML()`，統一 Repairs / Parts / Machines 的 chips 與 quick filter 表面語法。
- 新增 `.chip.tone-*`、`.enterprise-detail-chip.tone-*` 與 `.stat-card.tone-*`，讓高頻狀態顯示改由共用 tone class 控制。
- Parts 移除 summary / quick filter 內的 inline accent。
- Machines 的序號清單、維修履歷與流程摘要 chips 改走共用 helper。
