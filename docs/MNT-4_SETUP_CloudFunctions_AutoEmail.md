# MNT-4：自動 Email 提醒（非 mailto）部署說明

此功能採 **Firebase Cloud Functions（後端排程）** 實作，會依據：

- `data/<uid>/maintenance/equipments/*`
- `data/<uid>/maintenance/records/*`
- `data/<uid>/maintenance/settings/*`

每日自動寄出提醒 Email。

> 前端的「📧 手動 Email（mailto）」仍保留作為備援與手動操作；真正自動寄信由 Functions 執行。

---

## 1. 必要條件

1. Firebase 專案需啟用 **Cloud Functions**。
2. 排程（`pubsub.schedule(...)`）通常需要 **Blaze 計費方案**。
3. 需準備可用的 SMTP（公司 SMTP / 郵件閘道 / 合法帳號）。

---

## 2. Functions 專案結構

本版 ZIP 已內含：

- `functions/package.json`
- `functions/index.js`

其中 `index.js` 主要提供：

- `maintenanceDailyReminder`：每日 08:00（Asia/Taipei）自動寄送
- `maintenanceSendTestEmail`：Callable function（手動測試寄送）

---

## 3. 初始化與安裝（建議做法）

在你的專案根目錄（或任一空目錄）執行：

```bash
firebase init functions
```

完成後：

1) 用本 ZIP 內的 `functions/index.js` 覆蓋你的 `functions/index.js`

2) 用本 ZIP 內的 `functions/package.json` 合併/覆蓋你的 `functions/package.json`

3) 安裝依賴：

```bash
cd functions
npm install
```

---

## 4. 設定 SMTP（不得放在 RTDB）

### 方法 A：Functions config（建議）

```bash
firebase functions:config:set \
  smtp.host="YOUR_SMTP_HOST" \
  smtp.port="587" \
  smtp.secure="false" \
  smtp.user="YOUR_SMTP_USER" \
  smtp.pass="YOUR_SMTP_PASS" \
  smtp.from="YOUR_FROM_EMAIL"
```

### 方法 B：環境變數（備用）

Functions 也支援：

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

---

## 5. 部署

```bash
firebase deploy --only functions
```

部署成功後，排程會在每日 08:00（台灣時間）執行。

---

## 6. 前端啟用開關

在系統內：

1. 進入「保養」模組
2. 右上角「⚙ 設定」
3. 勾選「✅ 啟用自動 Email（需 Cloud Functions）」

Functions 會依此設定決定是否寄送：

- `settings.autoEmailEnabled === true` 才寄送
- `settings.autoEmailIncludeNoRecord === true` 會包含「尚無紀錄」
- `settings.useOwnerEmail === true` 會優先寄給設備 `ownerEmail`（未填則 fallback 到 `settings.emailTo`）

---

## 7. 去重與重送

Functions 會寫入去重日志：

- `data/<uid>/maintenance/reminderLogs/YYYY-MM-DD`

同一天內若已寫入該節點，Functions 會視為「已寄送」而跳過。

若需同日重送：

1) 手動刪除該日節點後再觸發（或等待隔日）

---

## 8. 注意事項

- 此功能屬後端寄信，需自行確保 SMTP 合規與安全（避免濫用帳號、避免明文外洩）。
- 若要更細緻的寄送時間/頻率（例如每 4 小時檢查一次），可調整 `schedule()` 及去重策略。
