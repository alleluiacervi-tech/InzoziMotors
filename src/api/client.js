import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'inzozi_auth_token';

// Automatically detect local machine host when testing in emulators
const getBaseUrl = () => {
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

// Base request wrapper
async function request(endpoint, options = {}) {
  const token = await getToken();
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  // Do not set Content-Type if we're sending FormData (e.g. file upload)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! Status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.warn(`API unreachable [${config.method || 'GET'} ${endpoint}] — demo data will be used:`, error.message);
    throw error;
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
