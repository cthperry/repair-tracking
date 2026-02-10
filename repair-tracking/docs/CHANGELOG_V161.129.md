# V161.129 變更摘要（P2-3：Dead code 清理 + window.* 耦合收斂 第一批）

> 原則：不動功能、不改 UI；僅做瘦身與維護性（Desktop + Mobile 同步）。

## 1) window.* 耦合收斂（降低載入時序風險）
- 新增 `core/registry.js`：提供 `AppRegistry.register/get/has/list` 與 `window.getService()` 入口。
- Desktop/Mobile 皆已載入 `core/registry.js`（位於 `core/utils.js` 後方）。
- Services 啟動時同步註冊至 AppRegistry（仍保留原本 `window.*Service` 輸出，維持相容性）：
  - RepairService / CustomerService / PartService / RepairPartsService / QuoteService / OrderService / WeeklyService / SettingsService
- `QuoteService` / `OrderService` 內部跨 Service 呼叫，改走 `_svc('ServiceName')`（registry-first，window fallback），避免僅依賴全域 window 物件與載入順序。
- `resetAllServices()` 追加 registry 清單合併邏輯，優先以 registry 物件執行 reset/teardown。

## 2) Dead code 清理（小批次、可回溯）
- `core/utils/strings.js`：
  - 移除未被引用的 `safeText()` 與其 export（全域搜尋確認 0 引用）。

## 3) 影響範圍
- 功能流程：無變更
- UI/版面：無變更
- Firebase/資料結構：無變更


## V161.129（補正）
- 修正 AppConfig.BUILD_NUMBER 由 128 → 129，確保頁面版本顯示與交付版號一致（不影響功能/UI）。
