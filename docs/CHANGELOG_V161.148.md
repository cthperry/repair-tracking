# 變更記錄｜V161.148

範圍：P3（UX / 可用性強化）— 維修管理（Repairs）篩選面板體驗修正

## 修正 / 改善
- 維修管理列表「篩選面板」支援記住開關狀態（localStorage：ui_repairs_filters_open，含系統 prefix）
- 篩選按鈕文字隨開關狀態切換（工具列與空狀態按鈕）
- scope（進行中/歷史）切換時，篩選面板會同步刷新內容與欄位回填：
  - 歷史模式：隱藏狀態篩選，日期範圍對應完成日期（completedFrom/completedTo）
  - 進行中模式：顯示狀態篩選，日期範圍對應維修日期（dateFrom/dateTo）
- 篩選欄位回填（keyword/status/priority/owner/date range/needParts），避免展開時顯示舊值或空值

## 版本
- BUILD_NUMBER：147 → 148
