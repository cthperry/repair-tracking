# CHANGELOG V161.293

日期：2026-03-13

## 修正
- 修正訂單明細儲存時，特定情境可能誤跳回登入頁的問題。
- 訂單儲存流程新增 submit lock，避免重複提交與觸控穿透。
- OrderService Firebase 寫入失敗時改為正確拋出錯誤，避免前端誤判為已儲存。
- Firebase Auth 對非預期的 `onAuthStateChanged(null)` 增加 grace period，避免暫態認證抖動直接把使用者送回登入頁。

## 驗證重點
- 測試訂單 `O20260111-001`：修改狀態、預計到貨/收貨日期後儲存，不應再直接跳回登入頁。
- 若 Firebase 寫入真的失敗，前端應停留在表單並顯示錯誤訊息。
