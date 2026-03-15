# CHANGELOG V161.340

## 本版重點
- 側欄與導覽改為淺色企業配色
- 週報納入規則改為「本週新增維修單 + 本週新增工作紀錄」
- 僅狀態改變不列入週報

## 修正內容
1. `core/variables.css`
   - 側欄主題 token 改為淺色系。
2. `core/corporate-enhancement.css`
   - 側欄品牌、使用者區、導覽列 active / hover 改為淺色企業樣式。
3. `features/weekly/weekly.service.js`
   - 週報案件來源改為新增維修單與工作紀錄事件，不再用建立日 / 更新日 basis 篩選。
4. `features/weekly/weekly.ui.js`
   - 本週工作來源說明改為新規則。
5. `features/weekly/weekly.model.js`
   - 週報空白文案改為「本週無新增維修單或工作紀錄」。
6. `features/settings/settings.ui.js`
   - 設定頁改為顯示固定週報納入規則說明，避免誤導。
