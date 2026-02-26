/**
 * 零件管理 - 控制器
 * V161 - Parts Module - Controller
 */

class PartsController {
  constructor() {
    this.isInitialized = false;
  }

  async init(containerId = 'main-content') {
    if (this.isInitialized) {
      console.debug('PartsController already initialized');
      return;
    }

    try {
      console.log('🧩 Initializing Parts Module...');

      if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
        await window.AppRegistry.ensureReady(['PartService', 'RepairPartsService'], { loadAll: false });
      }

      // 先渲染 UI
      window.partsUI.render(containerId);

      this.isInitialized = true;
      console.log('✅ Parts Module initialized');

      window.dispatchEvent(new CustomEvent('parts:ready'));
    } catch (error) {
      console.error('❌ Parts Module initialization failed:', error);
      window.ErrorHandler?.log?.('HIGH', 'PartsController', 'Initialization failed', { error });

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
        <h3 style="color: #ef4444; margin-bottom: 8px;">零件模組載入失敗</h3>
        <p style="color: #475569; margin-bottom: 20px;">系統無法載入零件模組，請重新整理頁面或聯繫技術支援。</p>
        <button onclick="location.reload()" class="btn primary">重新載入</button>
      </div>
    `;
  }

  destroy() {
    if (!this.isInitialized) return;
    const container = document.querySelector('.parts-module');
    if (container) container.innerHTML = '';
    this.isInitialized = false;
  }

  async reload(containerId = 'main-content') {
    this.destroy();
    await this.init(containerId);
  }
}

const partsController = new PartsController();
if (typeof window !== 'undefined') {
  window.PartsController = partsController;
}

console.log('✅ PartsController loaded');
