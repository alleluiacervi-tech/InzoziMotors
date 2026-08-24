const MARKETPLACE_TERMS_VERSION = '2026-08-23';

const DIRECT_DEAL_NOTICE =
  'Sawa Cars provides listing, verification and communication services only. ' +
  'Sawa is not a party to the sale or rental, does not collect or hold transaction funds, ' +
  'and does not guarantee the vehicle, payment, transfer, rental or completion. ' +
  'Verify the vehicle, ownership and counterparty independently before agreeing or paying.';

function contactAvailability(user) {
  const eligible = Boolean(
    user &&
    user.role === 'seller' &&
    user.id_verified === 'approved' &&
    user.account_status === 'active' &&
    !user.deleted_at &&
    (user.seller_type !== 'showroom' || user.business_verified === true)
  );
  return {
    phone: eligible && Boolean(user.phone_visible && user.phone),
    whatsapp: eligible && Boolean(user.whatsapp_visible && user.whatsapp_phone),
  };
}

async function ensureMarketplaceAcknowledgement(db, user, acknowledged) {
  if (user.marketplace_terms_version === MARKETPLACE_TERMS_VERSION && user.marketplace_terms_accepted_at) {
    return;
  }
  if (acknowledged !== true) {
    const error = new Error('Please acknowledge the direct-deal notice before contacting this provider.');
    error.status = 428;
    error.code = 'MARKETPLACE_TERMS_REQUIRED';
    error.notice = DIRECT_DEAL_NOTICE;
    throw error;
  }
  await db.query(
    `UPDATE users
     SET marketplace_terms_accepted_at = NOW(), marketplace_terms_version = $1
     WHERE id = $2`,
    [MARKETPLACE_TERMS_VERSION, user.id]
  );
}

module.exports = {
  MARKETPLACE_TERMS_VERSION,
  DIRECT_DEAL_NOTICE,
  contactAvailability,
  ensureMarketplaceAcknowledgement,
};
