# V161.320 變更紀錄

日期：2026-03-14

## 現象
週報標題仍顯示 `本週案件總覽（依更新日）` / `本週案件總覽（依建立日）`，閱讀層出現多餘的系統 basis 說明。

## 根因
`WeeklyService.getThisWeekRepairsText()` 將 `weeklyBasis` 直接轉成標題附註。
這讓原本只應存在於資料篩選層的 basis 設定，外露到週報閱讀層。

## 修正
- 將週報標題固定為 `本週案件總覽`。
- 保留 `created / updated` 作為資料集合篩選規則，不再輸出到標題。
- 同步更新單元測試與驗證文件。

## 影響範圍
- `features/weekly/weekly.service.js`
- `tests/unit/weekly.report-structure.spec.js`
- `docs/CHANGELOG.md`
- `docs/HANDOFF.md`
- `docs/VALIDATION_V161.320_WEEKLY_TITLE.md`

## 是否為結構性修正
是。
這次把 basis 留在 selector / data scope，從 render title 層切除，不是單純字串遮蔽。
