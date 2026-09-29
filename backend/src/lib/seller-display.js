// ─────────────────────────────────────────────────────────────────────────────
// What a buyer sees as "the seller" on a listing.
//
// A showroom sells under its business name: "Sawa Cars Showroom", not the
// name of the person who holds the account. An individual seller keeps their
// own name. Every public read that names a seller (catalogue, featured, detail,
// history, conversations) uses this one expression, so the app and the website
// never show the same car under two different names.
//
// A showroom with no business name recorded falls back to the person's name
// rather than printing an empty string.
// ─────────────────────────────────────────────────────────────────────────────

/** SQL: the display name for the seller row aliased `alias`. */
function sellerDisplayName(alias = 'u') {
  return `CASE WHEN COALESCE(${alias}.seller_type, 'individual') = 'showroom'
                AND NULLIF(BTRIM(${alias}.business_name), '') IS NOT NULL
               THEN BTRIM(${alias}.business_name) ELSE ${alias}.name END`;
}

/** SQL: `seller_name`, `seller_is_showroom` and `seller_avatar_url` columns. */
function sellerDisplayColumns(alias = 'u') {
  return `${sellerDisplayName(alias)} AS seller_name,
              (COALESCE(${alias}.seller_type, 'individual') = 'showroom') AS seller_is_showroom,
              ${alias}.avatar_url AS seller_avatar_url`;
}

module.exports = { sellerDisplayName, sellerDisplayColumns };
