# Changelog V161.249

日期：2026-02-10（Asia/Taipei）

## 修正
- DashboardController 修正語法結構（補齊方法括號、instance export 移出 class body），避免 `Unexpected identifier`。
- core/app.js 清除 NotificationCenter.init 與通知鈴鐺重複插入造成的多重 UI/重複 ID。

## 新增
- Header 通知鈴鐺下拉面板（桌機）：
  - 顯示最新 10 筆通知
  - 「全部已讀」「刷新」「前往儀表板」
  - 點擊通知自動標記已讀並導向對應模組/明細（透過 NotificationCenter.handleClick）
  - 點擊面板外區域自動關閉
