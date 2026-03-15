# CHANGELOG V161.359

日期：2026-03-15

## 本版重點
- 週報模組整體收斂：固定契約、預覽/寄送共用同一份輸出來源、控制器補齊零件服務初始化。
- 下週計畫欄位 placeholder 與輸出契約改由設定集中管理，避免再次漂移。
- 新增週報整體驗證腳本，直接攔截舊欄位名稱與輸出不一致問題。

## 修改檔案
- core/config.js
- features/weekly/weekly.service.js
- features/weekly/weekly.ui.js
- features/weekly/weekly.controller.js
- tools/validate-weekly-contract.js

## 版本
- BUILD_NUMBER：359
