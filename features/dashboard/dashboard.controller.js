/**
 * 儀表板 - Controller
 * Phase 2 — Dashboard (首頁總覽)
 */
class DashboardController {
  constructor() {
    this.isInitialized = false;
    this._refreshTimer = null;
    this._onDataChanged = null;
    this._onNotifChanged = null;
  }

  async init(containerId = 'main-content') {
    if (this.isInitialized) return;

    try {
      console.log('🏠 Initializing Dashboard...');

      // 確保核心 Service 可用（silent：失敗不阻斷）
      if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
        await AppRegistry.ensureReady([
          'RepairService', 'QuoteService', 'OrderService',
          'CustomerService', 'RepairPartsService'
        ], { silent: true });
      }

      // 渲染 UI
      var ui = window.dashboardUI;
      if (ui && typeof ui.render === 'function') ui.render(containerId);

      // 監聽資料變更 → refresh（節流）
      if (!this._onDataChanged) {
        var self = this;
        this._onDataChanged = function () {
          if (self._refreshTimer) return;
          self._refreshTimer = setTimeout(function () {
            self._refreshTimer = null;
            try { if (window.dashboardUI) window.dashboardUI.refresh(); } catch (_) {}
          }, 300);
        };
        window.addEventListener('data:changed', this._onDataChanged);
      }

      // 監聽通知變更（通知中心刷新後）
      if (!this._onNotifChanged) {
        var self2 = this;
        this._onNotifChanged = function () {
          if (self2._refreshTimer) return;
          self2._refreshTimer = setTimeout(function () {
            self2._refreshTimer = null;
            try { if (window.dashboardUI) window.dashboardUI.refresh(); } catch (_) {}
          }, 200);
        };
        window.addEventListener('notif:changed', this._onNotifChanged);
      }

      this.isInitialized = true;
      console.log('✅ Dashboard initialized');
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      var container = document.getElementById(containerId);
      if (container) container.innerHTML = this.getFallbackUI();
    }
  }

  async reload(containerId = 'main-content') {
    this.destroy();
    await this.init(containerId);
  }

  destroy() {
    if (!this.isInitialized) return;
    try { if (this._onDataChanged) window.removeEventListener('data:changed', this._onDataChanged); } catch (_) {}
    try { if (this._onNotifChanged) window.removeEventListener('notif:changed', this._onNotifChanged); } catch (_) {}
    this._onDataChanged = null;
    this._onNotifChanged = null;
    if (this._refreshTimer) { clearTimeout(this._refreshTimer); this._refreshTimer = null; }
    this.isInitialized = false;
  }

  getFallbackUI() {
    return '<div style="padding:40px;text-align:center;background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:12px;">' +
      '<div style="font-size:48px;margin-bottom:16px;">⚠️</div>' +
      '<h3 style="color:#ef4444;margin-bottom:8px;">儀表板載入失敗</h3>' +
      '<p style="color:#475569;margin-bottom:20px;">請重新整理頁面。</p>' +
      '<button onclick="location.reload()" class="btn primary">重新載入</button></div>';
  }
}

// Export instance
var dashboardController = new DashboardController();
if (typeof window !== 'undefined') {
  window.DashboardController = dashboardController;
  try { window.AppRegistry && AppRegistry.register('DashboardController', dashboardController); } catch (_) {}
}
console.log('✅ DashboardController loaded');
