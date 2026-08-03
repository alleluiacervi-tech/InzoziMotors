// ─────────────────────────────────────────────────────────────────────────────
// Small validators for the shapes this API actually uses.
//
// There is no schema library here on purpose: the surface is a couple of dozen
// routes with a handful of parameter types, and the routes already validate
// their bodies inline. What was missing is the boundary BEFORE the query runs.
//
// Every :id in this codebase is a UUID column. A request like
// GET /cars/not-a-uuid reached Postgres, failed with 22P02, and came back as a
// 500 with a stack trace in the logs — a server error blamed on the server for
// what is plainly a client mistake. It also means genuine 500s are buried in
// noise, and a scanner walking the API gets a signal that something broke.
// ─────────────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

/**
 * Rejects a request whose named route params are not UUIDs.
 *   router.get('/:id', requireUuid('id'), handler)
 * Defaults to 'id', which covers most of the routes here.
 */
function requireUuid(...names) {
  const params = names.length ? names : ['id'];
  return (req, res, next) => {
    for (const name of params) {
      const value = req.params[name];
      // Only validate what is actually present — some routes mount the same
      // middleware across paths where a param is optional.
      if (value !== undefined && !isUuid(value)) {
        return res.status(400).json({
          error: `'${value}' is not a valid ${name}`,
          code: 'INVALID_ID',
        });
      }
    }
    next();
  };
}

/**
 * Clamps limit/offset into a sane window and writes them back as numbers.
 * `?limit=abc` previously reached Postgres as NaN and produced a 500; a
 * negative offset was accepted verbatim.
 */
function paginate({ defaultLimit = 20, maxLimit = 100 } = {}) {
  return (req, _res, next) => {
    const limit = parseInt(req.query.limit, 10);
    const offset = parseInt(req.query.offset, 10);
    req.pagination = {
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), maxLimit) : defaultLimit,
      offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
    };
    next();
  };
}

module.exports = { isUuid, requireUuid, paginate, UUID_RE };
