// Is the Korea market guide on, and what does it say? (backend
// lib/encar/market.js: counts by make from the provider's free plan.)
//
// Same shape and caching as useKoreaAvailable: one small request, remembered
// for ten minutes across every screen that asks. Until it answers, or when the
// guide is off or has no figures yet, it is "not available" and screens keep
// what they showed before.
import { useEffect, useState } from 'react';
import koreaApi from '../api/koreaImports';

const TTL_MS = 10 * 60 * 1000;
let cache = { at: 0, value: null, pending: null };

function fetchMarket() {
  if (cache.value && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.value);
  if (cache.pending) return cache.pending;
  cache.pending = koreaApi.market()
    .then((data) => ({
      available: Boolean(data?.available && !data.pending && data.makes?.length),
      total: data?.total || 0,
      makes: data?.makes || [],
    }))
    .catch(() => ({ available: false, total: 0, makes: [] }))
    .then((value) => { cache = { at: Date.now(), value, pending: null }; return value; });
  return cache.pending;
}

const UNKNOWN = { available: false, total: 0, makes: [], loaded: false };

export default function useKoreaMarket() {
  const [state, setState] = useState(cache.value ? { ...cache.value, loaded: true } : UNKNOWN);
  useEffect(() => {
    let live = true;
    fetchMarket().then((value) => { if (live) setState({ ...value, loaded: true }); });
    return () => { live = false; };
  }, []);
  return state;
}
