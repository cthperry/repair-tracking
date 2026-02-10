# 變更紀錄｜V161.189（2026-01-12）

## 修正

### 維修單：更換公司後聯絡人/電話/Email 未更新
- 修正觸發條件：公司欄位（含 datalist 選取、點選常用/最近公司 chips、手動輸入後 change）會確實觸發 `handleCustomerPick()`。
- 修正清除策略：當公司變更時（含上一家公司狀態尚未初始化但表單已有舊資料的情況），會先清空聯絡人/電話/Email，避免殘留上一家公司資訊。
- 保留帶入策略：清空後，會依既有規則自動帶入新公司的聯絡人/電話/Email（優先最近一次維修單、其次客戶主檔最新聯絡人）。

## 變更檔案
- `features/repairs/repairs.ui.js`
- `core/config.js`
- `docs/CHANGELOG_V161.189.md`
