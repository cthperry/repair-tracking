// Vitest 全域測試初始化
// 原則：不修改產品碼，僅提供測試環境必需的 window/document stub。

// jsdom 已提供 window/document；這裡補齊專案常見的最小 stub。
if (typeof window !== 'undefined') {
  window.console = window.console || console;
}
