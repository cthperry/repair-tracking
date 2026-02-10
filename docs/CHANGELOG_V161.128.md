# V161.128 變更摘要（P2-3：瘦身/統一 helper 第三段-1）

基底：V161.127（full_nolegacy）

## 目的
- 降低重複 helper 與相依面積，提升維護性
- 統一時間轉換策略（epoch(ms)），避免散落 `Date.parse` / `Utils.isoToMs` 造成行為不一致

## 主要變更
### 1) 移除 `Utils.isoToMs` 與 `Utils.formatTaipeiDateTime`（改由 TimeUtils 統一）
- 檔案：`core/utils.js`
- 新增內部 `toMs(v)`（優先使用 `TimeUtils.toEpoch` / `toEpoch`）
- `pickLatest()` 預設時間比較改用 `toMs(updatedAt/createdAt)`
- `window.Utils` 匯出移除 `isoToMs / formatTaipeiDateTime`

### 2) Orders/Quotes：停止依賴 `Utils.isoToMs`
- 檔案：
  - `features/orders/orders.service.js`
  - `features/quotes/quotes.service.js`
- `toMs()` 一律改用 `window.toEpoch(v,0)`（fallback `TimeUtils.toEpoch`）

### 3) Repairs UI：時間顯示改用 `TimeUtils.formatTaipeiDateTime`
- 檔案：`features/repairs/repairs.ui.js`
- 顯示用 `fmt()` 統一走 `TimeUtils.formatTaipeiDateTime`（fallback `toEpoch`）

## 版本
- `core/config.js`：`BUILD_NUMBER: '128'`
