# V161.187 變更記錄

## 修正
- 維修單表單：公司名稱變更/清空後，聯絡人/電話/Email 未更新（殘留上一家公司資料）的問題已修正。
  - 公司清空：會同步清空聯絡人 datalist 與聯絡人/電話/Email 欄位。
  - 公司由 A 改為 B：會先清空聯絡人/電話/Email，再依新公司刷新聯絡人清單；若該公司僅 1 位聯絡人則自動帶入。

## 變更檔案
- features/repairs/repairs.ui.js
- core/config.js
- docs/CHANGELOG_V161.187.md
