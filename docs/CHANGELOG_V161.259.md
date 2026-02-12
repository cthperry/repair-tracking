# CHANGELOG｜V161.259

日期：2026-02-11（Asia/Taipei）

## 修正
- Dashboard → 待辦事項「維修逾期…」：第一次點擊即開啟對應維修單詳情（不再只跳到維修管理，避免需點第二次）。
  - 作法：點擊後先 `AppRegistry.ensureReady(['RepairService'])`，必要時觸發一次 `RepairService.loadData()`，待資料與 `RepairUI.openDetail()` 就緒後再開啟。

## 結構整理
- 根目錄文件（CHANGELOG/README）已統一移至 `docs/`，避免根目錄凌亂。
