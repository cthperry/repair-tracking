/**
 * 認證系統（Authentication）
 * V160 - 完全獨立的認證模組，不依賴任何業務邏輯
 * 
 * 職責：
 * 1. Firebase Auth 初始化
 * 2. 登入/登出
 * 3. 本地模式降級
 * 4. 使用者狀態管理
 */

class AuthSystem {
  constructor() {
    this.isInitialized = false;
    this.isAuthenticated = false;
    this.currentUser = null;
    this.authMode = null; // 'firebase' or 'local'
    this.firebaseAuth = null;
    this.authListeners = [];

    // 首次登入強制改密碼
    this._pwModalOpen = false;
  }

  _defaultRoleByEmail(email) {
    const e = (email || '').toString().trim().toLowerCase();
    return (e === 'perry_chuang@premtek.com.tw') ? 'admin' : 'engineer';
  }

  _safeEmailKey(email) {
    return String(email || '')
      .trim()
      .toLowerCase()
      .replace(/\./g, ',');
  }

  async _ensureFirebaseUserProfile(user) {
    // 回傳 profile（可能為 null）
    const db = firebase.database();
    const uid = user.uid;
    const ref = db.ref(`users/${uid}`);
    let profile = null;

    const email = (user.email || '').toString().trim().toLowerCase();
    const displayName = user.displayName || (email ? email.split('@')[0] : 'user');
    const now = firebase.database.ServerValue.TIMESTAMP;

    try {
      const snap = await ref.once('value');
      profile = snap.val();
    } catch (e) {
      console.warn('Failed to read user profile:', e);
      profile = null;
    }

    // 若不存在，建立最小 profile（避免權限/設定頁無法運作）
    // 注意：此處不強制寫入 role，避免遇到 role 欄位權限導致整包 set 失敗。
    if (!profile) {
      profile = {
        email,
        displayName,
        isDisabled: false,
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now
      };
      try {
        await ref.update(profile);
      } catch (e) {
        console.warn('Failed to init user profile:', e);
      }
    } else {
      // 補齊必要欄位（向下相容舊資料）
      const patch = {};
      if (!profile.email && email) patch.email = email;
      if (!profile.displayName) patch.displayName = displayName;
      if (typeof profile.isDisabled !== 'boolean') patch.isDisabled = false;
      if (typeof profile.mustChangePassword !== 'boolean') patch.mustChangePassword = false;
      if (Object.keys(patch).length) {
        patch.updatedAt = now;
        try { await ref.update(patch); } catch (e) { console.warn('Failed to patch user profile:', e); }
        profile = { ...profile, ...patch };
      }
    }

    // role：若缺少，嘗試補齊（失敗不阻斷登入流程）
    if (!profile || !profile.role) {
      const r = this._defaultRoleByEmail(email);
      try {
        // 僅在 role 尚未存在時寫入，避免覆寫既有設定
        await ref.child('role').transaction((cur) => cur || r);
        profile = { ...(profile || {}), role: (profile && profile.role) ? profile.role : r };
      } catch (e) {
        // 權限不足時忽略，由前端以 email 預設角色繼續運作
        profile = { ...(profile || {}), role: (profile && profile.role) ? profile.role : r };
      }
    }

    // email index（方便 /users 缺失或資料不完整時仍可由 email 追查 uid）
    try {
      if (email) {
        const key = this._safeEmailKey(email);
        // 相容舊索引
        try { await db.ref(`userEmailIndex/${key}`).set(uid); } catch (_) {}
        // 新索引（含基本資訊，供管理介面顯示）
        try {
          await db.ref(`usersByEmail/${key}`).update({
            uid,
            email,
            displayName: profile?.displayName || displayName,
            updatedAt: now
          });
        } catch (_) {}
      }
    } catch (_) {}

    // 更新 lastLoginAt（不影響流程）
    try {
      await ref.child('lastLoginAt').set(now);
    } catch (_) {}

    return profile;
  }

  async _requirePasswordChange(firebaseUser) {
    if (this._pwModalOpen) return true;
    this._pwModalOpen = true;

    const uid = firebaseUser.uid;
    const email = firebaseUser.email || '';

    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.id = 'force-password-modal';
      wrap.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content" role="dialog" aria-modal="true" aria-label="首次登入設定密碼">
          <div class="modal-header">
            <div>
              <h3>首次登入：請設定新密碼</h3>
              <div class="muted" style="margin-top:6px;">帳號：${(email || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
            </div>
          </div>
          <div class="modal-body">
            <div class="muted" style="margin-bottom:12px;">為了安全，首次登入必須先設定新密碼後才能使用系統。密碼至少 6 位。</div>

            <div style="display:grid; gap:10px;">
              <div>
                <label class="muted" style="display:block; margin-bottom:6px; font-size:12px;">新密碼</label>
                <input id="pw-new" class="input" type="password" placeholder="至少 6 位" />
              </div>
              <div>
                <label class="muted" style="display:block; margin-bottom:6px; font-size:12px;">確認新密碼</label>
                <input id="pw-confirm" class="input" type="password" placeholder="再次輸入" />
              </div>
              <div id="pw-err" style="display:none; padding:10px; border-radius:8px; background: rgba(220,38,38,0.08); border:1px solid var(--color-error); color: var(--color-error); font-size:13px;"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn ghost" type="button" data-act="logout">登出</button>
            <button class="btn primary" type="button" data-act="save">儲存並繼續</button>
          </div>
        </div>
      `.trim();

      const errEl = wrap.querySelector('#pw-err');
      const newEl = wrap.querySelector('#pw-new');
      const confirmEl = wrap.querySelector('#pw-confirm');
      const saveBtn = wrap.querySelector('[data-act="save"]');
      const logoutBtn = wrap.querySelector('[data-act="logout"]');

      const showErr = (msg) => {
        if (!errEl) return;
        errEl.textContent = msg;
        errEl.style.display = 'block';
      };

      const clearErr = () => {
        if (!errEl) return;
        errEl.textContent = '';
        errEl.style.display = 'none';
      };

      const close = (ok) => {
        try { wrap.remove(); } catch (_) {}
        this._pwModalOpen = false;
        resolve(!!ok);
      };

      const setLoading = (loading) => {
        if (!saveBtn) return;
        saveBtn.disabled = loading;
        saveBtn.textContent = loading ? '處理中...' : '儲存並繼續';
      };

      const doSave = async () => {
        clearErr();
        const p1 = (newEl && newEl.value) ? String(newEl.value) : '';
        const p2 = (confirmEl && confirmEl.value) ? String(confirmEl.value) : '';

        if (!p1 || p1.length < 6) {
          showErr('密碼長度不足：至少 6 位。');
          return;
        }
        if (p1 !== p2) {
          showErr('兩次輸入的密碼不一致。');
          return;
        }

        setLoading(true);
        try {
          await firebaseUser.updatePassword(p1);
          try {
            await firebase.database().ref(`users/${uid}`).update({
              mustChangePassword: false,
              passwordUpdatedAt: firebase.database.ServerValue.TIMESTAMP,
              updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
          } catch (_) {}

          // 同步更新 email 索引（管理介面顯示用；失敗不阻斷流程）
          try {
            const e = (email || '').toString().trim().toLowerCase();
            if (e) {
              const key = this._safeEmailKey(e);
              await firebase.database().ref(`usersByEmail/${key}`).update({
                mustChangePassword: false,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
              });
            }
          } catch (_) {}

          try { window.UI?.toast?.('密碼已更新，已解除首次登入限制。', { type: 'success' }); } catch (_) {}
          close(true);
        } catch (e) {
          console.warn('updatePassword failed:', e);
          const code = e && e.code ? String(e.code) : '';
          if (code === 'auth/requires-recent-login') {
            showErr('安全限制：請重新登入後再設定密碼。');
          } else {
            showErr('設定密碼失敗：' + (e && e.message ? e.message : 'unknown'));
          }
          setLoading(false);
        }
      };

      if (saveBtn) saveBtn.addEventListener('click', doSave);
      if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        try { await this.firebaseAuth.signOut(); } catch (_) {}
        close(false);
      });

      document.body.appendChild(wrap);
      try { (newEl || saveBtn).focus(); } catch (_) {}
    });
  }
  
  /**
   * 初始化認證系統
   */
  async init() {
    if (this.isInitialized) {
      console.debug('AuthSystem already initialized');
      return;
    }
    
    try {
      console.log('🔐 Initializing Auth System...');
      
      // 嘗試初始化 Firebase
      await this.initFirebase();
      
      // 渲染登入表單
      this.renderLoginForm();
      
      // 綁定事件
      this.bindEvents();
      
      // 檢查自動登入
      await this.checkAutoLogin();
      
      this.isInitialized = true;
      console.log('✅ Auth System initialized');
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      window.ErrorHandler.log('HIGH', 'Auth', 'Initialization failed', { error });
      
      // 降級到本地模式
      this.switchToLocalMode();
    }
  }
  
  /**
   * 初始化 Firebase
   */
  async initFirebase() {
    try {
      // 檢查 Firebase SDK 是否載入
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded');
      }
      
      // 初始化 Firebase App
      if (!firebase.apps.length) {
        firebase.initializeApp(AppConfig.firebase);
      }
      
      // 取得 Auth 實例
      this.firebaseAuth = firebase.auth();
      
      // 監聽認證狀態
      this.firebaseAuth.onAuthStateChanged((user) => {
        this.handleAuthStateChanged(user);
      });
      
      this.authMode = 'firebase';
      console.log('  ✓ Firebase Auth initialized');
      
    } catch (error) {
      console.warn('  ⚠ Firebase Auth initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * 切換到本地模式
   */
  switchToLocalMode() {
    this.authMode = 'local';
    console.log('  ⚠ Switched to Local Mode');
    
    // 更新 UI 提示
    this.updateLoginFormForLocalMode();
  }
  
  /**
   * 渲染登入表單
   */
  renderLoginForm() {
    const loginContent = document.getElementById('login-content');
    if (!loginContent) {
      console.error('Login content container not found');
      return;
    }
    
    loginContent.innerHTML = `
      <div class="login-card" style="
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 40px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 16px 30px var(--color-shadow);
      ">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔧</div>
          <h1 style="
            font-size: 24px;
            font-weight: 600;
            color: var(--color-primary);
            margin-bottom: 8px;
          ">
            維修追蹤系統
          </h1>
          <p style="font-size: 14px; color: var(--color-text-secondary);">
            ${AppConfig.VERSION_NAME}
          </p>
        </div>
        
        <form id="login-form" style="margin-bottom: 20px;">
          <div style="margin-bottom: 16px;">
            <label style="
              display: block;
              font-size: 13px;
              color: var(--color-text-secondary);
              margin-bottom: 6px;
            ">
              帳號 / Email
            </label>
            <input
              type="email"
              id="login-email"
              placeholder="perry_chuang@premtek.com.tw"
              required
              style="
                width: 100%;
                padding: 10px 12px;
                background: var(--color-surface-muted);
                border: 1px solid var(--color-border);
                border-radius: 6px;
                color: var(--color-text);
                font-size: 14px;
              "
            />
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="
              display: block;
              font-size: 13px;
              color: var(--color-text-secondary);
              margin-bottom: 6px;
            ">
              密碼
            </label>
            <input
              type="password"
              id="login-password"
              placeholder="••••••••"
              required
              style="
                width: 100%;
                padding: 10px 12px;
                background: var(--color-surface-muted);
                border: 1px solid var(--color-border);
                border-radius: 6px;
                color: var(--color-text);
                font-size: 14px;
              "
            />
          </div>
          
          <div id="login-error" style="
            display: none;
            padding: 10px;
            background: rgba(220, 38, 38, 0.08);
            border: 1px solid var(--color-error);
            border-radius: 6px;
            color: var(--color-error);
            font-size: 13px;
            margin-bottom: 16px;
          "></div>
          
          <button
            type="submit"
            id="login-button"
            style="
              width: 100%;
              padding: 12px;
              background: var(--color-primary);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s;
            "
          >
            登入
          </button>
        </form>
        
        <div id="auth-mode-indicator" style="
          padding: 10px;
          background: var(--color-primary-soft);
          border: 1px solid var(--color-primary);
          border-radius: 6px;
          color: var(--color-primary);
          font-size: 12px;
          text-align: center;
        ">
          ⚡ ${this.authMode === 'firebase' ? '雲端模式' : '本地模式'}
        </div>
        
        <div style="
          margin-top: 16px;
          text-align: center;
          font-size: 12px;
          color: var(--color-text-secondary);
        ">
          ${(typeof AppConfig.getFullVersion === 'function') ? AppConfig.getFullVersion(true) : (AppConfig.VERSION_DATE ? `${AppConfig.VERSION} (${AppConfig.VERSION_DATE})` : AppConfig.VERSION)}
        </div>
      </div>
    `;
    
    console.log('  ✓ Login form rendered');
  }
  
  /**
   * 更新登入表單為本地模式
   */
  updateLoginFormForLocalMode() {
    const indicator = document.getElementById('auth-mode-indicator');
    if (indicator) {
      indicator.innerHTML = `
        ⚠️ 本地模式 - 無法連線到雲端伺服器<br>
        資料僅儲存在此裝置
      `;
      indicator.style.borderColor = 'var(--color-warning)';
      indicator.style.background = 'rgba(217, 119, 6, 0.12)';
      indicator.style.color = 'var(--color-warning)';
    }
  }
  
  /**
   * 綁定事件
   */
  bindEvents() {
    // 登入表單提交
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }
    
    // Enter 鍵提交
    document.getElementById('login-password')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleLogin();
      }
    });
    
    console.log('  ✓ Auth events bound');
  }
  
  /**
   * 處理登入
   */
  async handleLogin() {
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    
    // 驗證輸入
    if (!email || !password) {
      this.showLoginError('請輸入帳號和密碼');
      return;
    }
    
    // 顯示載入狀態
    this.setLoginButtonState(true, '登入中...');
    this.hideLoginError();
    
    try {
      if (this.authMode === 'firebase') {
        await this.loginWithFirebase(email, password);
      } else {
        await this.loginLocal(email, password);
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showLoginError(this.getErrorMessage(error));
      this.setLoginButtonState(false, '登入');
    }
  }
  
  /**
   * Firebase 登入
   */
  async loginWithFirebase(email, password) {
    try {
      const userCredential = await this.firebaseAuth.signInWithEmailAndPassword(email, password);
      console.log('✅ Firebase login successful:', userCredential.user.email);
      
      // authStateChanged 會自動觸發
      
    } catch (error) {
      // 如果 Firebase 失敗，嘗試本地模式
      if (error.code === 'auth/network-request-failed') {
        console.warn('Network error, switching to local mode');
        this.switchToLocalMode();
        await this.loginLocal(email, password);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * 本地登入（降級方案）
   */
  async loginLocal(email, password) {
    // 本地模式：簡單的密碼檢查
    const localUsers = this.getLocalUsers();
    const user = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw { code: 'auth/user-not-found', message: '找不到此帳號' };
    }
    
    // 簡單密碼驗證（實際應用應該加密）
    if (user.password !== password) {
      throw { code: 'auth/wrong-password', message: '密碼錯誤' };
    }
    
    // 設定使用者
    this.currentUser = {
      uid: user.uid || `local_${Date.now()}`,
      email: user.email,
      displayName: user.name || user.email.split('@')[0],
      role: user.role || 'engineer',
      photoURL: null
    };
    
    this.isAuthenticated = true;
    
    // 儲存到 localStorage
    this.saveUserSession(this.currentUser);
    
    console.log('✅ Local login successful:', this.currentUser.email);
    
    // 觸發登入成功
    await this.onLoginSuccess();
  }
  
  /**
   * 取得本地使用者列表
   */
  getLocalUsers() {
    // 預設本地使用者（Demo 用）
    return [
      {
        uid: 'local_perry',
        email: 'perry_chuang@premtek.com.tw',
        name: 'Perry Chuang',
        role: 'admin',
        password: 'demo123' // 僅 Demo 用
      },
      {
        uid: 'local_admin',
        email: 'admin@premtek.com.tw',
        name: 'Admin',
        role: 'admin',
        password: 'admin'
      }
    ];
  }
  
  /**
   * 處理認證狀態變更（Firebase）
   */
  async handleAuthStateChanged(user) {
    if (user) {
      // 使用者已登入
      console.log('Auth state changed: User logged in', user.email);

      // 載入/補齊使用者 profile
      let profile = null;
      try {
        profile = await this._ensureFirebaseUserProfile(user);
      } catch (e) {
        console.warn('ensure profile failed:', e);
        profile = null;
      }

      // 停用帳號
      if (profile && profile.isDisabled === true) {
        try { window.UI?.toast?.('此帳號已被停用，請聯絡管理員。', { type: 'error' }); } catch (_) {}
        try { await this.firebaseAuth.signOut(); } catch (_) {}
        return;
      }

      // 建立 currentUser（尚未宣告登入成功前不寫入 window）
      this.currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: (profile && profile.displayName) ? profile.displayName : (user.displayName || user.email.split('@')[0]),
        photoURL: user.photoURL,
        role: (profile && profile.role) ? profile.role : this._defaultRoleByEmail(user.email),
        mustChangePassword: !!(profile && profile.mustChangePassword)
      };

      // 首次登入強制改密碼
      if (this.currentUser.mustChangePassword) {
        const ok = await this._requirePasswordChange(user);
        if (!ok) {
          // 使用者選擇登出或失敗
          return;
        }
        this.currentUser.mustChangePassword = false;
      }

      this.isAuthenticated = true;

      // 儲存 Session
      this.saveUserSession(this.currentUser);

      // 觸發登入成功
      await this.onLoginSuccess();
      
    } else {
      // 使用者未登入
      console.log('Auth state changed: User logged out');
      
      this.currentUser = null;
      this.isAuthenticated = false;
      
      // 清除 Session
      this.clearUserSession();
      
      // 顯示登入表單
      this.showLoginForm();
    }
    
    // 通知監聽器
    this.notifyAuthListeners();
  }
  
  /**
   * 載入使用者資料（從 Firebase）
   */
  async loadUserProfile(user) {
    try {
      if (this.authMode !== 'firebase') return;

      // 保留相容舊呼叫點（此方法改為確保 profile 存在）
      await this._ensureFirebaseUserProfile(user);
      
    } catch (error) {
      console.warn('Failed to load user profile:', error);
    }
  }
  
  /**
   * 登入成功處理
   */
  async onLoginSuccess() {
    console.log('🎉 Login successful!');
    
    // 隱藏登入表單
    this.hideLoginForm();
    
    // 設定全域變數
    try { (window.AppState && typeof window.AppState.setAuth === 'function') ? window.AppState.setAuth(this.currentUser) : null; } catch (_) { try { window.isAuthenticated = true; window.currentUser = this.currentUser; } catch (_) {} }
    // 觸發登入成功事件
    const event = new CustomEvent('auth:login', {
      detail: { user: this.currentUser }
    });
    window.dispatchEvent(event);
    
    // 主應用初始化由頁面端監聽 auth:login 事件處理（避免 AppRouter 尚未建立或無 init 方法）
  }
  
  /**
   * 登出
   */
  async logout() {
    try {
      console.log('🚪 Logging out...');
      
      if (this.authMode === 'firebase' && this.firebaseAuth) {
        await this.firebaseAuth.signOut();
      } else {
        // 本地模式登出
        this.currentUser = null;
        this.isAuthenticated = false;
        this.clearUserSession();
        this.showLoginForm();
        this.notifyAuthListeners();
      }
      
      // 清除全域變數
      try { (window.AppState && typeof window.AppState.clearAuth === 'function') ? window.AppState.clearAuth() : null; } catch (_) { try { window.isAuthenticated = false; window.currentUser = null; } catch (_) {} }
      // 觸發登出事件
      const event = new CustomEvent('auth:logout');
      window.dispatchEvent(event);
      
      console.log('✅ Logout successful');
      
    } catch (error) {
      console.error('Logout error:', error);
      window.ErrorHandler.log('MEDIUM', 'Auth', 'Logout failed', { error });
    }
  }
  
  /**
   * 檢查自動登入
   */
  async checkAutoLogin() {
    const session = this.loadUserSession();
    
    if (session && this.authMode === 'local') {
      // 本地模式自動登入
      this.currentUser = session;
      this.isAuthenticated = true;
      try { (window.AppState && typeof window.AppState.setAuth === 'function') ? window.AppState.setAuth(session) : null; } catch (_) { try { window.isAuthenticated = true; window.currentUser = session; } catch (_) {} }
      console.log('✅ Auto-login successful (local mode)');
      await this.onLoginSuccess();
    }
  }
  
  /**
   * 儲存使用者 Session
   */
  saveUserSession(user) {
    try {
      const session = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        timestamp: Date.now()
      };
      
      const key = AppConfig.system.storage.prefix + 'session';
      localStorage.setItem(key, JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to save session:', error);
    }
  }
  
  /**
   * 載入使用者 Session
   */
  loadUserSession() {
    try {
      const key = AppConfig.system.storage.prefix + 'session';
      const data = localStorage.getItem(key);
      
      if (data) {
        const session = JSON.parse(data);
        
        // 檢查 Session 是否過期（24小時）
        const age = Date.now() - session.timestamp;
        if (age < 24 * 60 * 60 * 1000) {
          return session;
        }
      }
    } catch (error) {
      console.warn('Failed to load session:', error);
    }
    
    return null;
  }
  
  /**
   * 清除使用者 Session
   */
  clearUserSession() {
    try {
      const key = AppConfig.system.storage.prefix + 'session';
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }
  }
  
  /**
   * 顯示/隱藏登入表單
   */
  showLoginForm() {
    const container = document.getElementById('login-container');
    if (container) {
      container.style.display = 'flex';
    }

    const appContainer = document.getElementById('app-container');
    if (appContainer) {
      appContainer.style.display = 'none';
    }

    // 登出後會回到登入頁，但上一輪登入成功時按鈕會留在「登入中...」且 disabled。
    // 這裡強制重設 UI 狀態，避免切換帳號時無法點擊登入。
    try {
      this.hideLoginError();
      this.setLoginButtonState(false, '登入');
      const pw = document.getElementById('password');
      if (pw) pw.value = '';
    } catch (_) {}
  }

  hideLoginForm() {
    const container = document.getElementById('login-container');
    if (container) {
      container.style.display = 'none';
    }
    
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
      appContainer.style.display = 'block';
    }
  }
  
  /**
   * 顯示/隱藏登入錯誤
   */
  showLoginError(message) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }
  
  hideLoginError() {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }
  
  /**
   * 設定登入按鈕狀態
   */
  setLoginButtonState(loading, text) {
    const button = document.getElementById('login-button');
    if (button) {
      button.disabled = loading;
      button.textContent = text;
      button.style.opacity = loading ? '0.6' : '1';
      button.style.cursor = loading ? 'not-allowed' : 'pointer';
    }
  }
  
  /**
   * 取得錯誤訊息
   */
  getErrorMessage(error) {
    const messages = {
      'auth/user-not-found': '找不到此帳號',
      'auth/wrong-password': '密碼錯誤',
      'auth/invalid-email': 'Email 格式錯誤',
      'auth/user-disabled': '此帳號已被停用',
      'auth/too-many-requests': '登入嘗試次數過多，請稍後再試',
      'auth/network-request-failed': '網路連線失敗'
    };
    
    return messages[error.code] || error.message || '登入失敗，請稍後再試';
  }
  
  /**
   * 監聽認證狀態
   */
  onAuthStateChange(callback) {
    this.authListeners.push(callback);
    
    // 立即呼叫一次
    if (this.isInitialized) {
      callback(this.currentUser);
    }
    
    // 返回取消監聽函式
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }
  
  /**
   * 通知監聽器
   */
  notifyAuthListeners() {
    this.authListeners.forEach(callback => {
      try {
        callback(this.currentUser);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }
  
  /**
   * 取得當前使用者
   */
  getCurrentUser() {
    return this.currentUser;
  }
  
  /**
   * 檢查權限
   */
  hasPermission(permission) {
    if (!this.currentUser) return false;
    return AppConfig.hasPermission(this.currentUser.role, permission);
  }
}

// 建立全域實例
const authSystem = new AuthSystem();

// 輸出到全域
if (typeof window !== 'undefined') {
  window.AuthSystem = authSystem;
  
  // 便捷方法
  window.logout = () => authSystem.logout();
}

// 監聽 Bootstrap 完成事件
window.addEventListener('bootstrap:ready', () => {
  console.log('Initializing Auth System after bootstrap...');
  authSystem.init();
});

console.log('✅ AuthSystem loaded');
