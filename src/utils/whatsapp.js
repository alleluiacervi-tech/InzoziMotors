import { Linking } from 'react-native';
import { showToast } from '../components/Feedback';

// Inzozi business line for rentals & support.
// TODO: replace with the real Inzozi WhatsApp Business number before launch.
export const INZOZI_WHATSAPP = '250788000000';

// Open a WhatsApp chat: try the app scheme first (fast, no browser hop),
// fall back to wa.me in the browser, and explain if neither works.
// Phone is sanitised to digits — stored numbers may contain '+' and spaces.
export async function openWhatsApp(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) {
    showToast('No WhatsApp number available for this contact.', 'error');
    return;
  }
  const text = encodeURIComponent(message);
  try {
    await Linking.openURL(`whatsapp://send?phone=${digits}&text=${text}`);
  } catch {
    try {
      await Linking.openURL(`https://wa.me/${digits}?text=${text}`);
    } catch {
      showToast(`WhatsApp is not available — reach them directly at +${digits}.`, 'error');
    }
  }
}

// One message builder for every "contact seller" surface, so the copy
// can't drift between screens. Falls back to Inzozi's business line —
// never a fabricated number (Inzozi is the middleman anyway).
export function contactSellerOnWhatsApp(car, price) {
  const number = car.sellerPhone || INZOZI_WHATSAPP;
  const viaInzozi = !car.sellerPhone;
  const msg = viaInzozi
    ? `Hi Inzozi, I'm interested in the ${car.title} (${price}) listed by ${car.seller}. Is it still available?`
    : `Hi ${car.seller}, I found your ${car.title} (${price}) on Inzozi Motors. Is it still available?`;
  return openWhatsApp(number, msg);
}
