# CHANGELOG V161.315

- Weekly 週報案件標題改為只顯示客戶 / 機台，不再顯示維修單號或案件 ID。
- 新增 `WeeklyService._getWeeklyCaseLabel()` 作為週報案件顯示唯一入口，避免後續 fallback 再把 `repairNo` / `id` 帶回輸出。
- `core/config.js` 版號推進至 `BUILD_NUMBER = 315`，`VERSION_DATE = 2026-03-14`。
