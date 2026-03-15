## V161.303 新增驗收點
- [ ] 維修詳情頁 `總覽` 首屏是否可一次看懂案件狀態、負責人、客戶、設備與商務追蹤
- [ ] 維修詳情頁是否已移除重複資訊卡，沒有同一資訊在主區與側欄重複出現
- [ ] 桌機與手機下，總覽卡片是否依序換行，不出現被擠壓或難以閱讀的窄欄

## V161.302 新增驗收點
- [ ] 大型表單 modal 是否為 `header + scroll body + sticky footer`，而非整個 dialog 一起捲動
- [ ] 表單首屏是否可辨識模式、關鍵狀態與關聯對象
- [ ] 只讀欄位是否以鎖定/唯讀語意呈現，沒有錯誤的下拉暗示
- [ ] 客戶 / Email / 問題摘要等關鍵欄位在桌機低高度視窗下是否仍可快速辨識

# QA Checklist

本文件作為 RepairTracking 發版前最低驗收基準。

## 1. 驗收層級
### Smoke Test
每次版本都要跑。

### Regression Test
只要動到核心流程、版面、Auth、PDF、Mobile 互動，就要加跑。

## 2. 啟動與登入
- [ ] `Index_V161.html` 可正常導向 Desktop / Mobile
- [ ] Desktop 可正常進入系統
- [ ] Mobile 可正常進入系統
- [ ] Firebase Auth local persistence 正常
- [ ] 重新整理後不會錯誤跳回登入頁
- [ ] 啟動時有等待 auth state，未出現未授權先進系統的 race condition

## 3. Mobile 安全互動
- [ ] 在維修列表滑動後放開，不會誤點開其他案例
- [ ] 在詳情頁點「＋處置」不會穿透到下層卡片
- [ ] ghost click 抑制仍正常
- [ ] 觸控桌機 / 大螢幕不會被過度攔截操作

## 4. Repair 流程
- [ ] 可新增維修單
- [ ] 可編輯維修單
- [ ] 狀態、進度、needParts 連動正常
- [ ] Detail 頁主資訊、工作紀錄、零件、商務區塊可正常載入
- [ ] 機台歷史可依序號查到資料

## 5. WorkLog 流程
- [ ] 可新增工作記錄
- [ ] 可編輯工作記錄
- [ ] WorkLog 與 Repair Detail 顯示一致
- [ ] result 狀態顯示正確

## 6. Quote / Order 流程
- [ ] 可從 Repair 建立 Quote
- [ ] 可由 Quote 建立 Order
- [ ] Quote 狀態切換正常
- [ ] Order 狀態切換正常
- [ ] Quote / Order summary 在 Repair Detail 顯示正常

## 7. Quote PDF
- [ ] PDF 可正常輸出
- [ ] `ownerName` 為正常姓名時可輸出
- [ ] `ownerName` 為帳號型字串（例如含底線 / email local-part）時會留白
- [ ] 中文字型與排版未跑版

## 8. FAB / Modal / Footer
- [ ] `settings` / `sops` 頁不顯示 FAB
- [ ] modal 開啟時 FAB 隱藏
- [ ] 接近頁尾時 FAB 會避讓或隱藏
- [ ] sticky footer 不會被 FAB 遮住
- [ ] Mobile 下主要儲存按鈕可點擊

## 9. 設定 / 週報
- [ ] 設定可正常儲存
- [ ] 週報區間仍為週一到週日（Asia/Taipei）
- [ ] 週報收件人與簽名檔可正常載入

## 10. SOP / KB / Maintenance
- [ ] SOP 列表、詳情、版本區塊可載入
- [ ] 若設定 GAS 代理，SOP 上傳流程正常
- [ ] KB 各類型資料可查詢
- [ ] Maintenance 設備與保養記錄可正常讀寫

## 11. 權限 / 資料隔離
- [ ] 只能讀寫自己的 `data/<uid>`
- [ ] 一般 engineer 不可任意操作其他使用者的 `users/` 資料
- [ ] admin 功能正常

## 12. 文件與版本
- [ ] `core/config.js` 版號正確
- [ ] `docs/CHANGELOG_V161.xxx.md` 已新增
- [ ] 交付 ZIP 為單層結構
- [ ] 文件已放在 `docs/`

## 13. 建議回歸優先順序
1. Auth + 啟動流程
2. Mobile Safe Tap
3. Repair Detail / WorkLog
4. Quote / Order / PDF
5. FAB / Modal / Sticky Footer
6. 其他模組

## 14. 表單系統回歸（V161.292 起）
- [ ] Repair 新增 / 編輯表單在桌機與手機均無怪異留白、欄位跳動、按鈕擠壓
- [ ] Quote / Order 明細表單的 section 順序固定，欄位標籤與說明位置一致
- [ ] WorkLog 表單已改用共用輸入規格，不再出現舊式獨立樣式
- [ ] Settings / SOP 表單不再呈現像測試頁或臨時管理頁的版面感
- [ ] radio / checkbox / helper text 在手機上不會擠壓或超出安全區

## 表單驗證回歸（V161.296）
- Quote 項目列名稱留白時，應直接標示該列名稱欄位
- Order 數量非整數或小於 1 時，應直接標示數量欄位
- Order / Quote 無有效項目時，表單頂部應出現 summary
- WorkLog 按 Enter 提交不可整頁刷新
- WorkLog 必填欄位缺漏時，應顯示 inline error 與 summary


## 客戶 / 聯絡人回歸（V161.298）
- [ ] 由客戶工具列新增聯絡人可正常儲存
- [ ] 由既有公司卡片新增聯絡人可正常儲存
- [ ] 聯絡人編輯可正常儲存
- [ ] 聯絡人刪除後列表正確更新
- [ ] Email 格式錯誤時，欄位旁會顯示錯誤且表單頂部出現 summary
- [ ] 按 Enter 提交聯絡人表單不會整頁刷新
- [ ] 手機下 customer modal footer 不會遮住最後一個欄位
- [ ] 聯絡人詳情頁的公司 / 聯絡方式 / 備註區塊層級清楚

## Customer Modal 視覺與可用性檢查（V161.299）
- 桌機低高度視窗下，Email 欄位需位於首屏或僅極短捲動即可達。
- DevTools 開啟時 customer modal 不可因高度壓縮而看不到主欄位。
- body 捲動時 footer 不可遮擋最後欄位。


## 客戶管理專項
- 客戶管理 → 新增聯絡人（桌機低高度 / DevTools 開啟）確認主欄位與補充說明均完整可讀。
- 客戶管理 → 新增聯絡人確認地址與備註區說明文字無截斷、無水平溢出。
