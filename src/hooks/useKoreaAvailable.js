// Is the Korean catalogue open, and what is in it?
//
// One small request, remembered for ten minutes across every screen that asks
// (Home, Search, the Korea screens). Until the answer arrives, and whenever the
// server says no or cannot be reached, it is "not available" and the app shows
// the model catalogue it has always had: the Korean catalogue is switched on by
// the operator, never assumed.
import { useEffect, useState } from 'react';
import koreaApi from '../api/koreaImports';

const TTL_MS = 10 * 60 * 1000;
let cache = { at: 0, value: null, pending: null };

function fetchFacets() {
  if (cache.value && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.value);
  if (cache.pending) return cache.pending;
  cache.pending = koreaApi.facets()
    .then((data) => ({ available: Boolean(data?.available && data.total), total: data?.total || 0, makes: data?.makes || [], fuels: data?.fuels || [] }))
    .catch(() => ({ available: false, total: 0, makes: [], fuels: [] }))
    .then((value) => { cache = { at: Date.now(), value, pending: null }; return value; });
  return cache.pending;
}

const UNKNOWN = { available: false, total: 0, makes: [], fuels: [], loaded: false };

export default function useKoreaAvailable() {
  const [state, setState] = useState(cache.value ? { ...cache.value, loaded: true } : UNKNOWN);
  useEffect(() => {
    let live = true;
    fetchFacets().then((value) => { if (live) setState({ ...value, loaded: true }); });
    return () => { live = false; };
  }, []);
  return state;
}
