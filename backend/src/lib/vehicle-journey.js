// ─────────────────────────────────────────────────────────────────────────────
// The vehicle journey.
//
// A car reaches the public site through seven stages, and until now they lived
// in three unconnected admin queues. Nothing said where a given vehicle was,
// which is why a booking whose date has passed could sit untouched forever and
// why "where is my car?" needed three pages to answer.
//
// This computes that position once, on the server, from the same workflow
// tables every gate already reads. Three properties make it worth trusting:
//
//   1. DERIVED, NEVER STORED. There is no pipeline_stage column to drift out
//      of sync, for the same reason the Action Center has no tasks table.
//   2. STAGE 6 CALLS publicationReadiness(). It does not restate those rules.
//      A second copy would eventually disagree with the transaction that
//      actually refuses, and a rail that says "ready" beside a button that
//      returns 409 is worse than no rail at all.
//   3. IT GOES BACKWARDS. A failed re-inspection demotes a live listing and a
//      revoked identity pulls a seller's whole catalogue; both already happen
//      in this codebase. A rail that only advances would be at its least
//      truthful exactly when the stakes are highest.
//
// Each stage answers two separate questions. `state` is where the work is
// (done | active | blocked | locked) and `actor` is WHO IT WAITS ON
// (us | seller | clock | none). The second is the useful one: "60% complete"
// decorates, "waiting on us, 6 days" is a decision.
// ─────────────────────────────────────────────────────────────────────────────
const { publicationReadiness } = require('./publication-readiness');
const { PUBLISH_THRESHOLD } = require('./inspection-policy');

const STAGE_KEYS = [
  'seller_verified', 'submitted', 'booked',
  'inspected', 'listing_created', 'ready', 'live',
];

const hoursSince = (value) => (value ? (Date.now() - new Date(value).getTime()) / 3_600_000 : null);

/** A `date` column arrives from node-pg as a Date at local midnight, and
 *  String()-ing one yields "Fri Aug 22 2026 …" — slicing that to ten characters
 *  produces "Fri Aug 2", which is neither a date nor obviously wrong on screen.
 *  Recover the calendar day from the components instead. */
function isoDay(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

/** Midnight-to-midnight in Kigali, so "the appointment was yesterday" means what
 *  an operator means by it rather than what UTC happens to say at 01:00. */
function daysPast(value) {
  const day = isoDay(value);
  if (!day) return null;
  return Math.floor((Date.now() - new Date(`${day}T00:00:00+02:00`).getTime()) / 86_400_000);
}

// ─── Anchoring ───────────────────────────────────────────────────────────────
// The submission is the spine: it is the only row that exists from the first
// moment and links the seller, the inspection and the car. But an operator can
// arrive holding any of the three ids, and a car created before this rule
// existed may have no submission at all — so resolution accepts all three and
// tolerates a missing spine rather than refusing to draw anything.

async function resolveAnchor(db, subjectType, id) {
  // `cars` holds no submission_id. The link is written in the other direction
  // at listing creation — onto submissions.car_id AND inspections.car_id
  // (routes/cars.js) — so both are read here and either one is enough.
  if (subjectType === 'submission') {
    const { rows } = await db.query(
      `SELECT s.id AS submission_id, s.seller_id,
              i.id AS inspection_id,
              COALESCE(s.car_id, i.car_id) AS car_id
         FROM submissions s
         LEFT JOIN inspections i ON i.submission_id = s.id
        WHERE s.id = $1`, [id]
    );
    return rows[0] || null;
  }

  if (subjectType === 'inspection') {
    const { rows } = await db.query(
      'SELECT id, kind, submission_id FROM inspections WHERE id = $1', [id]
    );
    if (!rows.length) return null;
    // A walk-in is a paid check on a vehicle Sawa does not list. It has no
    // pipeline by construction, and pretending otherwise would invite someone
    // to look for the listing stages and wonder why they never complete.
    if (rows[0].kind === 'standalone') return { standalone: true };
    return resolveAnchor(db, 'submission', rows[0].submission_id);
  }

  if (subjectType === 'car') {
    const { rows } = await db.query(
      `SELECT c.id, c.seller_id,
              COALESCE(s.id, i.submission_id) AS submission_id
         FROM cars c
         LEFT JOIN submissions s ON s.car_id = c.id
         LEFT JOIN inspections i ON i.car_id = c.id
        WHERE c.id = $1
        LIMIT 1`, [id]
    );
    if (!rows.length) return null;
    if (rows[0].submission_id) {
      const anchor = await resolveAnchor(db, 'submission', rows[0].submission_id);
      // The submission may have been deleted out from under the listing. Draw
      // what is left rather than returning nothing.
      if (anchor) return { ...anchor, car_id: rows[0].id };
    }
    return { submission_id: null, seller_id: rows[0].seller_id, inspection_id: null, car_id: rows[0].id };
  }

  return null;
}

// ─── Stage builders ──────────────────────────────────────────────────────────
// Each returns { state, actor, at, detail, blockers } and nothing else decides
// its own label or position; that keeps the seven consistent with one another.

function sellerStage(seller) {
  const blockers = [];
  if (!seller) {
    return { state: 'blocked', actor: 'us', detail: 'Seller account is missing', blockers: [
      { label: 'The seller account for this vehicle no longer exists', fix: null },
    ] };
  }
  if (seller.deleted_at) blockers.push({ label: 'Seller account has been deleted', fix: null });
  else if (seller.account_status !== 'active') blockers.push({ label: `Seller account is ${seller.account_status}`, fix: `/users?q=${encodeURIComponent(seller.email)}` });
  if (seller.role !== 'seller') blockers.push({ label: 'Account is not a seller account', fix: `/users?q=${encodeURIComponent(seller.email)}` });
  if (seller.seller_type === 'showroom' && seller.business_verified !== true) {
    blockers.push({ label: 'Showroom business verification is not approved', fix: `/users?q=${encodeURIComponent(seller.email)}` });
  }

  if (seller.id_verified === 'approved') {
    return blockers.length
      ? { state: 'blocked', actor: 'us', detail: 'Seller is no longer eligible', blockers }
      : { state: 'done', actor: 'none', at: seller.id_submitted_at, detail: 'Identity approved', blockers: [] };
  }
  if (seller.id_verified === 'rejected') {
    return { state: 'blocked', actor: 'seller', detail: 'Identity documents were rejected',
      blockers: [...blockers, { label: 'Seller must resubmit identity documents', fix: `/users?tab=verification&focus=${seller.id}` }] };
  }
  if (seller.id_verified === 'pending') {
    return { state: 'active', actor: 'us', at: seller.id_submitted_at, detail: 'Documents submitted, awaiting review',
      blockers: [...blockers, { label: 'Review the identity documents', fix: `/users?tab=verification&focus=${seller.id}` }] };
  }
  return { state: 'active', actor: 'seller', detail: 'No identity documents uploaded yet',
    blockers: [...blockers, { label: 'Seller has not uploaded identity documents', fix: `/users?q=${encodeURIComponent(seller.email)}` }] };
}

function submissionStage(submission, carId) {
  if (!submission) {
    // A listing with no submission can never be published: the evidence link is
    // made once, at creation, and cannot be added afterwards.
    return carId
      ? { state: 'blocked', actor: 'us', detail: 'Listing is not linked to a submission', blockers: [
          { label: 'This listing was created without a submission and can never be published. Archive it and recreate it from the inspection.', fix: '/listings/new' },
        ] }
      : { state: 'locked', actor: 'none', detail: 'No vehicle submitted', blockers: [] };
  }
  if (submission.status === 'rejected') {
    return { state: 'blocked', actor: 'none', at: submission.reviewed_at, detail: 'Submission rejected',
      blockers: [{ label: submission.admin_notes || 'The submission was rejected', fix: `/submissions?focus=${submission.id}` }] };
  }
  return { state: 'done', actor: 'none', at: submission.submitted_at, detail: 'Vehicle submitted', blockers: [] };
}

function bookingStage(submission, inspection) {
  if (!submission) return { state: 'locked', actor: 'none', detail: 'Waiting on a submission', blockers: [] };
  if (submission.status === 'rejected') return { state: 'locked', actor: 'none', detail: 'Submission was rejected', blockers: [] };
  if (inspection && inspection.scheduled_on) {
    return { state: 'done', actor: 'none', at: inspection.scheduled_at || inspection.scheduled_on,
      detail: `${inspection.center} · ${inspection.scheduled_date || isoDay(inspection.scheduled_on)}`, blockers: [] };
  }
  return { state: 'active', actor: 'us', at: submission.submitted_at, detail: 'No inspection booked',
    blockers: [{ label: 'Book an inspection slot for this vehicle', fix: `/submissions?focus=${submission.id}` }] };
}

function inspectionStage(inspection) {
  if (!inspection) return { state: 'locked', actor: 'none', detail: 'Waiting on a booking', blockers: [] };

  if (inspection.status === 'complete') {
    const score = Number(inspection.score);
    const criticals = Array.isArray(inspection.critical_failures) ? inspection.critical_failures : [];
    const detail = criticals.length > 0
      ? `${score}/150 (${criticals.length} defect${criticals.length === 1 ? '' : 's'} disclosed)`
      : `${score}/150 (clean)`;
    return {
      state: 'done',
      actor: 'none',
      at: inspection.completed_at,
      detail,
      blockers: [],
    };
  }

  if (inspection.status === 'in_progress') {
    return { state: 'active', actor: 'us', at: inspection.started_at, detail: 'Checklist in progress',
      blockers: [{ label: 'Finish the 150-point checklist', fix: `/inspections/${inspection.id}` }] };
  }

  // Scheduled. The one case nothing surfaced before: the day came and went and
  // nobody pressed Start, so the booking sat in a queue filtered to today.
  const overdue = daysPast(inspection.scheduled_on);
  if (overdue !== null && overdue > 0) {
    return { state: 'blocked', actor: 'us', at: inspection.scheduled_at || inspection.scheduled_on,
      detail: `Appointment missed ${overdue} day${overdue === 1 ? '' : 's'} ago`,
      blockers: [{ label: 'The appointment passed and the checklist was never started. Rebook it or record what happened.', fix: `/inspections/${inspection.id}` }] };
  }
  return { state: 'active', actor: 'clock', at: inspection.scheduled_at || inspection.scheduled_on,
    detail: overdue === 0 ? 'Due today' : `${inspection.scheduled_date || isoDay(inspection.scheduled_on)}`,
    blockers: [] };
}

function listingStage(submission, inspection, car, inspectionDone) {
  if (car) {
    return { state: 'done', actor: 'none', at: car.created_at, detail: 'Draft created', blockers: [] };
  }
  if (!inspectionDone) return { state: 'locked', actor: 'none', detail: 'Waiting on a passing inspection', blockers: [] };
  return { state: 'active', actor: 'us', at: inspection ? inspection.completed_at : null,
    detail: 'No listing yet',
    blockers: [{ label: 'Create the listing from this inspection — the link cannot be added later', fix: `/listings/new?submissionId=${submission ? submission.id : ''}&inspectionId=${inspection ? inspection.id : ''}` }] };
}

function readinessStage(car, readiness) {
  if (!car) return { state: 'locked', actor: 'none', detail: 'Waiting on a listing', blockers: [] };
  if (!readiness) return { state: 'locked', actor: 'none', detail: 'Listing not found', blockers: [] };
  if (readiness.ready) {
    return { state: 'done', actor: 'none', detail: 'All publication checks pass', blockers: [] };
  }
  // publicationReadiness returns prose reasons; each one is routed to the page
  // that resolves it so a blocker is never a dead end.
  const fixFor = (reason) => {
    if (/photo/i.test(reason)) return `/listings/${car.id}/photos`;
    if (/inspection/i.test(reason)) return '/inspections';
    if (/seller|identity|showroom|account/i.test(reason)) return `/users?q=${encodeURIComponent(car.seller_email || '')}`;
    return `/listings/${car.id}/edit`;
  };
  return {
    state: 'active', actor: 'us', at: car.created_at,
    detail: `${readiness.missing.length} ${readiness.missing.length === 1 ? 'thing' : 'things'} missing`,
    blockers: readiness.missing.map((reason) => ({ label: `Needs ${reason}`, fix: fixFor(reason) })),
  };
}

function liveStage(car, readiness) {
  if (!car) return { state: 'locked', actor: 'none', detail: 'Not yet a listing', blockers: [] };
  if (car.status === 'live') return { state: 'done', actor: 'none', at: car.listed_at, detail: 'Public', blockers: [] };
  if (car.status === 'sold') return { state: 'done', actor: 'none', at: car.sold_at, detail: 'Sold', blockers: [] };
  if (car.status === 'archived') return { state: 'blocked', actor: 'none', detail: 'Archived', blockers: [] };
  if (car.status === 'rejected') return { state: 'blocked', actor: 'none', detail: 'Listing rejected', blockers: [] };
  if (car.status === 'paused') {
    return { state: 'active', actor: 'us', at: car.listed_at, detail: 'Paused',
      blockers: [{ label: 'Listing is paused and not visible to buyers', fix: `/listings/${car.id}/edit` }] };
  }
  if (car.status === 'approved') {
    return readiness && readiness.ready
      ? { state: 'active', actor: 'us', at: car.created_at, detail: 'Approved — awaiting publication',
          blockers: [{ label: 'Publish the listing', fix: '/listings' }] }
      : { state: 'locked', actor: 'none', detail: 'Approved, but no longer ready', blockers: [] };
  }
  return { state: 'locked', actor: 'none', detail: 'Not approved yet', blockers: [] };
}

// ─── Assembly ────────────────────────────────────────────────────────────────

const LABELS = {
  seller_verified: 'Seller verified',
  submitted:       'Vehicle submitted',
  booked:          'Inspection booked',
  inspected:       'Inspection passed',
  listing_created: 'Listing created',
  ready:           'Ready to publish',
  live:            'Live',
};

const HREFS = (anchor) => ({
  seller_verified: anchor.seller_id ? `/users?tab=verification&focus=${anchor.seller_id}` : null,
  submitted:       anchor.submission_id ? `/submissions?focus=${anchor.submission_id}` : null,
  booked:          anchor.inspection_id ? `/inspections?focus=${anchor.inspection_id}` : null,
  inspected:       anchor.inspection_id ? `/inspections/${anchor.inspection_id}` : null,
  listing_created: anchor.car_id ? `/listings/${anchor.car_id}/edit` : null,
  ready:           anchor.car_id ? `/listings/${anchor.car_id}/edit` : null,
  live:            anchor.car_id ? `/listings/${anchor.car_id}/edit` : null,
});

async function loadRows(db, anchor) {
  const [seller, submission, inspection, car] = await Promise.all([
    anchor.seller_id
      ? db.query(`SELECT id, name, email, role, id_verified, id_submitted_at, account_status,
                         deleted_at, seller_type, business_verified
                    FROM users WHERE id = $1`, [anchor.seller_id]).then((r) => r.rows[0] || null)
      : null,
    anchor.submission_id
      ? db.query('SELECT * FROM submissions WHERE id = $1', [anchor.submission_id]).then((r) => r.rows[0] || null)
      : null,
    anchor.inspection_id
      ? db.query('SELECT * FROM inspections WHERE id = $1', [anchor.inspection_id]).then((r) => r.rows[0] || null)
      : null,
    anchor.car_id
      ? db.query(`SELECT c.*, u.email AS seller_email FROM cars c
                    LEFT JOIN users u ON u.id = c.seller_id WHERE c.id = $1`, [anchor.car_id])
          .then((r) => r.rows[0] || null)
      : null,
  ]);
  return { seller, submission, inspection, car };
}

/**
 * Assemble a journey from rows already in hand.
 *
 * Kept separate from the loading so the board can fetch every vehicle in flight
 * with two queries and build hundreds of journeys from that one result set,
 * rather than issuing five queries per row.
 */
function buildJourney({ anchor, seller, submission, inspection, car, readiness }) {
  const built = {
    seller_verified: sellerStage(seller),
    submitted:       submissionStage(submission, anchor.car_id),
    booked:          bookingStage(submission, inspection),
    inspected:       inspectionStage(inspection),
  };
  built.listing_created = listingStage(submission, inspection, car, built.inspected.state === 'done');
  built.ready = readinessStage(car, readiness);
  built.live  = liveStage(car, readiness);

  const hrefs = HREFS(anchor);
  const stages = STAGE_KEYS.map((key, index) => {
    const stage = built[key];
    return {
      key, index: index + 1, label: LABELS[key],
      state: stage.state, actor: stage.actor,
      at: stage.at || null,
      age_hours: stage.state === 'done' ? null : hoursSince(stage.at),
      detail: stage.detail,
      blockers: stage.blockers || [],
      href: hrefs[key],
    };
  });

  // The journey's own state is the first stage that is not finished. A blocked
  // stage outranks an active one even when it sits earlier: a revoked identity
  // matters more than the photograph someone is waiting to upload.
  const blocked = stages.find((stage) => stage.state === 'blocked');
  const active  = stages.find((stage) => stage.state === 'active');
  const current = blocked || active || null;
  const done    = stages.filter((stage) => stage.state === 'done').length;

  const vehicle = {
    make:  (car && car.make)  || (submission && submission.make)  || (inspection && inspection.vehicle_make)  || null,
    model: (car && car.model) || (submission && submission.model) || (inspection && inspection.vehicle_model) || null,
    year:  (car && car.year)  || (submission && submission.year)  || (inspection && inspection.vehicle_year)  || null,
    title: (car && car.title) || null,
  };
  vehicle.title = vehicle.title
    || [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    || 'Vehicle';

  return {
    subject: {
      submission_id: anchor.submission_id || null,
      inspection_id: anchor.inspection_id || null,
      car_id: anchor.car_id || null,
      seller_id: anchor.seller_id || null,
    },
    vehicle,
    seller: seller ? { id: seller.id, name: seller.name, email: seller.email, seller_type: seller.seller_type } : null,
    complete: done === STAGE_KEYS.length,
    stages_done: done,
    stages_total: STAGE_KEYS.length,
    current_stage: current ? current.key : null,
    // Who the vehicle as a whole is waiting on. 'none' means finished or dead,
    // not idle — a queue sorted on this is a day's work list.
    actor: current ? current.actor : 'none',
    blocked: Boolean(blocked),
    age_hours: current ? current.age_hours : null,
    stages,
  };
}

/**
 * The journey for one vehicle.
 * @param subjectType 'submission' | 'inspection' | 'car'
 * @returns null when the subject does not exist, { standalone: true } for a walk-in.
 */
async function vehicleJourney(db, subjectType, id) {
  const anchor = await resolveAnchor(db, subjectType, id);
  if (!anchor) return null;
  if (anchor.standalone) return { standalone: true };

  const rows = await loadRows(db, anchor);
  const readiness = rows.car ? await publicationReadiness(db, rows.car.id) : null;
  return buildJourney({ anchor, ...rows, readiness });
}

module.exports = { vehicleJourney, buildJourney, resolveAnchor, STAGE_KEYS, LABELS };

// ─────────────────────────────────────────────────────────────────────────────
// The seller's view of the same journey.
//
// Deliberately an ALLOWLIST of sentences rather than a filter over the admin
// ones. The internal blockers carry operational phrasing and admin hrefs
// ("Review the identity documents", "/users?tab=verification&focus=…"), and a
// filter is a thing you can forget to update when a new blocker is added. A
// lookup table can only ever emit what is written here.
//
// It is also a promise. Once a seller can read "waiting on Sawa · 6 days", that
// number is something we are answerable for — so nothing here states a
// timescale we have not committed to keeping.
// ─────────────────────────────────────────────────────────────────────────────
const SELLER_COPY = {
  seller_verified: {
    active_seller: 'Upload your identity documents so we can verify your account.',
    active_us: 'We are reviewing your identity documents.',
    blocked: 'Your identity documents were not accepted. Please upload clear photographs of a valid document.',
  },
  submitted: {
    blocked: 'This submission was not accepted. The reason is on the submission itself.',
  },
  booked: {
    active_us: 'We are arranging an inspection slot for your car.',
  },
  inspected: {
    active_clock: 'Your inspection is booked. Bring the car and its papers to the centre.',
    active_us: 'The inspection appointment was missed. We will be in touch to rebook it.',
    blocked: 'The 150-point inspection found problems that need attention before the car can be listed.',
  },
  listing_created: {
    active_us: 'Your car passed the inspection. We are preparing the listing.',
  },
  ready: {
    active_us: 'We are finishing the listing — photographs and pricing.',
  },
  live: {
    active_us: 'The listing is ready and will be published shortly.',
  },
};

const WAITING_ON = { us: 'sawa', seller: 'you', clock: 'schedule', none: 'nobody' };

/** Strip a journey down to what its own seller may see. */
function sellerProgress(journey) {
  if (!journey || journey.standalone) return null;
  const stage = journey.stages.find((entry) => entry.key === journey.current_stage) || null;

  let message = null;
  if (stage) {
    const copy = SELLER_COPY[stage.key] || {};
    message = stage.state === 'blocked'
      ? copy.blocked || null
      : copy[`active_${stage.actor}`] || null;
  } else if (journey.complete) {
    message = 'Your car is live on the marketplace.';
  }

  return {
    submission_id: journey.subject.submission_id,
    car_id: journey.subject.car_id,
    stages_done: journey.stages_done,
    stages_total: journey.stages_total,
    complete: journey.complete,
    blocked: journey.blocked,
    // 'you' is the only value that asks the seller to do something.
    waiting_on: WAITING_ON[journey.actor] || 'nobody',
    stage: stage ? { key: stage.key, label: stage.label } : null,
    message,
  };
}

module.exports.sellerProgress = sellerProgress;
