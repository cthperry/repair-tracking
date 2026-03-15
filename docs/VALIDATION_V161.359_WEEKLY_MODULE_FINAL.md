# VALIDATION V161.359 WEEKLY MODULE FINAL

## 已做靜態檢查
- node --check core/config.js
- node --check features/weekly/weekly.service.js
- node --check features/weekly/weekly.ui.js
- node --check features/weekly/weekly.controller.js
- node --check features/weekly/weekly.model.js
- node tools/validate-weekly-contract.js

## 檢查重點
- 週報固定契約：問題描述 / 工作內容 / 完成狀態 / 收費
- 下週計畫固定契約：計畫內容
- 禁止舊欄位：問題摘要 / 本週處置 / 商務摘要 / 料件摘要 / [需要零件]
- 預覽 / 寄送共用同一份 Email payload
- WeeklyController 補齊 RepairPartsService 初始化
- ZIP 需維持平面根目錄
