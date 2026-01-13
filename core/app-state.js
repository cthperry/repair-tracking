/*
 * AppState
 * 目的：
 * - 收斂 window.* 的狀態散落（currentUser/isAuthenticated/deviceInfo 等）
 * - 提供單一狀態來源，降低跨模組耦合與載入順序風險
 *
 * 注意：
 * - 仍保留 window.currentUser / window.isAuthenticated / window.deviceInfo 以相容既有模組
 * - 但內部一律以 AppState 為準
 */

(function () {
  if (typeof window === 'undefined') return;

  const listeners = new Set();

  const state = {
    auth: {
      isAuthenticated: false,
      currentUser: null
    },
    deviceInfo: null
  };

  function emit(type, payload) {
    try {
      window.dispatchEvent(new CustomEvent(type, { detail: payload }));
    } catch (_) {}
    for (const fn of Array.from(listeners)) {
      try { fn(type, payload); } catch (_) {}
    }
  }

  function safeDefine(name, getter, setter) {
    try {
      const desc = Object.getOwnPropertyDescriptor(window, name);
      if (desc && desc.configurable === false) return;
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get: getter,
        set: setter
      });
    } catch (_) {
      // ignore
    }
  }

  const AppState = {
    on(fn) {
      if (typeof fn === 'function') listeners.add(fn);
      return () => { try { listeners.delete(fn); } catch (_) {} };
    },

    // ------------------------------
    // Auth
    // ------------------------------
    isAuthenticated() { return !!state.auth.isAuthenticated; },
    getCurrentUser() { return state.auth.currentUser; },

    getUid() {
      const u = state.auth.currentUser;
      return (u && u.uid) ? String(u.uid) : '';
    },

    getScopeKey() {
      try {
        const u = state.auth.currentUser;
        const uid = (u && u.uid) ? String(u.uid) : '';
        if (uid) return uid;
        const email = (u && u.email) ? String(u.email) : '';
        if (email) return email.replace(/[^a-zA-Z0-9]/g, '_');
        return 'unknown';
      } catch (_) {
        return 'unknown';
      }
    },

    setAuth(session) {
      const prev = state.auth.currentUser;
      state.auth.currentUser = session || null;
      state.auth.isAuthenticated = !!session;
      emit('appstate:auth', { currentUser: state.auth.currentUser, isAuthenticated: state.auth.isAuthenticated, prevUser: prev || null });
    },

    clearAuth() {
      const prev = state.auth.currentUser;
      state.auth.currentUser = null;
      state.auth.isAuthenticated = false;
      emit('appstate:auth', { currentUser: null, isAuthenticated: false, prevUser: prev || null });
    },

    // ------------------------------
    // Device
    // ------------------------------
    getDeviceInfo() { return state.deviceInfo; },
    setDeviceInfo(info) {
      state.deviceInfo = info || null;
      emit('appstate:device', { deviceInfo: state.deviceInfo });
    },

    // ------------------------------
    // Compatibility: window.* bridge
    // ------------------------------
    initGlobals() {
      // bridge window.currentUser
      safeDefine('currentUser',
        () => state.auth.currentUser,
        (v) => { state.auth.currentUser = v || null; state.auth.isAuthenticated = !!v; }
      );

      // bridge window.isAuthenticated
      safeDefine('isAuthenticated',
        () => !!state.auth.isAuthenticated,
        (v) => { state.auth.isAuthenticated = !!v; }
      );

      // bridge window.deviceInfo
      safeDefine('deviceInfo',
        () => state.deviceInfo,
        (v) => { state.deviceInfo = v || null; }
      );
    }
  };

  // register
  try {
    if (window.AppRegistry && typeof window.AppRegistry.register === 'function') {
      window.AppRegistry.register('AppState', AppState);
    }
  } catch (_) {}

  // export (minimal)
  window.AppState = AppState;
  try { AppState.initGlobals(); } catch (_) {}

  console.log('✅ AppState loaded');
})();
