# V161.358 週報契約 QA 記錄

## 目的
避免週報格式再次漂移回摘要式欄位，固定以下契約：
- 問題描述
- 工作內容
- 完成狀態
- 收費
- 下週計畫 → 計畫內容

## 本次結構修正
1. `WeeklyService.getNextWeekPlansText()` 改由 `AppConfig.weekly.planDisplay` 控制欄位文字與換行寬度。
2. 維修表單來源欄位文案同步為 `問題描述`，避免上游輸入與週報輸出語意不一致。
3. 新增 `tools/validate-weekly-contract.js`，以假資料直接驗證：
   - 必須出現：
     - `問題描述`
     - `工作內容`
     - `完成狀態`
     - `收費`
     - `計畫內容`
   - 不可出現：
     - `問題摘要`
     - `本週處置`
     - `商務摘要`
     - `料件摘要`
     - `[需要零件]`

## 已執行檢查
- 語法檢查：`node --check`（weekly + repairs + config）
- 契約檢查：`node tools/validate-weekly-contract.js`
- 版本檢查：`BUILD_NUMBER = 358`
- ZIP 規劃：平面根目錄輸出

## 仍需實機驗證
- 真實資料下的週報預覽 / 寄送內容
- 手機版週報頁的長文字換行
- 維修表單 `問題描述` 顯示是否正常
