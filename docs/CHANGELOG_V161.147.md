# Changelog - V161.147

日期：2026-01-06

## P3-2（可摺疊快速篩選面板）

### 新增
- Orders：新增「可摺疊進階篩選面板」（不影響既有卡片/明細功能）。
  - 支援多條件組合篩選：
    - 下單日期範圍（From/To）
    - 預計到貨範圍（From/To）
    - 金額範圍（最低/最高）
    - 供應商關鍵字（包含）
    - 狀態（詳細）與排序（保留既有選項）
  - 篩選面板展開/收合狀態會寫入 localStorage（key：`ui_orders_filters_open`，帶系統 prefix）。

### 調整
- Orders：查詢簽章（query signature）納入進階篩選條件，確保條件變更時自動重置分頁顯示數量。

### 相容性
- Desktop + Mobile 同步支援；僅新增 UI 控制與 client-side 篩選，不改資料結構。
