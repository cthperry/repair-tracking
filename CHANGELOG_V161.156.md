# V161.156（MNT-2）變更摘要

日期：2026-01-08

## 機台保養（Maintenance）

### 設備資料欄位擴充
- 新增：負責人 Email（ownerEmail）
- 新增：安裝日期（installDate）。若設備尚無任何保養紀錄，會以安裝日期作為週期起算基準計算下次到期日。
- 新增：提醒天數（remindDays）。設備可自訂提醒天數；留白則使用系統預設提醒天數（defaultRemindDays）。

### 提醒設定（Dashboard 設定區）
- 新增：預設提醒天數（defaultRemindDays，預設 3/7）
- 新增：是否優先使用設備負責人 Email（useOwnerEmail）
- 新增：CC（emailCc）
- Email 提醒：依收件人分組產生多個 mailto 連結，並提供可複製提醒內容。

### 報表與匯出
- 報表新增：依位置統計、依負責人統計、最近 6 個月保養次數趨勢。
- Excel 匯出：設備清單新增欄位（負責Email/安裝日期/提醒天數/基準日期），並包含統計與趨勢表。
- CSV 匯出：同上，並加入 UTF-8 BOM 以避免 Excel 亂碼。


## V161.166 (2026-01-10)
- 報價單：新增「輸出 PDF」功能（套用母版 PDF：assets/quote/quote_template.pdf），支援下載 PDF。
- 內嵌中文字型：assets/fonts/bsmi00lp.ttf（Arphic）。
