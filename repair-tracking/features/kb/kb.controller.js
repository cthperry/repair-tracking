/**
 * 知識庫（KB）- Controller
 * KB-1（MVP）
 */

class KBController {
  constructor(){
    this.isInitialized = false;
  }

  async init(containerId = 'main-content'){
    if (this.isInitialized) return;

    try {
      if (window.KBService && !window.KBService.isInitialized) {
        await window.KBService.init();
      }

      // render UI
      window.kbUI.render(containerId);

      this.isInitialized = true;
      try { window.dispatchEvent(new CustomEvent('kb:ready')); } catch (_) {}
    } catch (error) {
      console.error('❌ KB Module initialization failed:', error);
      window.ErrorHandler?.log?.('HIGH', 'KBController', 'Initialization failed', { error });

      const container = document.getElementById(containerId);
      if (container) container.innerHTML = this.getFallbackUI();
      throw error;
    }
  }

  getFallbackUI(){
    return `
      <div style="
        padding: 40px;
        text-align: center;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
        border-radius: 12px;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="color: #ef4444; margin-bottom: 8px;">知識庫模組載入失敗</h3>
        <p style="color: #475569; margin-bottom: 20px;">系統無法載入知識庫模組，請重新整理頁面或聯繫技術支援。</p>
        <button onclick="location.reload()" class="btn primary">重新載入</button>
      </div>
    `;
  }

  destroy(){
    if (!this.isInitialized) return;
    try {
      const container = document.querySelector('.kb-module');
      if (container) container.innerHTML = '';
    } catch (_) {}
    this.isInitialized = false;
  }

  async reload(containerId = 'main-content'){
    this.destroy();
    await this.init(containerId);
  }
}

const kbController = new KBController();
if (typeof window !== 'undefined') {
  window.KBController = kbController;
}

try { console.log('✅ KBController loaded'); } catch (_) {}
