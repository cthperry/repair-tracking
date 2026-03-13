# 變更紀錄｜V161.188

日期：2026-01-12

## 修正

1. 維修單表單：選擇公司後「聯絡人/電話/Email 不帶入」
   - 修正 `repairs.ui.js` 註解未關閉造成的語法錯誤（導致 company/contact handler 無法執行）。
   - 調整公司選擇帶入邏輯：
     - 公司變更（A→B）會先清空聯絡人/電話/Email，避免殘留上一家公司資料。
     - 公司有效且存在聯絡人時：
       - 優先使用「同公司最近一筆維修單」的聯絡人作為預設帶入（若存在於客戶主檔）。
       - 否則帶入客戶主檔最新一筆聯絡人。
     - 同步更新聯絡人 datalist。

## 影響範圍
- Desktop + Mobile 共用維修單表單。

## 變更檔案
- `features/repairs/repairs.ui.js`
- `core/config.js`
- `docs/CHANGELOG_V161.188.md`
