// ─────────────────────────────────────────────────────────────────────────────
// Was this inspection plausibly performed?
//
// The 150-point checklist is the product. A rubber-stamped one is worse than no
// checklist at all: it certifies things nobody looked at, and it cannot be told
// apart from honest work after the fact. If the condition data ever becomes the
// company's real asset, a fabricated record is not a weak data point — it
// poisons the set.
//
// No form design prevents this. What works is making it VISIBLE and then having
// a conversation with a person. So nothing here blocks anything; it derives
// signals from columns the table already carries and puts them where a human
// will see them.
//
// Derived, never stored — the same discipline as the Action Center and the
// vehicle journey. There is no integrity_score column to drift, and re-deriving
// an old inspection under a new threshold gives the answer that threshold
// implies rather than a stale verdict.
// ─────────────────────────────────────────────────────────────────────────────
const { CATEGORIES } = require('./inspection-policy');

const TOTAL_ITEMS = CATEGORIES.reduce((n, category) => n + category.items.length, 0);

/** Minutes on the clock, or null when the inspection has not been closed. */
function elapsedMinutes(inspection) {
  if (!inspection || !inspection.started_at || !inspection.completed_at) return null;
  const ms = new Date(inspection.completed_at).getTime() - new Date(inspection.started_at).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round((ms / 60000) * 10) / 10;
}

/**
 * Signals worth a human's attention. Each says what was observed, not what it
 * means — "faster than the floor" is a fact; "dishonest" is a judgement, and
 * this file is not entitled to make it.
 */
function integrityFlags(inspection, { minMinutes = 20 } = {}) {
  const flags = [];
  if (!inspection || inspection.status !== 'complete') return flags;

  const minutes = elapsedMinutes(inspection);
  if (minutes === null) {
    // Completed without a recorded start: the route refuses this, so a row in
    // this state predates the guard or was written directly.
    flags.push({ id: 'no_recorded_start', label: 'Completed with no recorded start time' });
  } else if (minutes < minMinutes) {
    flags.push({
      id: 'too_fast',
      label: `Completed in ${minutes} minutes, under the ${minMinutes}-minute floor for ${TOTAL_ITEMS} checks`,
      minutes,
    });
  }

  const results = inspection.checklist_results || {};
  const verdicts = Object.values(results);
  if (verdicts.length) {
    const exceptions = verdicts.filter((verdict) => verdict !== 'pass').length;
    if (exceptions === 0) {
      // Not wrong, and not rare on a genuinely good car — but a perfect sweep
      // is the shape a rubber-stamp takes, so it is worth seeing beside the
      // clock rather than on its own.
      flags.push({ id: 'no_exceptions', label: `Every one of ${verdicts.length} checks recorded as pass` });
    }
  }
  return flags;
}

/** One number for a queue to sort on: how much attention this needs. */
function integrityPriority(flags) {
  if (flags.some((flag) => flag.id === 'too_fast' || flag.id === 'no_recorded_start')) return 'urgent';
  if (flags.length) return 'attention';
  return 'routine';
}

module.exports = { elapsedMinutes, integrityFlags, integrityPriority, TOTAL_ITEMS };
