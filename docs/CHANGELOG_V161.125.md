# V161.125

## 修正
- 修正「新增/編輯維修單 → 常用公司」長時間停在「載入中...」無法使用：
  - 根因：SettingsService 在 Firebase 讀取階段可能因網路/連線狀態造成 `ref.once('value')` 長時間 pending，導致依賴 settings 的 UI 一直卡住。
  - 作法：為 Firebase `once('value')` 加入 1500ms timeout，超時即自動 fallback 至 localStorage/defaultSettings，避免整個初始化流程被卡死。

## 影響範圍
- 不變更任何 UI 外觀、不變更 Firebase 資料結構/路徑。
