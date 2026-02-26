# V161.192 變更記錄

日期：2026-01-13

## 修正
- 維修單表單「聯絡人下拉」可正常捲動與選取：
  - 改回使用 click 事件處理選取，避免觸控/拖曳捲動時被 pointerdown 誤判為點選，造成「卡住/無法滑動」。
  - 保留外部點擊關閉、ESC 關閉，以及滾動/縮放自動關閉（避免選單位置不對）。

## 影響檔案
- features/repairs/repairs.ui.js
- core/config.js
- docs/CHANGELOG_V161.192.md
