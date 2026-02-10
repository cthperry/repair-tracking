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
      
      // Step 1: 初始化服務層
      await window.RepairService.init();
      try { if (window.RepairTemplatesService) await window.RepairTemplatesService.init(); } catch (e) { console.warn('RepairTemplatesService init failed', e); }

      // Step 1.0: 初始化連動模組（零件/報價/訂單）以支援維修卡片的狀態 chips
      try { if (window.RepairPartsService && typeof window.RepairPartsService.init === 'function' && !window.RepairPartsService.isInitialized) await window.RepairPartsService.init(); } catch (e) { console.warn('RepairController: RepairPartsService init skipped:', e); }
      try { if (window.QuoteService && typeof window.QuoteService.init === 'function' && !window.QuoteService.isInitialized) await window.QuoteService.init(); } catch (e) { console.warn('RepairController: QuoteService init skipped:', e); }
      try { if (window.OrderService && typeof window.OrderService.init === 'function' && !window.OrderService.isInitialized) await window.OrderService.init(); } catch (e) { console.warn('RepairController: OrderService init skipped:', e); }

      // Step 1.1: 初始化設定（釘選 / 最近使用 / 歷史帶入）
      try {
        if (window.SettingsService && typeof window.SettingsService.init === 'function' && !window.SettingsService.isInitialized) {
          await window.SettingsService.init();
        }
      } catch (e) {
        console.warn('RepairController: SettingsService init skipped:', e);
      }
      
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
        <button onclick="location.reload()" class="btn primary">
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
    return {
      isInitialized: this.isInitialized,
      repairsCount: RepairService.getAll().length,
      stats: RepairService.getStats()
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
