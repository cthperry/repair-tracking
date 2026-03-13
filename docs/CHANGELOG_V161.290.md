# CHANGELOG V161.290

日期：2026-03-13（Asia/Taipei）
基底：V161.289
BUILD_NUMBER：289 → 290

## 本版定位
本版不做新功能擴張，先將 RepairTracking 從「持續 patch」正式收斂為可持續維護的工程基底。

## 本版新增文件
- `docs/ARCHITECTURE.md`
- `docs/HANDOFF.md`
- `docs/DEPLOYMENT.md`
- `docs/FIREBASE_RULES.md`
- `docs/VERSION_POLICY.md`
- `docs/UI_UX_GUIDELINE.md`
- `docs/DATA_MODEL.md`
- `docs/QA_CHECKLIST.md`
- `docs/CHANGELOG.md`

## 本版同步整理
- `docs/README.md`：更新目前穩定基底資訊
- `docs/QUICK_START_GUIDE.md`：同步目前 Build 與 auth 啟動策略
- `core/config.js`：`VERSION_DATE` 更新為 `2026-03-13`，`BUILD_NUMBER` 更新為 `290`

## 目的
1. 先固定文件、結構、驗收標準
2. 後續 UI/UX 收斂、資料模型整理、QA 制度化均以本版文件為準
3. 避免後續版本再次出現只修局部、未檢查整體影響的情況

## 下一階段建議
1. 依 `UI_UX_GUIDELINE.md` 統一 badge / modal / sticky footer / FAB 安全區
2. 依 `DATA_MODEL.md` 統一 Repair / Quote / Order / Billing / SOP 關聯欄位
3. 依 `QA_CHECKLIST.md` 建立 smoke test 與 regression 節奏
