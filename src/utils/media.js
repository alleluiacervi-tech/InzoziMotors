import * as ImagePicker from 'expo-image-picker';
import { showToast, showActionSheet } from '../components/Feedback';

// One capture path for every photo surface in the app — ID documents, seller
// reference shots, the 36-angle listing set, and rental condition records.
// Keeping it in one place means permission handling and compression can never
// drift between screens.

// Listing photos are viewed full-screen and zoomed, so they keep more detail
// than a throwaway condition snap. Quality is a 0–1 JPEG factor.
const PRESETS = {
  document: { quality: 0.75, allowsEditing: false },   // ID front/back, VIN plate
  selfie:   { quality: 0.7,  allowsEditing: false, cameraType: 'front' },
  listing:  { quality: 0.85, allowsEditing: false },   // 36-angle standard
  quick:    { quality: 0.6,  allowsEditing: false },   // rental check-in records
};

// Expo returns `granted: false` both for a fresh denial and for a permanent
// one; either way the user has to act, so the copy points at Settings.
async function ensurePermission(source) {
  const req = source === 'camera'
    ? ImagePicker.requestCameraPermissionsAsync
    : ImagePicker.requestMediaLibraryPermissionsAsync;
  const { granted } = await req();
  if (!granted) {
    showToast(
      source === 'camera'
        ? 'Camera access is off. Enable it for Inzozi Motors in your phone settings.'
        : 'Photo access is off. Enable it for Inzozi Motors in your phone settings.',
      'error'
    );
  }
  return granted;
}

function normalise(result) {
  if (!result || result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    // Expo omits mimeType on some Android builds — fall back to the extension.
    mimeType: asset.mimeType || `image/${(asset.uri.split('.').pop() || 'jpg').toLowerCase()}`,
    fileName: asset.fileName || asset.uri.split('/').pop(),
  };
}

// Ask camera-or-library, then return a single normalised asset (or null if the
// user backed out at any point). `preset` selects quality — see PRESETS.
export async function captureImage({ preset = 'listing', title = 'Add photo', message } = {}) {
  const config = PRESETS[preset] || PRESETS.listing;

  const choice = await showActionSheet({
    title,
    message,
    options: [
      { label: 'Take a photo', icon: 'camera-outline' },
      { label: 'Choose from library', icon: 'images-outline' },
    ],
  });
  if (choice === -1) return null;

  const useCamera = choice === 0;
  if (!(await ensurePermission(useCamera ? 'camera' : 'library'))) return null;

  const options = {
    quality: config.quality,
    allowsEditing: config.allowsEditing,
    mediaTypes: ['images'],
    ...(useCamera && config.cameraType === 'front'
      ? { cameraType: ImagePicker.CameraType.front }
      : {}),
  };

  try {
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    return normalise(result);
  } catch (err) {
    console.warn('image capture failed:', err.message);
    showToast('Could not open the camera. Please try again.', 'error');
    return null;
  }
}

// Multi-select straight from the library — used where the user is adding a
// batch (seller reference photos) rather than filling a named slot.
export async function captureImages({ preset = 'listing', limit = 10 } = {}) {
  const config = PRESETS[preset] || PRESETS.listing;
  if (!(await ensurePermission('library'))) return [];
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: config.quality,
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: limit,
    });
    if (result.canceled) return [];
    return (result.assets || []).map((asset) => ({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType || `image/${(asset.uri.split('.').pop() || 'jpg').toLowerCase()}`,
      fileName: asset.fileName || asset.uri.split('/').pop(),
    }));
  } catch (err) {
    console.warn('image batch capture failed:', err.message);
    showToast('Could not open your photo library. Please try again.', 'error');
    return [];
  }
}

// The server's multer filter accepts a file by its FILENAME EXTENSION, so a
// gallery pick that arrives as `content://…` with no extension (common on
// Android) would be rejected. Derive a safe extension from the mime type.
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function safeFileName(asset, fallbackBase) {
  const ext = EXT_BY_MIME[String(asset.mimeType || '').toLowerCase()] || '.jpg';
  const base = (fallbackBase || asset.fileName || 'photo').replace(/\.[^.]+$/, '');
  // Strip anything the server would have to sanitise anyway
  return `${base.replace(/[^a-zA-Z0-9_-]/g, '') || 'photo'}${ext}`;
}

// React Native's FormData wants { uri, name, type } — not a Blob. Every upload
// path in src/api goes through this so the shape can't drift.
export function appendImage(formData, field, asset, fileNameBase) {
  if (!asset?.uri) return formData;
  const name = safeFileName(asset, fileNameBase || field);
  const ext = name.slice(name.lastIndexOf('.'));
  formData.append(field, {
    uri: asset.uri,
    name,
    // Keep type consistent with the extension we just guaranteed
    type: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
  });
  return formData;
}
