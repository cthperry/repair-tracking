/**
 * 設定 - 服務層
 * V161 - Settings Module - Service Layer
 */

class SettingsService {
  constructor() {
    this.isInitialized = false;
    this.settings = SettingsModel.defaultSettings();

    this.isFirebase = false;
    this.db = null;
    this.ref = null;
  }

  async init() {
    if (this.isInitialized) return;

    this.isFirebase = (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined');
    if (this.isFirebase) {
      this.db = firebase.database();
      const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || 'unknown');
      this.ref = this.db.ref(`users/${uid}/settings`);
    }

    await this.load();
    this.isInitialized = true;
    console.log('✅ SettingsService initialized');
  }

  getLocalKey() {
    const prefix = AppConfig?.system?.storage?.prefix || 'repair_tracking_';
    const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || 'unknown');
    return `${prefix}settings_${uid}`;
  }

  async load() {
    // Firebase first
    if (this.ref) {
      try {
        // 避免在網路不穩 / Firebase 連線卡住時，造成整個 SettingsService.init() 永遠 pending
        // 這會連帶讓依賴 settings 的 UI（例如：新增/編輯維修單的「常用公司」）永遠停在「載入中...」。
        const snap = await Promise.race([
          this.ref.once('value'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SettingsService Firebase timeout')), 1500))
        ]);
        const data = snap.val();
        if (data) {
          this.settings = SettingsModel.normalize(data);
          this.saveToLocal();
          return;
        }
      } catch (e) {
        console.warn('SettingsService load Firebase failed, fallback to local:', e);
      }
    }

    // local
    try {
      const raw = localStorage.getItem(this.getLocalKey());
      if (raw) {
        this.settings = SettingsModel.normalize(JSON.parse(raw));
      } else {
        this.settings = SettingsModel.defaultSettings();
      }
    } catch (e) {
      this.settings = SettingsModel.defaultSettings();
    }
  }

  saveToLocal() {
    try {
      localStorage.setItem(this.getLocalKey(), JSON.stringify(this.settings || {}));
    } catch (e) {
      console.warn('SettingsService saveToLocal failed:', e);
    }
  }

  async persist() {
    this.settings.updatedAt = new Date().toISOString();
    this.saveToLocal();

    if (this.ref) {
      try {
        await this.ref.set(this.settings);
      } catch (e) {
        console.warn('SettingsService persist Firebase failed:', e);
      }
    }
  }

  async getSettings() {
    await this.init();
    return this.settings;
  }

  async update(patch) {
    await this.init();
    this.settings = SettingsModel.normalize({ ...this.settings, ...patch });
    await this.persist();

    // 通知 UI 偏好可能需要即時套用（例如列表密度）
    try {
      window.dispatchEvent(new CustomEvent('settings:updated', { detail: this.settings }));
    } catch (_) {}

    return this.settings;
  }
}

const settingsService = new SettingsService();
window.SettingsService = settingsService;
  try { window.AppRegistry?.register?.('SettingsService', settingsService); } catch (_) {}
console.log('✅ SettingsService loaded');
