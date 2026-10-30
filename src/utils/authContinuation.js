// Only existing customer destinations may be resumed after authentication.
const DESTINATIONS = new Set(['Main', 'Sell', 'CarSubmission', 'SellerDashboard', 'SellerContact', 'VehicleDetail', 'RentalDetail', 'RentalInquiry', 'Chat', 'ContactSettings', 'IDVerification', 'ImportOrderDetail', 'ImportVehicleDetail', 'KoreaCarDetail', 'KoreaMarket']);
export function authContinuation(params) {
  if (!DESTINATIONS.has(params?.returnTo)) return {};
  if (params.returnTo === 'Main' && params.returnParams?.screen && !['Home', 'Search', 'Saved', 'Messages', 'Profile'].includes(params.returnParams.screen)) return {};
  if (params.returnTo === 'Main') return { returnTo: 'Main', returnParams: params.returnParams?.screen ? { screen: params.returnParams.screen } : undefined };
  return { returnTo: params.returnTo, returnParams: params.returnParams };
}
export function resumeAfterAuth(navigation, params) {
  const { returnTo, returnParams } = authContinuation(params);
  const routes = [{ name: 'Main' }];
  if (returnTo === 'Main') routes[0].params = returnParams;
  else if (returnTo) routes.push({ name: returnTo, params: returnParams });
  navigation.reset({ index: routes.length - 1, routes });
}
