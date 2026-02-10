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

    if (!window.SettingsService || !window.settingsUI) {
      throw new Error('Settings module not loaded');
    }

    await window.SettingsService.init();
      try { if (window.RepairTemplatesService) await window.RepairTemplatesService.init(); } catch (e) { console.warn('RepairTemplatesService init failed', e); }
    await window.settingsUI.render(containerId);
  }
}

window.SettingsController = SettingsController;
console.log('✅ SettingsController loaded');
