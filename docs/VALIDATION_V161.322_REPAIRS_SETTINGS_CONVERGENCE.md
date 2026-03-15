# V161.322 驗證紀錄

## 已驗證
- Repairs 首屏改為 `ops` shell 後，`repairs-count`、篩選按鈕、同步、新增維修單仍存在。
- Repairs 篩選面板改用 `hidden` 控制，`setFiltersPanelOpen()` 仍會同步按鈕文字與表單值。
- Repairs 主 modal 改用 `setModalOpen()` / `isModalOpen()`，刪除維修單後可正確關閉已開啟的詳情/表單 modal。
- Repairs 列表控制列已只剩單一 helper `renderListHeader()`，避免 renderList / renderListShell 再維護兩份結構。
- Settings 週報 basis 提示文字已改為目前正式規格。
- Settings admin 新增列改用 `hidden` 控制，功能邏輯維持不變。

## 語法檢查
- `node --check core/config.js`
- `node --check features/repairs/repairs.ui.js`
- `node --check features/settings/settings.ui.js`

## 結構收斂量化
- Repairs 列表控制列重複 template：`2 → 1`（改由 `renderListHeader()` 單一來源輸出）
- Repairs 頁面層 inline style：`72 → 64`
- Settings 頁面層 inline style：`27 → 25`

## 誠實說明
- 本包未包含已安裝的完整測試依賴，因此未直接跑 `vitest` / `playwright`。
- 本次以語法檢查與結構性程式碼檢視為主。
