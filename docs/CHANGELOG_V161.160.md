# CHANGELOG - V161.160

日期：2026-01-09

## 本版重點

### 設定頁整合機台保養設定（MNT）
- 在「設定」模組新增 **「機台保養設定」** 卡片，提供與保養模組相同的設定項：
  - Email To / Email Cc
  - 預設提醒天數（例如 3,7）
  - 優先使用負責人 Email
  - 啟用自動 Email（需部署 Cloud Functions）
  - 自動提醒包含「尚無紀錄」
- 儲存行為：
  - 右上「儲存」會同時儲存一般設定 + 機台保養設定（若該區塊存在）。
  - 機台保養設定卡片內提供「儲存保養設定」按鈕，可單獨儲存該區塊。

## 變更檔案
- 修改：
  - core/config.js
  - features/settings/settings.ui.js
  - features/settings/settings.css
- 新增：
  - docs/CHANGELOG_V161.160.md
