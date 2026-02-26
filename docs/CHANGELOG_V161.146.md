# Changelog - V161.146

日期：2026-01-06

## P3-2（可摺疊快速篩選面板）

### 新增
- Quotes：新增「可摺疊進階篩選面板」（不影響既有卡片/明細功能）。
  - 支援多條件組合篩選：
    - 建立日期範圍（From/To）
    - 金額範圍（最低/最高）
    - 狀態（詳細）與排序（保留既有選項）
  - 篩選面板展開/收合狀態會寫入 localStorage（key：`ui_quotes_filters_open`，帶系統 prefix）。

### 調整
- Quotes：查詢簽章（query signature）納入日期/金額範圍，確保條件變更時自動重置分頁顯示數量。

### 相容性
- Desktop + Mobile 同步支援；僅新增 UI 控制與 client-side 篩選，不改資料結構。
