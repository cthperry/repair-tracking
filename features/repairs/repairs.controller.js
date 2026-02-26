/**
 * 維修管理 - 控制器
 * V160 - Repairs Module - Controller
 * 
 * 職責：
 * 1. 模組初始化
 * 2. 協調 Service 和 UI
 * 3. 錯誤處理
 * 4. 模組生命週期管理
 */

class RepairController {
  constructor() {
    this.isInitialized = false;
    this.errorBoundary = null;
  }
  
  /**
   * 初始化模組
   */
  async init(containerId = 'repairs-container') {
    if (this.isInitialized) {
      console.debug('RepairController already initialized');
      return;
    }
    
    try {
      console.log('🔧 Initializing Repair Module...');

      // Step 1: 初始化服務層（Phase 1：registry-first）
      const reg = (typeof window !== 'undefined' && window.AppRegistry) ? window.AppRegistry : null;
      if (reg && typeof reg.ensureReady === 'function') {
        await reg.ensureReady([
          'RepairService',
          'RepairTemplatesService',
          'RepairPartsService',
          'QuoteService',
          'OrderService',
          'SettingsService',
          'SOPService',
          'WorkLogService'
        ]);
      }

      const repairSvc = (reg && typeof reg.get === 'function')
        ? reg.get('RepairService')
        : (typeof window._svc === 'function' ? window._svc('RepairService') : null);

      if (!repairSvc || typeof repairSvc.init !== 'function') throw new Error('RepairService not available');

      // Step 2: 渲染 UI
      window.repairUI.render(containerId);
      
      // Step 3: 設定完成
      this.isInitialized = true;
      console.log('✅ Repair Module initialized');
      
      // 觸發初始化完成事件
      const event = new CustomEvent('repairs:ready');
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('❌ Repair Module initialization failed:', error);
      window.ErrorHandler.log('HIGH', 'RepairController', 'Initialization failed', { error });
      
      // 顯示錯誤訊息
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
  
  /**
   * 取得降級 UI
   */
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
        <h3 style="color: #ef4444; margin-bottom: 8px;">維修模組載入失敗</h3>
        <p style="color: #fca5a5; margin-bottom: 20px;">
          系統無法載入維修管理模組，請重新整理頁面或聯繫技術支援。
        </p>
        <button type="button" class="btn primary" data-action="app.reload">
          重新載入
        </button>
      </div>
    `;
  }
  
  /**
   * 銷毀模組
   */
  destroy() {
    if (!this.isInitialized) return;
    
    console.log('🗑️ Destroying Repair Module...');
    
    // 清理 UI
    const container = document.querySelector('.repairs-module');
    if (container) {
      container.innerHTML = '';
    }
    
    // 清理監聽器（如需要）
    // ...
    
    this.isInitialized = false;
    console.log('✅ Repair Module destroyed');
  }
  
  /**
   * 重新載入模組
   */
  async reload(containerId = 'repairs-container') {
    this.destroy();
    await this.init(containerId);
  }
  
  /**
   * 取得模組狀態
   */
  getStatus() {
    const rs = (window.AppRegistry && typeof window.AppRegistry.get === 'function')
      ? window.AppRegistry.get('RepairService')
      : (typeof window._svc === 'function' ? window._svc('RepairService') : null);

    return {
      isInitialized: this.isInitialized,
      repairsCount: (rs && typeof rs.getAll === 'function') ? (rs.getAll() || []).length : 0,
      stats: (rs && typeof rs.getStats === 'function') ? (rs.getStats() || {}) : {}
    };
  }
}

// 建立全域實例
const repairController = new RepairController();

// 輸出到全域
if (typeof window !== 'undefined') {
  window.RepairController = repairController;
}

console.log('✅ RepairController loaded');
