// Accounts the team marked as test (Admin → Users → Mark as test account) are
// ours, not customers: every public read already hides them, so a business
// number that counted them would disagree with what visitors can see.
//
// Each helper returns a SQL predicate that is true for rows to KEEP. `owner` is
// a column that names a user; a NULL owner is not a test account. Insights,
// the CSV exports and the PDF statements all use these, so they agree.
const real = (owner) => `NOT EXISTS (SELECT 1 FROM users tu WHERE tu.id = ${owner} AND tu.is_test)`;

const realContact = (a = 'listing_contact_events') => `${real(`${a}.buyer_id`)} AND ${real(`${a}.seller_id`)}`;

const realFee = (a = 'platform_fees') => `${real(`${a}.payer_user_id`)} AND ${real(`${a}.seller_id`)}`;

/** An inspection is ours when its submission's seller, or its standalone customer, is a test account. */
const realInspection = (a) => `${real(`${a}.customer_user_id`)}
    AND NOT EXISTS (SELECT 1 FROM submissions ts JOIN users tu ON tu.id = ts.seller_id WHERE ts.id = ${a}.submission_id AND tu.is_test)`;

const realSubscription = (a) => `NOT EXISTS (SELECT 1 FROM rental_cars trc JOIN users tu ON tu.id = trc.provider_id WHERE trc.id = ${a}.rental_car_id AND tu.is_test)`;

module.exports = { real, realContact, realFee, realInspection, realSubscription };
