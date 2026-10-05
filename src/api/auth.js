import api, { setToken, removeToken } from './client';
import { appendImage } from '../utils/media';

export const auth = {
  // Register a new buyer or seller
  register: async (name, email, password, role = 'buyer', phone) => {
    const data = await api.post('/auth/register', { name, email, password, role, phone });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  // Log in an existing user
  login: async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  // Sign in or up with an ID token from Apple or Google (src/utils/socialAuth.js).
  // The server verifies the token and answers exactly as /auth/login does,
  // plus whether the account still needs a phone number and a role.
  oauth: async (provider, payload) => {
    const data = await api.post(`/auth/oauth/${provider}`, payload);
    if (data.token) await setToken(data.token);
    return data;
  },

  // Which providers the server will accept. Cheap and cached on the server for
  // five minutes; a failure reads as "none", so no button promises a sign-in
  // the server would refuse.
  oauthProviders: async () => {
    try {
      return await api.get('/auth/oauth/providers');
    } catch {
      return { google: false, apple: false };
    }
  },

  // Phone and buyer/seller for an account made with Apple or Google. Returns a
  // fresh token, because the role travels inside it.
  completeProfile: async (phone, role) => {
    const data = await api.post('/auth/oauth/complete-profile', { phone, role });
    if (data.token) await setToken(data.token);
    return data;
  },

  // Trade the current token for a fresh one, so the 30 days run from the last
  // visit rather than the last sign-in. Never throws: a failed renewal just
  // leaves the existing token to run out on its original date.
  refreshSession: async () => {
    try {
      const data = await api.post('/auth/refresh', {});
      if (data?.token) await setToken(data.token);
    } catch {
      // keep the current token
    }
  },

  // Get current user profile (resolves details like verified status and roles)
  getMe: async () => {
    return await api.get('/auth/me');
  },

  // Submit National ID front/back + selfie for seller verification.
  // Takes the assets returned by captureImage() — all three are mandatory
  // server-side, so refuse early rather than sending a request that 400s.
  submitIdVerification: async ({ front, back, selfie }) => {
    if (!front?.uri || !back?.uri || !selfie?.uri) {
      throw new Error('All three documents are required');
    }
    const formData = new FormData();
    appendImage(formData, 'id_front', front, 'id-front');
    appendImage(formData, 'id_back', back, 'id-back');
    appendImage(formData, 'selfie', selfie, 'selfie');
    // 'live' only when all three came straight from the camera. Assets from an
    // older captureImage have no `source`, and count as 'file'.
    const allLive = [front, back, selfie].every((asset) => asset.source === 'live');
    formData.append('capture_source', allLive ? 'live' : 'file');
    return await api.upload('/id-verification', formData);
  },

  // Update own profile (name / phone / avatar)
  updateProfile: async (fields) => {
    return await api.patch('/auth/me', fields);
  },

  // The server ends every other session on a password change and returns a
  // replacement token for THIS device — store it, or the user signs themselves
  // out by securing their own account.
  changePassword: async (currentPassword, newPassword) => {
    const data = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (data.token) await setToken(data.token);
    return data;
  },

  // Required by both stores to be reachable from inside the app, and — since
  // Guideline 5.1.1(v) — to complete here rather than wait for anybody's
  // approval. It does: the account is closed the moment this returns.
  //
  // Nothing is erased for thirty days, and the response says when it will be.
  // The password is re-checked server-side, because a token left open on a
  // borrowed handset must not be enough to take somebody off the marketplace.
  closeAccount: async (password, reason, note) => {
    const data = await api.delete('/auth/me', {
      body: JSON.stringify({ password, reason, note }),
    });
    await removeToken();
    return data;
  },

  // The fixed vocabulary the CHECK constraint accepts, fetched rather than
  // duplicated, so the options on screen and the ones the server will store
  // cannot drift apart.
  closureReasons: async () => api.get('/auth/closure-reasons'),

  // The way back. Unauthenticated by necessity — closing ended every session —
  // so the password is the authentication.
  reopenAccount: async (email, password) => {
    const data = await api.post('/auth/reopen', { email, password });
    if (data.token) await setToken(data.token);
    return data;
  },

  // Password reset — the server always 200s so an attacker learns nothing
  // about which emails exist.
  forgotPassword: async (email) => {
    return await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (email, code, newPassword) => {
    return await api.post('/auth/reset-password', {
      email, code, new_password: newPassword,
    });
  },

  // Log out the active session
  logout: async () => {
    await removeToken();
  },
};

export default auth;
