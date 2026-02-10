# Changelog｜V161.152

> 唯一基底：V161.151 → 升版至 V161.152（nolegacy）

## P3-3（A 主線）— 自訂檢視（Saved Views）第一階段

### 維修管理（repairs）
- 新增「檢視：預設 / 已儲存檢視」下拉選單。
- 新增「⭐ 儲存」：將目前篩選條件（含 scope、日期區間、狀態/優先級、只看我的、需零件、排序、列表密度）保存為檢視。
- 新增「⚙ 管理」：可在 modal 內對檢視進行 **套用 / 改名 / 刪除**。
- 檢視資料以 uid 隔離存放於 localStorage（uid 不可得則使用 anon）。

### 行為設計
- 選擇「檢視：預設」僅清除「檢視選取」狀態，不強制清空目前篩選（避免誤觸造成視圖跳動）。
- 重新進入維修管理時，若上次有選取檢視，會先套用該檢視（確保 scope/篩選面板內容一致）。

## 核心元件（core）
- core/ui.js：新增 `UI.prompt()` 與 `UI.openModal()`，供模組做更一致的互動視窗。
- core/saved-views.js：新增 SavedViews 共用工具（list/upsert/rename/remove）。
- core/ui.css：補齊 prompt/modal 與 Saved Views 管理列表所需樣式。

## 影響範圍
- 不改動既有資料結構與後端資料寫入。
- 不改動既有 UI 版面結構（僅在維修管理工具列新增「檢視」控件）。
