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

    // 避免在網路慢 / 首次登入授權尚未完成時，過早打 Firebase 造成「timeout」誤判
    this._firebaseLoadTimeoutMs = 9000;

    // Firebase timeout 後的自動重試（避免第一次連線慢就永遠卡在 local）
    this._firebaseRetryTimer = null;
  }

  async init() {
    if (this.isInitialized) return;

    this.isFirebase = (window.AuthSystem?.authMode === 'firebase' && typeof firebase !== 'undefined');
    if (this.isFirebase) {
      // 盡量等待 Auth 先就緒（不破壞 Phase 1–3 規則：只用 AppRegistry.ensureReady）
      try {
        await window.AppRegistry?.ensureReady?.(['AuthService']);
      } catch (_) {}

      // Firebase auth 尚未 ready 時，避免用 unknown 組 path
      const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || firebase?.auth?.().currentUser?.uid || null);
      if (uid) {
        this.db = firebase.database();
        this.ref = this.db.ref(`users/${uid}/settings`);
      } else {
        this.ref = null;
      }
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
          new Promise((_, reject) => setTimeout(() => reject(new Error('SettingsService Firebase timeout')), this._firebaseLoadTimeoutMs))
        ]);
        const data = snap.val();
        if (data) {
          this.settings = SettingsModel.normalize(data);
          this.saveToLocal();
          return;
        }
      } catch (e) {
        // timeout / 未連線 不是嚴重錯誤：系統會自動回退 local
        // 但 permission_denied 需要保留資訊，方便後續調 rules。
        const msg = (e && (e.message || e.toString())) || '';
        if (/SettingsService Firebase timeout/i.test(msg)) {
          // 第一次連線慢很常見：先回退 local，但稍後自動重試一次
          this._scheduleFirebaseRetry();
          console.warn('SettingsService load Firebase timeout, fallback to local (will retry):', e);
        } else if (/permission|denied/i.test(msg)) {
          console.warn('SettingsService load Firebase failed (permission), fallback to local:', e);
        } else {
          console.warn('SettingsService load Firebase failed, fallback to local:', e);
        }
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

  async _isFirebaseConnectedFast() {
    try {
      if (!this.db) this.db = firebase.database();
      const infoRef = this.db.ref('.info/connected');
      const snap = await Promise.race([
        infoRef.once('value'),
        new Promise((resolve) => setTimeout(() => resolve(null), 1500))
      ]);
      if (!snap) return false;
      return !!snap.val();
    } catch (_) {
      return false;
    }
  }

  _scheduleFirebaseRetry() {
    try {
      if (this._firebaseRetryTimer) return;
      this._firebaseRetryTimer = setTimeout(async () => {
        this._firebaseRetryTimer = null;
        try {
          // 重新建立 ref（避免第一次 init 時 uid 尚未 ready）
          const uid = (window.AppState?.getUid?.() || window.currentUser?.uid || firebase?.auth?.().currentUser?.uid || null);
          if (!uid) return;
          if (!this.db) this.db = firebase.database();
          this.ref = this.db.ref(`users/${uid}/settings`);

          // 只重試一次：成功就覆寫設定並同步通知 UI
          const connected = await this._isFirebaseConnectedFast();
          if (!connected) return;
          const snap = await Promise.race([
            this.ref.once('value'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('SettingsService Firebase timeout')), this._firebaseLoadTimeoutMs))
          ]);
          const data = snap && typeof snap.val === 'function' ? snap.val() : null;
          if (data) {
            this.settings = SettingsModel.normalize(data);
            this.saveToLocal();
            try { window.dispatchEvent(new CustomEvent('settings:updated', { detail: this.settings })); } catch (_) {}
            console.log('✅ SettingsService Firebase retry loaded');
          }
        } catch (e) {
          // 重試失敗不再打擾使用者
          console.warn('SettingsService Firebase retry failed:', e);
        }
      }, 2500);
    } catch (_) {}
  }
}

const settingsService = new SettingsService();

  try { window.AppRegistry?.register?.('SettingsService', settingsService); } catch (_) {}
console.log('✅ SettingsService loaded');
