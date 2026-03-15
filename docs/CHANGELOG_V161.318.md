# CHANGELOG V161.318

- 日期：2026-03-14
- BUILD_NUMBER：314 → 318

## 現象
- 週報不需要再特別強調結案資料。
- 同一案件不應在週報內重複出現多次。
- 週報不應顯示維修單號。

## 根因
Weekly 先前直接讓 Repair domain 原始物件進入輸出層，造成：
1. 明細段落同時使用 `newRows / closedRows / reportRows`，同一案件容易重複出現。
2. 輸出層可直接讀取 `repairNo / id`，顯示規則容易漂移。
3. 摘要、明細、排版與驗證沒有共用同一份輸出契約。

## 結構性修正
1. 建立 Weekly 專用 view model：`reportRowsView`。
2. 週報詳細輸出固定為 `週報摘要 → 本週案件總覽`。
3. 案件標題固定為 `客戶｜機台`，客戶與機台皆空白時顯示 `未命名案件`。
4. 結案資訊保留在摘要數字，不再輸出成獨立結案明細段。
5. 補上 Weekly 模組規格與 QA 清單文件，讓後續修改回到同一份母規格。

## 影響檔案
- `core/config.js`
- `features/weekly/weekly.service.js`
- `features/weekly/weekly.ui.js`
- `tests/helpers/loadScript.js`
- `tests/unit/weekly.report-structure.spec.js`
- `docs/WEEKLY_MODULE_SPEC.md`
- `docs/WEEKLY_QA_CHECKLIST.md`
- `docs/HANDOFF.md`
- `docs/UI_UX_GUIDELINE.md`
- `docs/CHANGELOG.md`

## 驗證
- 已用實際腳本驗證週報輸出只保留單一案件總覽段。
- 已驗證同一案件不再因新增 / 結案分類而重複出現。
- 已驗證週報輸出不包含 `repairNo / id`。
