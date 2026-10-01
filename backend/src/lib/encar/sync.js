// ─────────────────────────────────────────────────────────────────────────────
// The two jobs that keep the mirror true (plan A2, A4, A6).
//
//   baseline  walks the provider's catalogue once, page by page, newest first,
//             saving its place after every page so a restart resumes rather than
//             starts over.
//   changes   then reads the provider's change feed — added / updated /
//             reappeared / removed — and applies only the difference.
//
// Every page of work is ONE transaction: rows and cursor move together. The
// store and the transaction helper are injected, so the orchestration is tested
// without a database (test/encar-sync.test.js) and the SQL is tested against
// Postgres separately (test/encar-store.test.js).
//
// Failure policy: a provider error fails the RUN, not the process. The cursor
// does not move, so the next run retries the same page. The worker records the
// error and carries on.
// ─────────────────────────────────────────────────────────────────────────────
const defaultStore = require('./store');
const { normalizeItem, evaluate, extractId } = require('./normalize');
const { EncarError } = require('./client');
const { readExport } = require('./csv');

const PAGE_SIZE = 1000;

// When the provider does not say when an export was built, assume the oldest it
// can be: it is regenerated daily, plus slack for a slow generation.
const EXPORT_MAX_AGE_MS = 26 * 3_600_000;

class CeilingError extends Error {
  constructor(count, ceiling) {
    super(`Row ceiling reached (${count} >= ${ceiling}); refusing to store more`);
    this.name = 'CeilingError';
    this.code = 'ceiling';
  }
}

function emptyCounts() {
  return { added: 0, updated: 0, removed: 0, skipped: 0, unparsed: 0 };
}

/** The export's own build time (a header), else the oldest it could be. */
function exportBuiltAt(res, startedAt) {
  const header = res?.headers?.get?.('x-encarapi-generated-at');
  const stated = header ? new Date(header) : null;
  // A stated time is used when it is sane (a real date, not in the future).
  if (stated && !Number.isNaN(stated.getTime()) && stated <= startedAt) return stated;
  return new Date(startedAt.getTime() - EXPORT_MAX_AGE_MS);
}

function createSync({
  db,
  client,
  store = defaultStore,
  withTx,
  photoPrefix = process.env.ENCAR_PHOTO_PREFIX || '',
  now = () => new Date(),
  // Optional: maps the provider's spelling of a brand onto the one in
  // vehicle_makes ("Mercedes-Benz" and "Benz" are one make to the filters).
  // Returning a falsy value keeps the provider's spelling: never guess.
  canonicalMake = null,
  log = { info() {}, warn() {}, error() {} },
}) {
  if (!withTx) withTx = require('../tx').withTransaction;

  // Splits provider items into rows to keep and ids to drop. Items that fail the
  // rules are DROPPED, not just skipped: a car that was fine yesterday and is a
  // duplicate today must leave the table.
  function triage(items, rules, counts) {
    const keep = [];
    const drop = [];
    for (const raw of items) {
      const row = normalizeItem(raw, { photoPrefix });
      if (!row) {
        const id = extractId(raw);
        if (id) { counts.unparsed += 1; }
        continue;
      }
      if (canonicalMake) row.make = canonicalMake(row.make) || row.make;
      const verdict = evaluate(row, rules, now());
      if (verdict.keep) keep.push(row);
      else { drop.push(row.id); counts.skipped += 1; }
    }
    return { keep, drop };
  }

  // Run inside the page's transaction, AFTER its upserts and deletes. Only a page
  // that actually added cars can breach the ceiling, and its own removals count
  // towards the room. Checking before the work (and counting every kept row) made
  // a full table refuse the very deletes that would have made space, so the feed
  // stalled for good. Throwing rolls the whole page back.
  async function enforceCeiling(conn, rules, inserted) {
    if (!inserted) return;
    const count = await store.countListings(conn);
    if (count > rules.row_ceiling) throw new CeilingError(count, rules.row_ceiling);
  }

  async function runBaseline({ rules, maxPages = 60 }) {
    const counts = emptyCounts();
    let state = await store.getState(db);
    if (state.baseline_completed_at) return { done: true, counts, pages: 0 };

    if (!state.baseline_started_at) {
      // Taken BEFORE the first page: the change feed is asked for everything
      // since this moment, so anything that moves while we page is not missed.
      await store.patchState(db, { baseline_started_at: now() });
      state = await store.getState(db);
    }

    let page = state.baseline_page || 1;
    let pages = 0;
    for (; pages < maxPages; pages += 1, page += 1) {
      const res = await client.catalog({
        page,
        limit: PAGE_SIZE,
        lang: 'en',
        sort: 'newest',
        exclude_duplicates: rules.exclude_duplicates ? true : undefined,
        has_photos: rules.require_photos ? true : undefined,
      });
      const items = Array.isArray(res?.SearchResults) ? res.SearchResults : null;
      if (!items) throw new EncarError('bad_response', 'The catalogue response had no SearchResults');

      const { keep, drop } = triage(items, rules, counts);
      // Only an empty page ends the walk. A short one is not proof: if the provider
      // caps `limit` below PAGE_SIZE every page is "short", and the baseline would
      // declare itself complete after page 1 with most of the catalogue missing.
      const last = items.length === 0;
      await withTx(async (conn) => {
        const r = await store.upsertListings(conn, keep);
        counts.added += r.inserted;
        counts.updated += r.updated;
        counts.removed += await store.deleteListings(conn, drop);
        await enforceCeiling(conn, rules, r.inserted);
        await store.patchState(conn, last
          ? { baseline_page: page, baseline_completed_at: now(), last_error: null }
          : { baseline_page: page + 1 });
      });
      if (last) return { done: true, counts, pages: pages + 1 };
    }
    return { done: false, counts, pages };
  }

  async function runChanges({ rules, maxPages = 20 }) {
    const counts = emptyCounts();
    let state = await store.getState(db);
    if (!state.baseline_completed_at) return { skipped: 'no_baseline', counts, pages: 0 };

    let pages = 0;
    for (; pages < maxPages; pages += 1) {
      const query = { limit: 10000, lang: 'en' };
      if (state.change_cursor != null) query.cursor = state.change_cursor;
      else query.since = new Date(state.baseline_started_at).toISOString();

      let res;
      try {
        res = await client.changes(query);
      } catch (err) {
        if (err instanceof EncarError && err.code === 'cursor_expired') {
          // The provider no longer remembers where we were. The only safe answer
          // is to start over from a fresh baseline.
          log.warn('encar change cursor expired — restarting the baseline');
          await store.patchState(db, {
            baseline_started_at: null, baseline_completed_at: null, baseline_page: 1, change_cursor: null,
          });
        }
        throw err;
      }

      const nextCursor = res?.nextCursor;
      if (nextCursor == null || !Number.isFinite(Number(nextCursor))) {
        throw new EncarError('bad_response', 'The change feed returned no nextCursor');
      }
      const upserts = [...(res.added || []), ...(res.updated || []), ...(res.reappeared || [])];
      const removedIds = (res.removed || []).map(extractId).filter(Boolean);
      const { keep, drop } = triage(upserts, rules, counts);

      await withTx(async (conn) => {
        const r = await store.upsertListings(conn, keep);
        counts.added += r.inserted;
        counts.updated += r.updated;
        counts.removed += await store.deleteListings(conn, [...removedIds, ...drop]);
        await enforceCeiling(conn, rules, r.inserted);
        await store.patchState(conn, { change_cursor: Number(nextCursor), last_error: null });
      });
      state = { ...state, change_cursor: Number(nextCursor) };

      if (!(res.hasMore || res.truncated)) { pages += 1; break; }
    }
    if (counts.unparsed) log.warn('encar change feed items could not be read', { unparsed: counts.unparsed });
    return { counts, pages };
  }

  /**
   * Reads the provider's daily export as a stream.
   *
   *   repair: false  (baseline)  upserts every row; marks the baseline done.
   *   repair: true   (weekly)    upserts what differs AND deletes any car we
   *                              hold that the export no longer lists, which is
   *                              how a missed "removed" event is healed.
   *
   * The export does not count against the request cap, so it is the cheap way
   * to do either. A file we cannot read is refused (see csv.js) and the caller
   * falls back to the catalogue pages.
   */
  async function runExport({ rules, repair = false }) {
    const counts = emptyCounts();
    const state = await store.getState(db);
    if (!repair && state.baseline_completed_at) return { done: true, counts, rows: 0 };
    if (repair && !state.baseline_completed_at) return { skipped: 'no_baseline', counts, rows: 0 };

    const startedAt = now();
    const res = await client.exportCsv({ lang: 'en' });
    if (!res || !res.body) throw new EncarError('bad_response', 'The export had no body');

    // The file describes the catalogue as it was when it was BUILT, not when we
    // downloaded it. Everything the change feed reports after that moment is
    // missing from the file, so the feed must be read from there, and a car first
    // seen after it must not be mistaken for one that has since been removed.
    const builtAt = exportBuiltAt(res, startedAt);
    if (!repair && !state.baseline_started_at) await store.patchState(db, { baseline_started_at: builtAt });

    const seen = new Set();
    let batch = [];
    let rows = 0;
    const flush = async () => {
      if (!batch.length) return;
      const { keep, drop } = triage(batch, rules, counts);
      batch = [];
      for (const row of keep) seen.add(row.id);
      await withTx(async (conn) => {
        const r = await store.upsertListings(conn, keep);
        counts.added += r.inserted;
        counts.updated += r.updated;
        counts.removed += await store.deleteListings(conn, drop);
        await enforceCeiling(conn, rules, r.inserted);
      });
    };
    for await (const item of readExport(res.body)) {
      rows += 1;
      batch.push(item);
      if (batch.length >= PAGE_SIZE) await flush();
    }
    await flush();

    if (repair) {
      // Safety: an export that is suspiciously small (a truncated download) must
      // not be allowed to delete the catalogue. Refuse below half.
      const held = await store.listIds(db);
      if (seen.size < held.length * 0.5) {
        throw new EncarError('bad_response', `The export lists ${seen.size} cars but we hold ${held.length}; not removing anything`);
      }
      // Only cars we already had when the export was built can have left it: one
      // the feed added since is absent from the file for that reason alone.
      const older = new Set(await store.listIds(db, { firstSeenBefore: builtAt }));
      const stale = held.filter((id) => !seen.has(id) && older.has(id));
      for (let i = 0; i < stale.length; i += 1000) {
        counts.removed += await store.deleteListings(db, stale.slice(i, i + 1000));
      }
      await store.patchState(db, { last_repair_at: now() });
      return { counts, rows, repaired: stale.length };
    }

    await store.patchState(db, { baseline_page: 1, baseline_completed_at: now(), last_error: null });
    return { done: true, counts, rows };
  }

  return { runBaseline, runChanges, runExport, triage };
}

module.exports = { createSync, CeilingError, PAGE_SIZE };
