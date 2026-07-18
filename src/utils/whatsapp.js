import { Linking, Alert } from 'react-native';

// Inzozi business line for rentals & support.
// TODO: replace with the real Inzozi WhatsApp Business number before launch.
export const INZOZI_WHATSAPP = '250788000000';

// Open a WhatsApp chat: try the app scheme first (fast, no browser hop),
// fall back to wa.me in the browser, and explain if neither works.
export async function openWhatsApp(phone, message) {
  const text = encodeURIComponent(message);
  try {
    await Linking.openURL(`whatsapp://send?phone=${phone}&text=${text}`);
  } catch {
    try {
      await Linking.openURL(`https://wa.me/${phone}?text=${text}`);
    } catch {
      Alert.alert(
        'WhatsApp not available',
        `Install WhatsApp, or reach them directly at +${phone}.`
      );
    }
  }
}
