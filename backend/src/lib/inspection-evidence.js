const { CHECKLIST_VERSION } = require('./inspection-policy');

// The one SQL rule for "this car has valid inspection evidence" (CLAUDE.md §3.1).
//
// A complete inspection on the current checklist whose submission matches the
// car on seller, make, model and year. It deliberately says nothing about the
// score: since the transparency model (PR #106) a low score or a critical
// defect is disclosed on the listing, not a reason to hold it back. Every query
// that asks the question — the public catalogue, the admin queues — reads this
// function, so the two can no longer disagree about the same car.
function validInspectionExists(carAlias = 'c') {
  return `EXISTS (
    SELECT 1
      FROM inspections evidence
      JOIN submissions evidence_submission ON evidence_submission.id = evidence.submission_id
     WHERE evidence.car_id = ${carAlias}.id
       AND evidence_submission.seller_id = ${carAlias}.seller_id
       AND lower(evidence_submission.make) = lower(${carAlias}.make)
       AND lower(evidence_submission.model) = lower(${carAlias}.model)
       AND evidence_submission.year = ${carAlias}.year
       AND evidence.status = 'complete'
       AND evidence.checklist_version = '${CHECKLIST_VERSION}'
  )`;
}

// The whole rule for "anyone can see this live car in the public catalogue":
// a seller who is allowed to sell (CLAUDE.md §3.4) AND valid inspection
// evidence. `seller` is the alias of a users row joined on the car's seller_id.
// The catalogue list and the daily summary both read this, so "12 new cars
// today" can never promise a car the list will not show.
function publiclyVisibleSql(carAlias = 'c', sellerAlias = 'eligible_seller') {
  return `(
    ${sellerAlias}.role = 'seller'
    AND ${sellerAlias}.id_verified = 'approved'
    AND ${sellerAlias}.account_status = 'active'
    AND ${sellerAlias}.deleted_at IS NULL
    AND ${sellerAlias}.is_test = FALSE
    AND (COALESCE(${sellerAlias}.seller_type, 'individual') <> 'showroom' OR ${sellerAlias}.business_verified = TRUE)
    AND ${validInspectionExists(carAlias)}
  )`;
}

module.exports = { validInspectionExists, publiclyVisibleSql };
