// The Korean car list: server-side search, filters and cursor paging.
//
// Nothing is bundled and nothing is filtered on the phone: every keystroke or
// chip becomes a query, and only the cars on screen are ever held. Three things
// keep it fast and correct on a mobile connection:
//   · typing is debounced (350 ms), so a word is one request, not one per letter;
//   · a response that arrives after a newer search was started is ignored, so a
//     slow answer to "kia" can never overwrite the answer to "kia sorento";
//   · paging uses the server's cursor, so page 50 costs what page 1 does and a
//     car that sells in between is never shown twice.
import { useCallback, useEffect, useRef, useState } from 'react';
import koreaApi from '../api/koreaImports';

const DEBOUNCE_MS = 350;

export default function useKoreaCars({ q = '', make = '', sort = 'newest', fuel = '' } = {}) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [state, setState] = useState('loading'); // loading | idle | error
  const [moreState, setMoreState] = useState('idle'); // idle | loading | error
  const [available, setAvailable] = useState(true);
  const run = useRef(0);

  const params = useCallback(() => ({
    q: q.trim() || undefined, make: make || undefined, fuel: fuel || undefined,
    sort: sort !== 'newest' ? sort : undefined, limit: 24,
  }), [q, make, sort, fuel]);

  const load = useCallback(async () => {
    const mine = ++run.current;
    setState('loading');
    // A next-page request still in flight belongs to the search being replaced;
    // its answer will be discarded, so it must not leave the footer "loading".
    setMoreState('idle');
    try {
      const page = await koreaApi.list(params());
      if (mine !== run.current) return; // a newer search has started
      setAvailable(page.available !== false);
      setItems(page.items || []);
      setCursor(page.next_cursor || null);
      setState('idle');
    } catch {
      if (mine !== run.current) return;
      // Nothing of the old search stays on screen under the error.
      setItems([]);
      setCursor(null);
      setState('error');
    }
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(load, q ? DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  const loadMore = useCallback(async () => {
    if (!cursor || moreState === 'loading' || state !== 'idle') return;
    const mine = run.current;
    setMoreState('loading');
    try {
      const page = await koreaApi.list({ ...params(), cursor });
      if (mine !== run.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...(page.items || []).filter((c) => !seen.has(c.id))];
      });
      setCursor(page.next_cursor || null);
      setMoreState('idle');
    } catch {
      if (mine === run.current) setMoreState('error');
    }
  }, [cursor, moreState, state, params]);

  return { items, state, moreState, hasMore: Boolean(cursor), available, reload: load, loadMore };
}
