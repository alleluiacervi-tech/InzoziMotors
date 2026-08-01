import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'sawa_auth_token';

// Resolution order, most explicit first:
//   1. extra.apiUrl        — set per build profile in eas.json (production/preview)
//   2. the Metro host       — a physical device on the same Wi-Fi reaches the dev
//                             machine at its LAN IP, never at localhost
//   3. emulator loopbacks   — Android maps the host to 10.0.2.2
// Getting this wrong is invisible in the simulator and total failure on a real
// phone, which is exactly why it must not be a hardcoded constant.
const getBaseUrl = () => {
  const configured = Constants.expoConfig?.extra?.apiUrl;
  if (configured) return String(configured).replace(/\/+$/, '');

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000`;
    }
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
};

export const BASE_URL = getBaseUrl();

// SecureStore is not available on web — use localStorage as fallback
export async function getToken() {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
  }
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token) {
  if (Platform.OS === 'web') {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {}
    return;
  }
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error writing auth token:', error);
  }
}

export async function removeToken() {
  await setToken(null);
}

// A dead backend must fail fast — the app falls back to demo data, and an
// un-timed-out fetch would leave the user staring at a spinner instead.
// Uploads get a longer budget because they carry image payloads.
const DEFAULT_TIMEOUT_MS = 12000;
const UPLOAD_TIMEOUT_MS = 60000;

// Base request wrapper
async function request(endpoint, options = {}) {
  const token = await getToken();
  const isUpload = options.body instanceof FormData;
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  // Do not set Content-Type if we're sending FormData (e.g. file upload) —
  // the runtime has to add its own multipart boundary.
  if (!isUpload) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeout || (isUpload ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS)
  );

  const config = {
    ...options,
    headers,
    signal: controller.signal,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Carry the status and any machine-readable code so callers can branch —
      // e.g. ID_VERIFICATION_REQUIRED routes the seller to verification rather
      // than showing a dead-end error.
      const error = new Error(data.error || `HTTP error! Status: ${response.status}`);
      error.status = response.status;
      error.code = data.code;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('The request timed out. Check your connection.');
      timeoutError.isNetworkError = true;
      console.warn(`API timeout [${config.method || 'GET'} ${endpoint}]`);
      throw timeoutError;
    }
    // Only a transport failure means "backend unreachable"; a 4xx is a real answer.
    if (error.status === undefined) {
      error.isNetworkError = true;
      console.warn(`API unreachable [${config.method || 'GET'} ${endpoint}] — demo data will be used:`, error.message);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// REST wrapper operations
export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
  
  // Custom upload helper for Multipart form-data
  upload: (endpoint, formData, options) => request(endpoint, {
    ...options,
    method: 'POST',
    body: formData,
  }),
};

export default api;
