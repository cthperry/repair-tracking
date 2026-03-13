# CHANGELOG V161.254

日期：2026-02-11（Asia/Taipei）

## Phase 8｜收費/下單（未下單原因支援自訂備註）

### 新增/調整
- 維修單 billing 結構擴充：
  - 新增 `billing.notOrdered = { reasonCode, note }`
  - 支援「未下單原因」下拉選項 + 文字備註（最多 300 字）
- 向後相容：若舊資料仍使用 `billing.notOrderedReason`，系統讀取時自動映射至 `billing.notOrdered.reasonCode`

### 同步更新
- Weekly：未下單時會顯示原因 + 備註（以 `｜` 分隔）
- Timeline：欄位顯示名稱新增「未下單備註」
- Analytics：仍以 reasonCode 做分佈統計（note 不納入統計）

### 版本資訊
- BUILD_NUMBER：254
