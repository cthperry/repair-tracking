# CHANGELOG V161.250

日期：2026-02-10（Asia/Taipei）

## 本版重點
- 通知面板新增「未讀 / 全部」篩選切換（Desktop + Mobile 共用）。
- Mobile Header 加入通知鈴鐺與通知面板（與 Desktop 行為一致）。
- 通知面板空狀態文案依篩選模式調整（未讀/全部）。

## 相容性與規則
- 符合 Phase 1 DoD：Service 存取仍僅允許 AppRegistry/_svc，未引入 window.getService / window[serviceName] fallback。
- Header 行為仍採 data-action + delegation（無 inline onclick）。
