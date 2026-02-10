/**
 * 設定 - 控制器
 * V161 - Settings Module - Controller
 */

class SettingsController {
  static async reload(containerId) {
    const u = (window.AppState?.getCurrentUser?.() || window.currentUser);
    if (!u) {
      throw new Error('尚未登入');
    }

    // 防呆：避免因 UI instance 尚未建立，導致 Router 誤判「Settings module not loaded」
    // 例如：window.SettingsUI 已載入，但 window.settingsUI 尚未 new。
    if (!window.settingsUI && window.SettingsUI) {
      try { window.settingsUI = new window.SettingsUI(); } catch (e) { console.warn('Init settingsUI failed', e); }
    }

    const reg = window.AppRegistry;
    if (reg && typeof reg.ensureReady === 'function') {
      await reg.ensureReady(['SettingsService', 'RepairTemplatesService'], { loadAll: false });
    }

    const SettingsService = (reg && typeof reg.get === 'function')
      ? reg.get('SettingsService')
      : (typeof window._svc === 'function' ? window._svc('SettingsService') : null);

    if (!SettingsService || !window.settingsUI) {
      throw new Error('Settings module not loaded');
    }

    await window.settingsUI.render(containerId);
  }
}

window.SettingsController = SettingsController;
console.log('✅ SettingsController loaded');
