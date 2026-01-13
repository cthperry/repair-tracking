/**
 * 使用者建立 / 權限管理（前端版）
 * V161.093
 *
 * 說明：
 * - 由於此系統為純前端（無 Admin SDK），使用「Secondary Firebase App + Auth.Persistence.NONE」
 *   以避免建立使用者時切換目前登入者。
 * - 使用者列表以 Realtime Database 的 /users 節點為主（僅能看到已寫入 profile 的帳號）。
 */

(function () {
  'use strict';

  class UserAdminService {
    constructor() {
      this.isInitialized = false;
      this.secondaryApp = null;
      this.secondaryAuth = null;
      this.db = null;

      // 預設要建立的使用者
      this.defaultUsers = [
        { email: 'frank_chen@premtek.com.tw', displayName: 'Frank_chen', role: 'engineer' },
        { email: 'perry_chuang@premtek.com.tw', displayName: 'Perry_chuang', role: 'admin' },
        { email: 'stone_shih@premtek.com.tw', displayName: 'Stone Shih', role: 'engineer' },
        { email: 'simon_kuo@premtek.com.tw', displayName: 'Simon Kuo', role: 'engineer' },
        { email: 'wayne_chang@premtek.com.tw', displayName: 'Wayne_chang', role: 'engineer' }
      ];

      this.defaultPassword = '123456';
    }

    _assertAdmin() {
      const __u = (window.AppState && typeof window.AppState.getCurrentUser === 'function') ? window.AppState.getCurrentUser() : window.currentUser;
      const role = (__u && __u.role) ? String(__u.role) : '';
      if (role !== 'admin') {
        throw new Error('權限不足：僅管理員可執行此操作');
      }
    }

    async init() {
      if (this.isInitialized) return;

      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK 未載入');
      }

      this.db = firebase.database();

      // 建立 Secondary App（避免影響主登入狀態）
      try {
        const name = 'secondaryUserAdmin';
        const exists = (firebase.apps || []).find(a => a && a.name === name);
        this.secondaryApp = exists || firebase.initializeApp(AppConfig.firebase, name);
        this.secondaryAuth = this.secondaryApp.auth();

        // 不寫入 localStorage/IndexedDB
        try {
          await this.secondaryAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);
        } catch (_) {
          // 某些瀏覽器/版本可能不支援 NONE；忽略並繼續（仍不影響主 auth）
        }
      } catch (e) {
        console.warn('UserAdminService init secondary app failed:', e);
        throw e;
      }

      this.isInitialized = true;
      console.log('✅ UserAdminService initialized');
    }

    _safeEmailKey(email) {
      return String(email || '')
        .trim()
        .toLowerCase()
        .replace(/\./g, ',');
    }

    _decodeEmailKey(key) {
      return String(key || '').trim().replace(/,/g, '.');
    }

    async createUser({ email, displayName, role }) {
      this._assertAdmin();
      await this.init();

      const e = String(email || '').trim().toLowerCase();
      const name = String(displayName || '').trim() || e.split('@')[0];
      const r = (role === 'admin') ? 'admin' : 'engineer';

      if (!e || !e.includes('@')) {
        return { email: e, status: 'invalid', message: 'Email 無效' };
      }

      try {
        const cred = await this.secondaryAuth.createUserWithEmailAndPassword(e, this.defaultPassword);
        const u = cred.user;
        if (!u) throw new Error('createUser 回傳 user 為空');

        // 設定顯示名稱（不一定必要，但方便）
        try { await u.updateProfile({ displayName: name }); } catch (_) {}

        // 寫入 users profile
        const uid = u.uid;
        const now = firebase.database.ServerValue.TIMESTAMP;
        const profile = {
          email: e,
          displayName: name,
          isDisabled: false,
          mustChangePassword: true,
          createdAt: now,
          updatedAt: now
        };

        // 先寫入不含 role 的欄位，避免 role 欄位權限造成整包失敗
        await this.db.ref(`users/${uid}`).update(profile);

        // role 以單欄位寫入（若權限不足則忽略；由管理者稍後調整）
        try { await this.db.ref(`users/${uid}/role`).set(r); } catch (_) {}

        // email 索引（相容舊版 + 新版）
        const key = this._safeEmailKey(e);
        try { await this.db.ref(`userEmailIndex/${key}`).set(uid); } catch (_) {}
        try {
          await this.db.ref(`usersByEmail/${key}`).update({
            uid,
            email: e,
            displayName: name,
            updatedAt: now
          });
        } catch (_) {}

        // 登出 secondary user（避免殘留狀態）
        try { await this.secondaryAuth.signOut(); } catch (_) {}

        return { email: e, uid, status: 'created' };

      } catch (err) {
        const code = err && err.code ? String(err.code) : '';
        if (code === 'auth/email-already-in-use') {
          // Email 已存在：常見情境是 Auth 帳號仍在，但 /users profile 或索引被刪除。
          // 這裡嘗試自動修復：重建 /users profile 與 email 索引。
          try {
            const repaired = await this.restoreExistingUserByEmail(e, { displayName: name, role: r });
            return repaired;
          } catch (e2) {
            try { await this.secondaryAuth.signOut(); } catch (_) {}
            return { email: e, status: 'exists', message: 'Email 已存在（且無法自動修復）' };
          }
        }
        try { await this.secondaryAuth.signOut(); } catch (_) {}
        return { email: e, status: 'failed', message: (err && err.message) ? String(err.message) : '建立失敗' };
      }
    }

    async seedDefaultUsers() {
      this._assertAdmin();
      await this.init();

      const results = [];
      for (const u of this.defaultUsers) {
        // 逐筆建立，避免同時建立造成 auth 競態
        // eslint-disable-next-line no-await-in-loop
        const res = await this.createUser(u);
        results.push(res);
      }
      return results;
    }

    async listUsers() {
      this._assertAdmin();
      await this.init();

      // 1) 以 /users 為主
      const snap = await this.db.ref('users').once('value');
      const val = snap.val() || {};
      const base = Object.keys(val)
        .map(uid => ({ uid, ...(val[uid] || {}) }))
        // 避免非 uid 節點（例如意外寫入的 settings 等）導致空白列
        .filter(u => (u && u.uid && (u.email || u.displayName || u.role)));

      // 2) 合併 /usersByEmail（用於 /users 缺失或資料不完整的情境）
      let byEmail = {};
      try {
        const snap2 = await this.db.ref('usersByEmail').once('value');
        byEmail = snap2.val() || {};
      } catch (_) {
        byEmail = {};
      }

      const map = new Map();
      for (const u of base) {
        map.set(String(u.uid), { ...u });
      }

      Object.keys(byEmail || {}).forEach((k) => {
        const row = byEmail[k] || {};
        const uid = row.uid || row;
        if (!uid) return;
        const id = String(uid);
        if (map.has(id)) {
          const cur = map.get(id);
          if (!cur.email && row.email) cur.email = row.email;
          if (!cur.displayName && row.displayName) cur.displayName = row.displayName;
          map.set(id, cur);
        } else {
          const email = row.email || this._decodeEmailKey(k);
          map.set(id, {
            uid: id,
            email,
            displayName: row.displayName || (email ? email.split('@')[0] : ''),
            role: row.role || 'engineer',
            isDisabled: !!row.isDisabled,
            mustChangePassword: !!row.mustChangePassword
          });
        }
      });

      const arr = Array.from(map.values())
        .filter(u => (u.email && String(u.email).includes('@')));

      // admin 置頂，其餘依 email 排序
      arr.sort((a, b) => {
        const ra = (a.role === 'admin') ? '0' : '1';
        const rb = (b.role === 'admin') ? '0' : '1';
        if (ra !== rb) return ra.localeCompare(rb);
        return String(a.email || '').localeCompare(String(b.email || ''));
      });

      // 嘗試補齊索引（不阻斷）
      try { await this.repairUserIndexes(arr); } catch (_) {}
      return arr;
    }

    async repairUserIndexes(users = []) {
      this._assertAdmin();
      await this.init();

      const now = firebase.database.ServerValue.TIMESTAMP;
      const tasks = [];
      for (const u of (users || [])) {
        const email = (u.email || '').toString().trim().toLowerCase();
        const uid = (u.uid || '').toString().trim();
        if (!email || !uid) continue;
        const key = this._safeEmailKey(email);
        tasks.push(this.db.ref(`userEmailIndex/${key}`).set(uid).catch(() => null));
        tasks.push(this.db.ref(`usersByEmail/${key}`).update({
          uid,
          email,
          displayName: (u.displayName || email.split('@')[0] || '').toString(),
          updatedAt: now
        }).catch(() => null));
      }
      await Promise.all(tasks);
      return true;
    }


    getDefaultUsers() {
      return (this.defaultUsers || []).map(u => ({ ...u }));
    }

    async lookupUidByEmail(email) {
      this._assertAdmin();
      await this.init();

      const e = String(email || '').trim().toLowerCase();
      if (!e || !e.includes('@')) return null;
      const key = this._safeEmailKey(e);

      // 1) 舊索引：userEmailIndex
      try {
        const snap = await this.db.ref(`userEmailIndex/${key}`).once('value');
        const uid = snap.val();
        if (uid) return String(uid);
      } catch (_) {}

      // 2) 新索引：usersByEmail
      try {
        const snap2 = await this.db.ref(`usersByEmail/${key}`).once('value');
        const row = snap2.val() || null;
        const uid = row && (row.uid || row);
        if (uid) return String(uid);
      } catch (_) {}

      return null;
    }

    async restoreExistingUserByEmail(email, opts = {}) {
      this._assertAdmin();
      await this.init();

      const e = String(email || '').trim().toLowerCase();
      const name = String(opts.displayName || '').trim() || (e ? e.split('@')[0] : '');
      const desiredRole = (opts.role === 'admin') ? 'admin' : 'engineer';

      if (!e || !e.includes('@')) {
        return { email: e, status: 'invalid', message: 'Email 無效' };
      }

      let uid = await this.lookupUidByEmail(e);
      let via = uid ? 'index' : '';

      // 嘗試判斷「預設密碼是否仍有效」：
      // - 當 uid 由索引取得、但 /users profile 不存在時，舊邏輯會一律視為首次登入（mustChangePassword=true）。
      // - 實務上，profile 可能因誤刪而遺失；若使用者早已改過密碼，就不應再強制改密碼。
      // 由於 Firebase Admin SDK 不在前端可用，這裡以 secondaryAuth 嘗試用預設密碼登入作為判斷依據。
      let defaultPasswordStillWorks = null; // true/false/null(未知)
      const probeDefaultPassword = async () => {
        try {
          const cred = await this.secondaryAuth.signInWithEmailAndPassword(e, this.defaultPassword);
          const ok = !!(cred && cred.user);
          try { await this.secondaryAuth.signOut(); } catch (_) {}
          return ok;
        } catch (err) {
          const code = err && err.code ? String(err.code) : '';
          // 這些錯誤可視為「預設密碼無效」
          if (code === 'auth/wrong-password' || code === 'auth/invalid-login-credentials' || code === 'auth/user-not-found') {
            try { await this.secondaryAuth.signOut(); } catch (_) {}
            return false;
          }
          // 其他錯誤（網路、節流、限制）視為未知，保守處理
          try { await this.secondaryAuth.signOut(); } catch (_) {}
          return null;
        }
      };

      // 若索引不存在，嘗試用預設密碼登入取得 uid（僅在帳號未改密碼時有效）
      if (!uid) {
        try {
          const cred = await this.secondaryAuth.signInWithEmailAndPassword(e, this.defaultPassword);
          uid = cred && cred.user && cred.user.uid ? String(cred.user.uid) : null;
          via = uid ? 'login_default_password' : '';
          defaultPasswordStillWorks = uid ? true : null;
        } catch (_) {
          uid = null;
        }
      }

      if (!uid) {
        try { await this.secondaryAuth.signOut(); } catch (_) {}
        return {
          email: e,
          status: 'needs_reset',
          message: 'Email 已存在，但無法取得 uid（可能索引被刪除或密碼已更改）。請先寄送重設密碼信，並讓使用者登入一次以重建 profile。'
        };
      }

      const now = firebase.database.ServerValue.TIMESTAMP;
      const ref = this.db.ref(`users/${uid}`);

      let existed = false;
      let profile = null;
      try {
        const snap = await ref.once('value');
        profile = snap.val();
        existed = !!profile;
      } catch (_) {
        profile = null;
        existed = false;
      }

      const patch = {
        email: e,
        displayName: name,
        updatedAt: now
      };

      if (!existed) {
        patch.isDisabled = false;
        // 僅在「預設密碼仍有效」時才強制改密碼；
        // 若預設密碼已失效（代表使用者曾改過密碼），則不應再次強制。
        if (defaultPasswordStillWorks === null) {
          defaultPasswordStillWorks = await probeDefaultPassword();
        }
        // defaultPasswordStillWorks:
        // - true  : 預設密碼仍可登入 → 必須強制改密碼
        // - false : 預設密碼無效（代表曾改密碼） → 不強制
        // - null  : 無法判斷（網路/限制） → 保守起見仍強制
        patch.mustChangePassword = (defaultPasswordStillWorks !== false);
        patch.createdAt = now;
      } else {
        if (typeof profile.isDisabled !== 'boolean') patch.isDisabled = false;
        if (typeof profile.mustChangePassword !== 'boolean') patch.mustChangePassword = false;
      }

      try {
        await ref.update(patch);
      } catch (err) {
        try { await this.secondaryAuth.signOut(); } catch (_) {}
        return { email: e, uid, status: 'failed', message: '修復 profile 失敗：' + (err && err.message ? err.message : 'unknown') };
      }

      // role：只在缺少時補齊，避免覆寫既有設定
      try { await ref.child('role').transaction((cur) => cur || desiredRole); } catch (_) {
        try { await ref.child('role').set(desiredRole); } catch (_) {}
      }

      // email index
      const key = this._safeEmailKey(e);
      try { await this.db.ref(`userEmailIndex/${key}`).set(uid); } catch (_) {}
      try {
        await this.db.ref(`usersByEmail/${key}`).update({
          uid,
          email: e,
          displayName: name,
          role: desiredRole,
          updatedAt: now
        });
      } catch (_) {}

      try { await this.secondaryAuth.signOut(); } catch (_) {}

      return { email: e, uid, status: existed ? 'repaired' : 'restored', via };
    }

    async updateUserRole(uid, role) {
      this._assertAdmin();
      await this.init();

      const r = (role === 'admin') ? 'admin' : 'engineer';
      const now = firebase.database.ServerValue.TIMESTAMP;
      await this.db.ref(`users/${uid}`).update({ role: r, updatedAt: now });
      return true;
    }

    async forcePasswordChangeNextLogin(uid, flag) {
      this._assertAdmin();
      await this.init();

      const now = firebase.database.ServerValue.TIMESTAMP;
      await this.db.ref(`users/${uid}`).update({ mustChangePassword: !!flag, updatedAt: now });
      return true;
    }

    async setDisabled(uid, flag) {
      this._assertAdmin();
      await this.init();

      const now = firebase.database.ServerValue.TIMESTAMP;
      await this.db.ref(`users/${uid}`).update({ isDisabled: !!flag, updatedAt: now });
      return true;
    }
  }

  window.UserAdminService = new UserAdminService();
  console.log('✅ UserAdminService loaded');
})();
