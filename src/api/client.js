import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'inzozi_auth_token';

// Automatically detect local machine host when testing in emulators
const getBaseUrl = () => {
  // To test on a physical phone, replace this with your machine's local IP (e.g., 'http://192.168.1.100:3000')
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

export const BASE_URL = getBaseUrl();

// Retrieve token from SecureStore
export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error reading auth token:', error);
    return null;
  }
}

// Store token in SecureStore
export async function setToken(token) {
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error writing auth token:', error);
  }
}

// Delete token from SecureStore (Logout)
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
    console.error(`API Request error [${config.method || 'GET'} ${endpoint}]:`, error.message);
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
