# CHANGELOG V161.161

日期：2026-01-09  (Asia/Taipei)

## 本版重點

### 機台保養（Maintenance）
- 移除「提醒清單」區塊（含提醒列表與 mailto 手動寄信按鈕），避免儀表板出現大面積空白/破版。
- 儀表板改為僅保留 KPI 概覽卡（設備總數 / 逾期 / 即將到期 / 尚無紀錄 / 保養率），並提供「前往設定」捷徑。
- 提醒收件人、預設提醒天數、自動 Email（Cloud Functions）統一於「設定 → 機台保養設定」管理。

## 變更檔案
- 修改：features/maintenance/maintenance.ui.js
- 修改：features/settings/settings.ui.js
- 修改：core/config.js
- 新增：docs/CHANGELOG_V161.161.md
