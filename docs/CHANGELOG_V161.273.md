# V161.273（Phase 4.3）— Mobile Safe Tap 修正版（不影響桌機）

日期：2026-02-27（Asia/Taipei）

## 修正
- 全系統行動裝置點擊穩定化：以 touchend 主動觸發 element.click()，支援事件委派（delegation）。
- 僅在行動裝置（pointer: coarse / maxTouchPoints）啟用；桌機不注入任何攔截邏輯，避免影響既有 click 流程。
- 抑制 touch 後 ghost click，避免重複觸發；不做全域 stopPropagation，避免「所有新增功能失效」。

## 影響檔案
- 新增：core/mobile-safe-tap.js
- 修改：V161_Desktop.html、V161_Mobile.html（載入 mobile-safe-tap）
- 修改：core/shared.css（touch-action / tap highlight）
- 修改：core/config.js（BUILD_NUMBER、VERSION_DATE）
