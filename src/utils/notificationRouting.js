// Maps a notification (whatever type/meta it carries) to a navigation target.
//
// Two very different call sites need the exact same answer, so it lives here
// once instead of twice:
//   - NotificationCenterScreen: an in-app tap on a row already in `notifications`
//     — shape is `{ type, meta: {...} }` (meta is JSONB, already an object).
//   - pushNavigation.js: an OS push notification tap, live or cold-start — Expo
//     hands back `response.notification.request.content.data`, whose shape is
//     FLAT (`{ type, carId, conversationId, ... }`, no nested `meta`) because
//     that is exactly what lib/notify.js's pushToUsers puts in the push payload.
// Reading both `meta.x` and the top-level `x` for every field is what lets one
// function serve both shapes without the caller normalising first.
export function resolveNotificationRoute(input) {
  const meta = input?.meta || {};
  const type = input?.type;
  const conversationId = meta.conversationId || input?.conversationId;
  const carId = meta.carId || input?.carId;
  const disputeId = meta.disputeId || input?.disputeId;
  const bookingId = meta.bookingId || input?.bookingId;
  const importOrderId = meta.importOrderId || input?.importOrderId;

  // A message push always carries conversationId — go straight to the thread,
  // not the inbox list, so a tap lands where the actual new text is.
  if (type === 'message' || type === 'new_message' || conversationId) {
    return conversationId
      ? { screen: 'Chat', params: { convId: conversationId } }
      : { screen: 'Messages' };
  }
  // Price drops and saved-search matches point at a listing. VehicleDetail
  // accepts a bare carId and fetches the rest itself.
  if (carId) return { screen: 'VehicleDetail', params: { carId } };
  if (disputeId) return { screen: 'SawaPromise' };
  if (bookingId || type === 'handover') return { screen: 'SawaPromise' };
  if (importOrderId || type === 'import_update') return { screen: 'ImportOrders' };
  if (type === 'listing_update') {
    // Historical rows from before rentals and selling had separate copy
    // sometimes only distinguish themselves in the text.
    const text = `${input?.title || ''} ${input?.body || ''}`;
    return { screen: /rental|booking/i.test(text) ? 'MyRentals' : 'SellerDashboard' };
  }
  return { screen: 'NotificationCenter' };
}

export default resolveNotificationRoute;
