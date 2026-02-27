# RepairTracking V161.275 變更紀錄（Phase 4）

日期：2026-02-27（Asia/Taipei）

## 修正
- 修正 SettingsService 「Firebase timeout」：
  - 避免 Auth 尚未就緒時使用 unknown UID 組路徑
  - 增加 Firebase 讀取 timeout（4500ms）
  - 增加 `.info/connected` 快速判斷：未連線直接 fallback local，避免誤判 timeout
  - 保留 permission_denied 訊息，方便後續規則精細化
