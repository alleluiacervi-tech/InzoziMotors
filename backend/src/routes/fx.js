const express = require('express');
const { getRate } = require('../lib/fx');

const router = express.Router();

// GET /fx — the platform's USD⇄RWF rate, with provenance.
//
// Public on purpose: it is display data every client needs (website, admin,
// app), and serving it from our own API means no provider keys in clients and
// one place to change providers. Consumers MUST honour `stale` — a stale rate
// is fine for an "≈ $" hint and not fine for restating stored money.
router.get('/', async (req, res) => {
  const fx = await getRate('USD', 'RWF'); // never throws — see lib/fx.js
  // Clients and CDNs may hold it for an hour; the provider updates daily and
  // the server refreshes on its own 15-minute cadence.
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(fx);
});

module.exports = router;
