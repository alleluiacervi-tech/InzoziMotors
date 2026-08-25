const crypto = require('crypto');
const { recordAdminAction } = require('./admin-audit');

// ─────────────────────────────────────────────────────────────────────────────
// Admin-created accounts.
//
// Some customers will not create their own account — a walk-in at the office,
// a showroom being onboarded, a seller who would rather we did it for them. So
// the admin creates it and the person receives a one-use link to set their own
// password.
//
// Deliberately NOT an emailed random password: e-mail is not a secure channel,
// a password sits in an inbox forever, a link expires in 48 hours, and there is
// nothing to "please change" because the person chose it themselves. The
// account is unusable until then because password_hash stays NULL, which is
// what POST /auth/login actually refuses on.
//
// What each kind of account is allowed to start life as:
//
//   buyer            role=buyer                                     nothing granted
//   individual_seller role=seller  seller_type=individual            nothing granted
//   showroom         role=seller  seller_type=showroom  id_verified=approved
//                                                       business_verified=TRUE
//
// A buyer or individual seller does NOT get id_verified='approved'. That flag
// is a seller-eligibility gate (invariant 4) and it means a human checked a
// document; granting it from a dashboard button would quietly hollow out the
// verification promise for exactly the accounts most likely to abuse it. The
// showroom exception is older and narrower: business verification is its own
// deliberate admin judgement, made when the company is onboarded in person.
const ACCOUNT_KINDS = {
  buyer:             { role: 'buyer',  sellerType: null,         idVerified: 'none',     businessVerified: false, needsBusiness: false },
  individual_seller: { role: 'seller', sellerType: 'individual', idVerified: 'none',     businessVerified: false, needsBusiness: false },
  showroom:          { role: 'seller', sellerType: 'showroom',   idVerified: 'approved', businessVerified: true,  needsBusiness: true },
};

/** Creates the account and returns the plaintext invite token, which is never
 *  stored — only its sha256 hash is, so a database leak cannot activate it. */
async function createInvitedAccount(client, { accountType, name, email, phone, businessName, invitedBy }) {
  const kind = ACCOUNT_KINDS[accountType];
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const exists = await client.query('SELECT id FROM users WHERE email=$1', [email]);
  if (exists.rows.length) return { conflict: true };

  const { rows } = await client.query(
    `INSERT INTO users
      (name,email,phone,role,id_verified,seller_type,business_name,admin_created,
       business_verified,must_change_password,invite_token_hash,invite_expires_at,invited_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8,TRUE,$9,NOW()+INTERVAL '48 hours',$10)
     RETURNING id,name,email,phone,role,id_verified,seller_type,business_name,business_verified,created_at`,
    [name, email, phone, kind.role, kind.idVerified, kind.sellerType,
     businessName, kind.businessVerified, tokenHash, invitedBy]
  );
  await recordAdminAction(client, {
    actorId: invitedBy, action: 'account.invited', targetType: 'user', targetId: rows[0].id,
    summary: `Created ${accountType.replace('_', ' ')} account for ${businessName || name}`,
    metadata: { email, account_type: accountType },
  });
  return { user: rows[0], token };
}

module.exports = { ACCOUNT_KINDS, createInvitedAccount };
