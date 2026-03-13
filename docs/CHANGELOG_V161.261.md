# CHANGELOG｜V161.261

日期：2026-02-12（Asia/Taipei）

## Phase 4（優化）
### Dashboard → 待辦事項（第一次點擊不開啟維修詳情）
- 修正「第一次從 Dashboard 待辦事項點擊維修單」僅跳轉到維修管理頁面、未自動開啟詳情的問題。
- 原因：導頁後 Repairs 頁面 DOM 尚未渲染完成（`#repair-modal` / `#repair-modal-content` 尚不存在），`RepairUI.openDetail()` 早於 DOM 建立而無效。
- 修正：在 Dashboard 點擊處理流程中，除既有 `AppRegistry.ensureReady(['RepairService'])` 與資料可取檢查外，新增等待 `#repair-modal` / `#repair-modal-content` 節點就緒後再呼叫 `RepairUI.openDetail(repairId)`（以重試等待機制實作，無固定延遲）。
