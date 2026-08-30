// ─────────────────────────────────────────────────────────────────────────────
// GET /makes — the brand list every client renders from.
//
// Public and unauthenticated, because it is the same list a signed-out person
// browsing the catalogue needs and a seller filling in a submission needs.
//
// A dedicated route rather than folding this into /settings: settings are a
// handful of scalars an operator tunes, and this is a table with its own admin
// screen and its own upload. Keeping them apart means neither grows the other's
// shape.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const { loadMakes } = require('../lib/vehicle-makes');

const router = express.Router();

router.get('/', async (_req, res) => {
  const makes = await loadMakes();
  // Ten minutes. The list changes when somebody adds a brand — a few times a
  // year — and it is fetched on app launch and on every catalogue page.
  res.set('Cache-Control', 'public, max-age=600');
  // Deliberately NOT the raw rows: `active` is always true here (the loader
  // filters), and ids are of no use to a client that addresses brands by slug.
  // Sending only what is rendered keeps this payload from silently growing a
  // column the way SELECT c.* did on the car route.
  res.json(makes.map(({ name, slug, logo_url }) => ({ name, slug, logo_url })));
});

module.exports = router;
