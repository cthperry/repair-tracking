/**
 * 機台保養管理（Maintenance）- Controller
 * MNT-1（MVP）
 */

(function(){
  'use strict';

  class MaintenanceController {
    constructor(){ this._inited = false; }

    async init(){
      if (this._inited) return;
      try { await window.MaintenanceService?.init?.(); } catch (e) { console.warn('MaintenanceService init failed:', e); }
      this._inited = true;
    }

    async reload(containerId='main-content'){
      await this.init();
      try { window.MaintenanceUI?.render?.(containerId); } catch (e) { console.error(e); }
    }
  }

  const maintenanceController = new MaintenanceController();
  window.MaintenanceController = maintenanceController;
  try { window.AppRegistry?.register?.('MaintenanceController', maintenanceController); } catch (_) {}

  try { console.log('✅ MaintenanceController loaded'); } catch (_) {}
})();
