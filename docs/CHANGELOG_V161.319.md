# CHANGELOG V161.319

日期：2026-03-14
BUILD_NUMBER：319

## 問題
- 週報仍輸出登入者自己的負責工程師與日期資訊，內容重複。
- 週報仍輸出摘要統計區，對登入者個人週報價值低。
- 本週處置長文字在 mail 文字預覽中會變成單行，閱讀困難。

## 根因
- Weekly 的文件模板層與案件明細層未切開，仍把登入者上下文資訊混進案件區塊。
- Weekly 缺少專用文字排版器，直接將 `repair.content` 或 work log 原文塞進輸出。

## 修正
- `core/config.js`：新增 `weekly.caseDisplay` 設定，集中管理摘要顯示、日期行顯示與換行寬度。
- `features/weekly/weekly.service.js`：
  - 新增 `_wrapWeeklyLine()` / `_wrapWeeklyTextLines()`。
  - `getThisWeekRepairsText()` 預設不再輸出摘要統計區。
  - `_buildWeeklyRepairBlock()` 移除負責 / 建立 / 更新等重複資訊。
  - `_getWeeklyWorkSummary()` 將長文字轉為多行 `本週處置`。
- `tests/unit/weekly.report-structure.spec.js`：補強不輸出摘要與長文字換行檢查。

## 影響範圍
- Weekly 預覽
- Weekly mail 文字輸出
- Weekly 測試

## 驗證
- 週報輸出不含 `負責：`、`建立：`、`更新：`。
- 週報輸出不含摘要統計區。
- 長篇本週處置會被切成多行。
