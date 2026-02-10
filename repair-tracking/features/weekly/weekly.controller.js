/**
 * 週報系統 - 控制器
 * V161 - Weekly Module - Controller
 */

class WeeklyController {
  static async reload(containerId) {
    // 確保登入
    const u = (window.AppState?.getCurrentUser?.() || window.currentUser);
    if (!u) {
      throw new Error('尚未登入');
    }

    // 確保依賴
    if (!window.WeeklyService || !window.weeklyUI) {
      throw new Error('Weekly module not loaded');
    }

    // init
    await window.WeeklyService.init();

    // render
    window.weeklyUI.render(containerId);
  }
}

window.WeeklyController = WeeklyController;
console.log('✅ WeeklyController loaded');
