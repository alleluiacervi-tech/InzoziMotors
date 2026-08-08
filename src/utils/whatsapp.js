import { Linking } from 'react-native';
import { showToast } from '../components/Feedback';

// Sawa business line for rentals & support.
//
// HONESTY GATE, mirroring CONTACT.whatsappVerified in web/src/lib/site.ts. The
// number below is a placeholder, and the website already refuses to render any
// WhatsApp surface while it is unverified — the app did not, so it would have
// opened a chat to a number nobody answers. For a product whose whole promise
// is "if it looks real, it is", a dead contact button is exactly the wrong
// first impression.
//
// Flip WHATSAPP_VERIFIED to true in the same commit that sets the real number.
export const SAWA_WHATSAPP = '250788000000';
export const WHATSAPP_VERIFIED = false;

/** True when there is a number worth offering: the seller's own, or a verified
 *  Sawa business line. Callers hide the button when this is false. */
export function hasWhatsApp(phone) {
  return Boolean(String(phone || '').replace(/\D/g, '')) || WHATSAPP_VERIFIED;
}

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
// can't drift between screens. Falls back to Sawa's business line —
// never a fabricated number (Sawa Cars is the middleman anyway).
export function contactSellerOnWhatsApp(car, price) {
  // No seller number and no verified business line means there is nothing to
  // open. Say so rather than launching WhatsApp at a placeholder.
  if (!car.sellerPhone && !WHATSAPP_VERIFIED) {
    showToast('WhatsApp contact is not available yet — please use the app to request this car.', 'info');
    return Promise.resolve();
  }
  const number = car.sellerPhone || SAWA_WHATSAPP;
  const viaSawa = !car.sellerPhone;
  const msg = viaSawa
    ? `Hi Sawa Cars, I'm interested in the ${car.title} (${price}) listed by ${car.seller}. Is it still available?`
    : `Hi ${car.seller}, I found your ${car.title} (${price}) on Sawa Cars. Is it still available?`;
  return openWhatsApp(number, msg);
}
