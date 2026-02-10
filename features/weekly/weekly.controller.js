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

    const reg = window.AppRegistry;
    if (!reg || typeof reg.ensureReady !== 'function') {
      throw new Error('AppRegistry not loaded');
    }

    // Phase 1：集中化初始化（避免 Controller 自行 init）
    await reg.ensureReady(['SettingsService', 'RepairService', 'WorkLogService', 'WeeklyService'], { loadAll: true });

    const WeeklyService = (typeof reg.get === 'function') ? reg.get('WeeklyService') : (typeof window._svc === 'function' ? window._svc('WeeklyService') : null);

    if (!WeeklyService || !window.weeklyUI) {
      throw new Error('Weekly module not loaded');
    }

    // render
    window.weeklyUI.render(containerId);

  }
}

window.WeeklyController = WeeklyController;
console.log('✅ WeeklyController loaded');
