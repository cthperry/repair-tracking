# V161.190 變更摘要（2026-01-13）

## 本版重點

### 1) 維修單：同公司多聯絡人可用「箭頭下拉」完整選取
- 在「新增/編輯維修單」的「聯絡人」欄位右側新增 ▾ 按鈕。
- 點擊 ▾ 會顯示該公司所有聯絡人清單（含電話/Email），可直接點選帶入。
- 同時保留原本 datalist：仍可用輸入文字快速搜尋。

### 2) 聯絡人切換時的帶入行為更合理
- 若電話/Email 仍為「上一個聯絡人自動帶入值」或為空，改選聯絡人時會自動更新。
- 若使用者已手動修改電話/Email，系統不會覆寫。

## 影響檔案
- features/repairs/repairs.ui-forms.js
- features/repairs/repairs.ui.js
- features/repairs/repairs.css
- features/guide/guide.ui.js
- docs/QUICK_START_GUIDE.md
- core/config.js
