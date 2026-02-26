/**
 * SOP Hub - Controller
 * SOP-1（MVP）
 */

class SOPController {
  constructor(){
    this.isInitialized = false;
  }

  async init(containerId = 'main-content'){
    if (this.isInitialized) return;

    try {
      if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
        await window.AppRegistry.ensureReady(['SOPService'], { loadAll: false });
      }

      // 防呆：若使用者從維修單 modal 直接切換到 SOP Hub，確保 modal 不殘留造成重疊
      try { window.RepairUI?.closeModal?.(); } catch (_) {}
      try { document.getElementById('repair-sop-link-modal')?.remove(); } catch (_) {}
      try { document.getElementById('repair-sop-versions-modal')?.remove(); } catch (_) {}

      // render UI
      window.sopUI.render(containerId);

      this.isInitialized = true;
      try { window.dispatchEvent(new CustomEvent('sops:ready')); } catch (_) {}
    } catch (error) {
      console.error('❌ SOP Hub initialization failed:', error);
      window.ErrorHandler?.log?.('HIGH', 'SOPController', 'Initialization failed', { error });

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
        <h3 style="color: #ef4444; margin-bottom: 8px;">SOP Hub 模組載入失敗</h3>
        <p style="color: #475569; margin-bottom: 20px;">系統無法載入 SOP Hub，請重新整理頁面或聯繫技術支援。</p>
        <button onclick="location.reload()" class="btn primary">重新載入</button>
      </div>
    `;
  }

  destroy(){
    if (!this.isInitialized) return;
    try {
      const container = document.querySelector('.sops-page');
      if (container) container.innerHTML = '';
    } catch (_) {}
    this.isInitialized = false;
  }

  async reload(containerId = 'main-content'){
    this.destroy();
    await this.init(containerId);
  }
}

const sopController = new SOPController();
if (typeof window !== 'undefined') {
  window.SOPController = sopController;
}

try { console.log('✅ SOPController loaded'); } catch (_) {}
