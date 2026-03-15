# VALIDATION V161.340

## 驗證項目
- `node --check core/config.js`
- `node --check features/weekly/weekly.service.js`
- `node --check features/weekly/weekly.ui.js`
- `node --check features/weekly/weekly.model.js`
- `node --check features/settings/settings.ui.js`

## 靜態驗證結果
- 側欄 token 已改為淺色配色。
- 側欄樣式不再依賴深底白字組合。
- 週報來源文案已改為「本週新增維修單 + 本週新增工作紀錄」。
- 週報服務層已改為依工作紀錄 / 新建單據決定納入範圍。
- 設定頁已移除建立日 / 更新日 basis 選單。

## 尚未完成
- 使用者桌機 / 行動裝置實機視覺驗證
- 實際 Firebase 資料下的週報內容比對
