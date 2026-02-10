# Firebase Emulator 驗證（Phase 2）

> 目標：避免 Rules 誤鎖（寫不進去）或誤開（不該寫也能寫）。
> 本專案以 **Realtime Database** 為主；若未使用 Firestore，可忽略 firestore.rules。

## 1) 安裝與啟動

1. 安裝 Firebase CLI（若已裝過可跳過）

```bash
npm i -g firebase-tools
```

2. 登入並選擇專案

```bash
firebase login
firebase use repair-tracking-d3de4
```

3. 啟動 Emulator（RTDB）

```bash
firebase emulators:start --only database
```

## 2) 匯入 / 匯出（可選）

```bash
firebase emulators:start --only database --import ./emulator-data --export-on-exit
```

## 3) 最小驗證清單（手動）

在 Emulator UI（預設 http://127.0.0.1:4000）或用簡單腳本驗證：

### 必須可寫
- `data/{uid}/repairs/...`
- `data/{uid}/workLogs/...`
- `data/{uid}/quotes/...`
- `data/{uid}/orders/...`
- `data/{uid}/weeklyReports/...`

### 必須不可寫（非管理者）
- `data/{uid}/systemConfig/...`（若有）
- `data/{uid}/users/...`（若有）

## 4) 提醒

- Rules 變更後，請 **重新啟動** Emulator 以確認生效。
- 若未使用 Firestore，可不建立 firestore emulator。
