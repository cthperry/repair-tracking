/**
 * 報價管理 - 控制器
 * V161 - Quotes Module - Controller
 */

class QuotesController {
  constructor() {
    this.isInitialized = false;
    this._onDataChanged = null;
    this._uiUpdateTimer = null;
  }

  async init(containerId = 'main-content') {
    if (this.isInitialized) {
      console.debug('QuotesController already initialized');
      return;
    }

    try {
      console.log('🧾 Initializing Quotes Module...');

      if (window.QuoteService && !window.QuoteService.isInitialized) {
        await window.QuoteService.init();
      }
      if (window.RepairPartsService && !window.RepairPartsService.isInitialized) {
        await window.RepairPartsService.init();
      }

      window.quotesUI.render(containerId);

      // 當資料增量同步/即時更新時，若目前停留在報價頁，則自動刷新列表
      if (!this._onDataChanged) {
        this._onDataChanged = (evt) => {
          try {
            if (!evt || !evt.detail || evt.detail.module !== 'quotes') return;
            if (!window.quotesUI || typeof window.quotesUI.update !== 'function') return;
            if (this._uiUpdateTimer) return;
            this._uiUpdateTimer = setTimeout(() => {
              this._uiUpdateTimer = null;
              try { window.quotesUI.update(); } catch (_) {}
            }, 60);
          } catch (_) {}
        };
        window.addEventListener('data:changed', this._onDataChanged);
      }

      this.isInitialized = true;
      console.log('✅ Quotes Module initialized');
      window.dispatchEvent(new CustomEvent('quotes:ready'));
    } catch (error) {
      console.error('❌ Quotes Module initialization failed:', error);
      window.ErrorHandler?.log?.('HIGH', 'QuotesController', 'Initialization failed', { error });
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = this.getFallbackUI();
      throw error;
    }
  }

  getFallbackUI() {
    return `
      <div style="padding:40px;text-align:center;background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:12px;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h3 style="color:#ef4444;margin-bottom:8px;">報價模組載入失敗</h3>
        <p style="color:#475569;margin-bottom:20px;">系統無法載入報價管理模組，請重新整理頁面或聯繫技術支援。</p>
        <button onclick="location.reload()" class="btn primary">重新載入</button>
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

    const container = document.querySelector('.quotes-module');
    if (container) container.innerHTML = '';
    this.isInitialized = false;
  }

  async reload(containerId = 'main-content') {
    this.destroy();
    await this.init(containerId);
  }
}

const quotesController = new QuotesController();
if (typeof window !== 'undefined') {
  window.QuotesController = quotesController;
}

console.log('✅ QuotesController loaded');
