/**
 * 客戶管理 - 控制器
 * V160 - Customers Module - Controller
 */

class CustomerController {
  constructor() {
    this.isInitialized = false;
  }

  async init(containerId = 'main-content') {
    if (this.isInitialized) {
      console.debug('CustomerController already initialized');
      return;
    }

    try {
      console.log('👥 Initializing Customer Module...');

      const svc = (typeof window._svc === 'function') ? window._svc('CustomerService') : window.CustomerService;
      if (!svc || typeof svc.init !== 'function') throw new Error('CustomerService not available');
      await svc.init();

      // 先渲染 UI，再訂閱資料變更
      window.customerUI.render(containerId);

      svc.onChange(() => {
        window.customerUI.updateList();
      });

      this.isInitialized = true;
      console.log('✅ Customer Module initialized');

      const event = new CustomEvent('customers:ready');
      window.dispatchEvent(event);

    } catch (error) {
      console.error('❌ Customer Module initialization failed:', error);
      window.ErrorHandler.log('HIGH', 'CustomerController', 'Initialization failed', { error });

      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = this.getFallbackUI();
      }
      throw error;
    }
  }

  getFallbackUI() {
    return `
      <div style="
        padding: 40px;
        text-align: center;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
        border-radius: 12px;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="color: #ef4444; margin-bottom: 8px;">客戶模組載入失敗</h3>
        <p style="color: #fca5a5; margin-bottom: 20px;">系統無法載入客戶管理模組，請重新整理頁面或聯繫技術支援。</p>
        <button onclick="location.reload()" class="btn primary">重新載入</button>
      </div>
    `;
  }

  destroy() {
    if (!this.isInitialized) return;
    const container = document.querySelector('.customers-module');
    if (container) container.innerHTML = '';
    this.isInitialized = false;
  }

  async reload(containerId = 'main-content') {
    this.destroy();
    await this.init(containerId);
  }
}

const customerController = new CustomerController();
if (typeof window !== 'undefined') {
  window.CustomerController = customerController;
}

console.log('✅ CustomerController loaded');
