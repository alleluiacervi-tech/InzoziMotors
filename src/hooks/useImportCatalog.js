// ─────────────────────────────────────────────────────────────────────────────
// A brand's models: instantly from the bundle, enriched from the server.
//
// The catalogue ships inside the app, so tapping a brand draws all its models
// on the first frame with no spinner and no network — which is the right
// behaviour on a Kigali connection and the reason it is bundled at all.
//
// But the two things the bundle deliberately cannot carry are exactly the two
// that change: the price an admin entered, and the studio render the backend
// resolved. Those live on the server. So the bundle is the floor and the server
// is the enrichment: models appear immediately, and pictures and prices fill in
// when the request lands.
//
// The merge is by model name within a marque, which is the key the two sides
// genuinely share — the bundle has no database ids and never will, because it
// is generated from a JSON file rather than dumped from the table.
//
// A failed request is not an error state here. The screen already has every
// model; it simply shows them without a picture, which is the same thing it
// does for a model the render library has never had.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useMemo } from 'react';
import importsApi from '../api/imports';
import { importCatalogModelsForMake } from '../data/importCatalog';

export default function useImportCatalog(make) {
  const bundled = useMemo(() => importCatalogModelsForMake(make), [make]);
  const [server, setServer] = useState(null);

  useEffect(() => {
    if (!make) return undefined;
    let live = true;
    importsApi
      .getCatalog({ make })
      .then((data) => {
        if (live) setServer(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        // Deliberately silent. See the header: the models are already on screen.
        if (live) setServer([]);
      });
    return () => { live = false; };
  }, [make]);

  return useMemo(() => {
    if (!server || !server.length) return bundled;
    const byModel = new Map(
      server.map((r) => [String(r.model || '').toLowerCase(), r]),
    );
    return bundled.map((item) => {
      const row = byModel.get(item.model.toLowerCase());
      if (!row) return item;
      return {
        ...item,
        id: row.id || item.id,
        renderUrl: row.render_url || undefined,
        images: Array.isArray(row.images) && row.images.length ? row.images : item.images,
        typicalFobUsd: row.typical_fob_usd ?? undefined,
        typicalFreightUsd: row.typical_freight_usd ?? undefined,
        engineCc: row.engine_cc ?? undefined,
        estimatedTransitDays: row.estimated_transit_days ?? item.estimatedTransitDays,
      };
    });
  }, [bundled, server]);
}
