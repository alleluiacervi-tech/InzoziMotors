import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { filterCars, mergeCars } from '../utils/carSearch';

export default function useCarSearch({ query = '', filters = null, sort = 'Best match', rental = false, enabled = true }) {
  const { cars, rentalCars, searchCars, backendReachable } = useApp();
  const [page, setPage] = useState({ items: [], offset: 0, exhausted: false, remote: false });
  const [loading, setLoading] = useState(!rental && enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const busy = useRef(false);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    const id = ++generation.current;
    busy.current = false;
    setLoadingMore(false);
    if (rental || !enabled) { setLoading(false); return undefined; }
    setLoading(true);
    setFailed(false);
    setPage({ items: [], offset: 0, exhausted: false, remote: false });
    const timer = setTimeout(async () => {
      let result;
      try { result = await searchCars({ query, filters: JSON.parse(filterKey), sort, offset: 0 }); }
      catch { result = null; }
      if (id !== generation.current) return;
      setFailed(!result);
      setPage({ items: result?.items || [], offset: result?.items.length || 0, exhausted: result?.exhausted ?? true, remote: Boolean(result) });
      setLoading(false);
    }, query ? 300 : 0);
    return () => { clearTimeout(timer); generation.current += 1; };
  }, [query, filterKey, sort, rental, enabled, searchCars, revision]);

  const loadMore = useCallback(async () => {
    if (rental || !enabled || loading || busy.current || !page.remote || page.exhausted || failed) return;
    busy.current = true;
    setLoadingMore(true);
    const id = generation.current;
    let result;
    try { result = await searchCars({ query, filters: JSON.parse(filterKey), sort, offset: page.offset }); }
    catch { result = null; }
    if (id !== generation.current) return;
    if (result) setPage((previous) => ({ items: mergeCars(previous.items, result.items), offset: previous.offset + result.items.length, exhausted: result.exhausted, remote: true }));
    else setFailed(true);
    busy.current = false;
    setLoadingMore(false);
  }, [rental, enabled, loading, page.remote, page.exhausted, page.offset, failed, query, filterKey, sort, searchCars]);

  const items = useMemo(() => filterCars(rental ? rentalCars : page.remote ? page.items : cars, { query, filters: JSON.parse(filterKey), sort }), [rental, rentalCars, page.remote, page.items, cars, query, filterKey, sort]);
  // Some existing filters are client-side. Do not show an empty answer while
  // matching records may still be on the next server page.
  useEffect(() => { if (!items.length && page.remote && !page.exhausted && !loading && !failed) loadMore(); }, [items.length, page.remote, page.exhausted, loading, failed, loadMore]);
  const scanning = !items.length && page.remote && !page.exhausted && !failed;
  return { items, loading: loading || (!items.length && loadingMore) || scanning, loadingMore, exhausted: rental || page.exhausted, loadMore, failed: !rental && (failed || !backendReachable), retry: () => setRevision((value) => value + 1) };
}
