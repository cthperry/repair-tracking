# CHANGELOG｜V161.185｜2026-01-12

## 修正（Critical）
- 修正「零件追蹤（用料/更換）列表空白」：
  - 相容並自動偵測舊版 `repairParts` 扁平結構（`{pushId: {repairId, ...}}` 或 `[{repairId,...}]`）。
  - 讀取時自動轉換為新結構（依 `repairId` 分群）。
  - 若為 Firebase 舊扁平結構，首次載入會**一次性遷移**為新結構（覆寫成 `{repairId: {itemId: item}}`），以確保後續更新/刪除不失效。

## 變更檔案
- `features/parts/parts.service.js`
- `core/config.js`
