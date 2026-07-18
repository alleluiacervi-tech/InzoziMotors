import AsyncStorage from '@react-native-async-storage/async-storage';

// Tiny JSON persistence layer — all keys namespaced, all failures silent
// (storage must never crash the app; worst case we fall back to defaults).
const PREFIX = '@inzozi/';

export async function getJSON(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON(key, value) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore — in-memory state remains the source of truth this session
  }
}
