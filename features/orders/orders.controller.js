/**
 * 訂單/採購追蹤 - 控制器
 * V161 - Orders Module - Controller
 */

class OrdersController {
  constructor() {
    this.isInitialized = false;
    this._onDataChanged = null;
    this._uiUpdateTimer = null;
  }

  async init(containerId = 'main-content') {
    if (this.isInitialized) {
      console.debug('OrdersController already initialized');
      return;
    }

    try {
      console.log('📦 Initializing Orders Module...');

      if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
        await window.AppRegistry.ensureReady(['OrderService', 'QuoteService'], { loadAll: false });
      }

      window.ordersUI.render(containerId);

      // 當資料增量同步/即時更新時，若目前停留在訂單頁，則自動刷新列表
      if (!this._onDataChanged) {
        this._onDataChanged = (evt) => {
          try {
            if (!evt || !evt.detail || evt.detail.module !== 'orders') return;
            if (!window.ordersUI || typeof window.ordersUI.update !== 'function') return;
            if (this._uiUpdateTimer) return;
            this._uiUpdateTimer = setTimeout(() => {
              this._uiUpdateTimer = null;
              try { window.ordersUI.update(); } catch (_) {}
            }, 60);
          } catch (_) {}
        };
        window.addEventListener('data:changed', this._onDataChanged);
      }
      this.isInitialized = true;
      console.log('✅ Orders Module initialized');
      window.dispatchEvent(new CustomEvent('orders:ready'));
    } catch (error) {
      console.error('❌ Orders Module initialization failed:', error);
      window.ErrorHandler?.log?.('HIGH', 'OrdersController', 'Initialization failed', { error });
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = this.getFallbackUI();
        try {
          const btn = container.querySelector('[data-action="app.reload"]');
          if (btn) btn.addEventListener('click', () => location.reload());
        } catch (_) {}
      }
      throw error;
    }
  }

  getFallbackUI() {
    return `
      <div style="padding:40px;text-align:center;background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:12px;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h3 style="color:#ef4444;margin-bottom:8px;">訂單模組載入失敗</h3>
        <p style="color:#475569;margin-bottom:20px;">系統無法載入訂單追蹤模組，請重新整理頁面或聯繫技術支援。</p>
        <button type="button" class="btn primary" data-action="app.reload">重新載入</button>
      </div>
    `;
  }

  destroy() {
    if (!this.isInitialized) return;

    try {
      if (this._onDataChanged) window.removeEventListener('data:changed', this._onDataChanged);
    } catch (_) {}
    this._onDataChanged = null;
    if (this._uiUpdateTimer) {
      try { clearTimeout(this._uiUpdateTimer); } catch (_) {}
      this._uiUpdateTimer = null;
    }

    const container = document.querySelector('.orders-module');
    if (container) container.innerHTML = '';
    this.isInitialized = false;
  }

  async reload(containerId = 'main-content') {
    this.destroy();
    await this.init(containerId);
  }
}

const ordersController = new OrdersController();
if (typeof window !== 'undefined') {
  window.OrdersController = ordersController;
}

console.log('✅ OrdersController loaded');
