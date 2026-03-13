/**
 * 機台歷史（序號追蹤） - 控制器
 * V161 - Machines Module - Controller
 *
 * 職責：
 * 1) 初始化必要 Service（repairs/repairParts/quotes/orders）
 * 2) 渲染 MachinesUI
 * 3) 監聽資料變更，讓 Summary/Chips 即時更新
 */

class MachinesController {
  constructor() {
    this.isInitialized = false;
    this._unsubRepair = null;
    this._onDataChanged = this._onDataChanged.bind(this);
    this._refreshTimer = null;
  }

  async init(containerId = 'main-content') {
    if (this.isInitialized) {
      console.debug('MachinesController already initialized');
      return;
    }

    try {
      console.log('🖥️ Initializing Machines Module...');

      // 先確保核心資料可用

      // Phase 1：集中化初始化（registry-first）
      if (window.AppRegistry && typeof window.AppRegistry.ensureReady === 'function') {
        await window.AppRegistry.ensureReady([
          'RepairService',
          'RepairPartsService',
          'QuoteService',
          'OrderService',
          'MaintenanceService'
        ]);
      } 
      window.MachinesUI?.render?.(containerId);

      // 綁定：維修單更新 + 連動資料更新
      this._bind();

      this.isInitialized = true;
      console.log('✅ Machines Module initialized');
      window.dispatchEvent(new CustomEvent('machines:ready'));
    } catch (error) {
      console.error('❌ Machines Module initialization failed:', error);
      window.ErrorHandler?.log?.('HIGH', 'MachinesController', 'Initialization failed', { error });
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = this.getFallbackUI();
      throw error;
    }
  }

  _bind() {
    // 避免重複綁定
    if (this._unsubRepair) return;

    try {
      const RepairService = (window.AppRegistry && typeof window.AppRegistry.get === 'function')
        ? window.AppRegistry.get('RepairService')
        : (typeof window._svc === 'function' ? window._svc('RepairService') : null);
      if (RepairService && typeof RepairService.onChange === 'function') {
        this._unsubRepair = RepairService.onChange(() => this._debouncedRefresh());
      }
    } catch (e) {
      console.warn('MachinesController: bind RepairService listener failed:', e);
    }

    try {
      window.addEventListener('data:changed', this._onDataChanged);
    } catch (_) {}
  }

  _onDataChanged(evt) {
    const mod = evt?.detail?.module || '';
    if (!mod) return;
    if (mod === 'repairParts' || mod === 'quotes' || mod === 'orders' || mod === 'maintenance') {
      this._debouncedRefresh();
    }
  }

  _debouncedRefresh() {
    try {
      if (this._refreshTimer) clearTimeout(this._refreshTimer);
      this._refreshTimer = setTimeout(() => {
        try {
          const ui = window.machinesUI;
          ui?.renderSerialList?.();
          ui?.renderDetail?.();
        } catch (e) {
          console.warn('MachinesController refresh failed:', e);
        }
      }, 180);
    } catch (_) {}
  }

  getFallbackUI() {
    return `
      <div style="padding:40px;text-align:center;background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:12px;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h3 style="color:#ef4444;margin-bottom:8px;">機台歷史模組載入失敗</h3>
        <p style="color:#475569;margin-bottom:20px;">系統無法載入機台歷史模組，請重新整理頁面或聯繫技術支援。</p>
        <button onclick="location.reload()" class="btn primary">重新載入</button>
      </div>
    `;
  }

  destroy() {
    if (!this.isInitialized) return;

    try {
      if (this._unsubRepair) {
        this._unsubRepair();
        this._unsubRepair = null;
      }
    } catch (_) {}

    try {
      window.removeEventListener('data:changed', this._onDataChanged);
    } catch (_) {}

    try {
      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer);
        this._refreshTimer = null;
      }
    } catch (_) {}

    this.isInitialized = false;
  }

  async reload(containerId = 'main-content') {
    this.destroy();
    await this.init(containerId);
  }
}

const machinesController = new MachinesController();
if (typeof window !== 'undefined') {
  window.MachinesController = machinesController;
}

console.log('✅ MachinesController loaded');
