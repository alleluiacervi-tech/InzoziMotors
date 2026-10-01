#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Phase 0 spike for the Encar import (docs/ENCAR-IMPORT-PLAN.md §9).
//
//   ENCAR_API_KEY=... node scripts/encar-spike.js [--out report.json] [--fixtures ./fixtures]
//
// READ-ONLY and DATABASE-FREE. It makes about 60 requests, stores nothing, and
// answers the questions the documentation leaves open:
//
//   · where do the photo addresses point, and do they load without our key?
//   · can that host resize? what do its cache and CORS headers say?
//   · how many cars are there, and how many survive our ingest rules?
//   · what do the change feed's events look like, and how many a day?
//   · what columns does the full export have, and how big is it?
//
// Nothing it prints or writes contains the key. Fixtures are written with
// anything plate-, VIN-, dealer- or contact-like stripped, so they are safe to
// commit as test data.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { createClient, EncarError } = require('../src/lib/encar/client');
const { normalizeItem, evaluate, DEFAULT_RULES } = require('../src/lib/encar/normalize');

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const OUT = flag('--out');
const FIXTURES = flag('--fixtures');

let requests = 0;
let bytes = 0;
const client = createClient({ onUsage: (u) => { requests += u.requests; bytes += u.bytes; } });
const report = { generatedAt: new Date().toISOString() };

const SENSITIVE = /plate|vin|dealer|phone|contact|tel\b|mobile|owner|name|address|email|license/i;
function redact(value, depth = 0) {
  if (depth > 8 || value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE.test(k) ? '[removed]' : redact(v, depth + 1);
  return out;
}
const keysOf = (o) => (o && typeof o === 'object' ? Object.keys(o) : []);
function commonPrefix(strings) {
  if (!strings.length) return '';
  let p = strings[0];
  for (const s of strings) { while (!s.startsWith(p)) p = p.slice(0, -1); if (!p) break; }
  const slash = p.lastIndexOf('/');
  return slash >= 0 ? p.slice(0, slash + 1) : p;
}
function save(name, data) {
  if (!FIXTURES) return;
  fs.mkdirSync(FIXTURES, { recursive: true });
  fs.writeFileSync(path.join(FIXTURES, name), JSON.stringify(redact(data), null, 2));
}
async function step(name, fn) {
  process.stdout.write(`• ${name} … `);
  try {
    const result = await fn();
    report[name] = result;
    console.log('ok');
  } catch (err) {
    report[name] = { error: err instanceof EncarError ? `${err.code} (${err.status})` : String(err.message).slice(0, 200) };
    console.log(`FAILED ${report[name].error}`);
  }
}

async function main() {
  if (!client.configured) { console.error('Set ENCAR_API_KEY (never paste it into chat or a file).'); process.exit(2); }

  let sample = [];
  await step('catalog_sample', async () => {
    const res = await client.catalog({ page: 1, limit: 200, lang: 'en', count: true, sort: 'newest' });
    sample = res.SearchResults || [];
    save('catalog-page.json', { ...res, SearchResults: sample.slice(0, 20) });
    const rows = sample.map((i) => normalizeItem(i)).filter(Boolean);
    const verdicts = rows.map((r) => evaluate(r, DEFAULT_RULES).reason || 'kept');
    const tally = (arr) => arr.reduce((a, k) => ((a[k] = (a[k] || 0) + 1), a), {});
    const photoUrls = sample.flatMap((i) => (i.Photos || []).map((p) => p.location)).filter(Boolean);
    return {
      totalMatches: res.Count ?? null,
      itemFields: keysOf(sample[0]),
      sampleSize: sample.length,
      verdicts: tally(verdicts),
      fuels: tally(rows.map((r) => r.fuel || 'unknown')),
      transmissions: tally(rows.map((r) => r.transmission || 'unknown')),
      cheapestPrices: rows.map((r) => r.price_man).sort((a, b) => a - b).slice(0, 15),
      photosPerCar: sample.length ? +(photoUrls.length / sample.length).toFixed(1) : 0,
      photoUrlExample: photoUrls[0] ? photoUrls[0].replace(/\d{6,}/g, '#') : null,
      photoHosts: [...new Set(photoUrls.map((u) => { try { return new URL(u).host; } catch { return 'invalid'; } }))],
      photoPrefix: commonPrefix(photoUrls),
      duplicatesInSample: sample.filter((i) => i.IsDuplicate).length,
    };
  });

  await step('counts_after_filters', async () => {
    const n = async (q) => (await client.catalog({ limit: 1, lang: 'en', count: true, ...q })).Count ?? null;
    return {
      all: await n({}),
      without_duplicates: await n({ exclude_duplicates: true }),
      with_photos_and_no_duplicates: await n({ exclude_duplicates: true, has_photos: true }),
      lpg: await n({ exclude_duplicates: true, has_photos: true, fuel: 'lpg' }),
      cng: await n({ exclude_duplicates: true, has_photos: true, fuel: 'cng' }),
      hydrogen: await n({ exclude_duplicates: true, has_photos: true, fuel: 'hydrogen' }),
      accident_free: await n({ exclude_duplicates: true, has_photos: true, frame_clean: true }),
      with_inspection: await n({ exclude_duplicates: true, has_photos: true, has_inspection: true }),
    };
  });

  await step('photo_host', async () => {
    const url = sample.flatMap((i) => (i.Photos || []).map((p) => p.location)).find(Boolean);
    if (!url) return { note: 'no photo in the sample' };
    // No key is sent: this is what a customer's phone would do.
    const get = async (u, init = {}) => {
      const r = await fetch(u, { redirect: 'follow', ...init });
      const buf = init.method === 'HEAD' ? null : Buffer.from(await r.arrayBuffer());
      return {
        status: r.status,
        contentType: r.headers.get('content-type'),
        contentLength: Number(r.headers.get('content-length')) || (buf ? buf.length : null),
        cacheControl: r.headers.get('cache-control'),
        cors: r.headers.get('access-control-allow-origin'),
        server: r.headers.get('server'),
        via: r.headers.get('via'),
      };
    };
    const original = await get(url);
    const probes = {};
    for (const suffix of ['?w=400', '?width=400', '?size=400', '?rs=w_400', '?impolicy=resize&w=400']) {
      try { probes[suffix] = (await get(url + suffix)).contentLength; } catch { probes[suffix] = 'error'; }
    }
    return {
      original,
      loadsWithoutKey: original.status === 200,
      loadsFromOtherSites: original.cors === '*' || Boolean(original.cors),
      sizeProbes: probes,
      resizeWorks: Object.values(probes).some((v) => typeof v === 'number' && original.contentLength && v < original.contentLength * 0.6),
    };
  });

  await step('vehicle_detail', async () => {
    const ids = sample.slice(0, 15).map((i) => i.Id);
    const details = [];
    for (const id of ids) { try { details.push(await client.vehicle(id)); } catch (e) { details.push({ error: e.code }); } }
    const ok = details.filter((d) => !d.error);
    save('vehicle-detail.json', ok.slice(0, 3));
    const photoCounts = ok.map((d) => (d.Photos || d.photos || d.images || []).length);
    return {
      fetched: ok.length,
      topLevelFields: [...new Set(ok.flatMap((d) => keysOf(d)))],
      lifecycleFields: keysOf(ok[0]?.lifecycle),
      photosInDetail: photoCounts,
      priceHistoryPoints: ok.map((d) => (d.priceHistory || []).length),
    };
  });

  await step('inspection_and_record', async () => {
    const ids = sample.slice(0, 8).map((i) => i.Id);
    const out = { inspection: [], record: [] };
    for (const id of ids) {
      try { out.inspection.push(await client.inspection(id)); } catch (e) { out.inspection.push({ error: e.code }); }
      try { out.record.push(await client.record(id)); } catch (e) { out.record.push({ error: e.code }); }
    }
    save('inspection.json', out.inspection.filter((x) => !x.error).slice(0, 2));
    save('record.json', out.record.filter((x) => !x.error).slice(0, 2));
    return {
      inspectionOk: out.inspection.filter((x) => !x.error).length,
      inspectionErrors: out.inspection.filter((x) => x.error).map((x) => x.error),
      inspectionFields: [...new Set(out.inspection.flatMap((x) => keysOf(x)))],
      inspectionImagesPerReport: out.inspection.filter((x) => !x.error).map((x) => (x.images || []).length),
      recordOk: out.record.filter((x) => !x.error).length,
      recordErrors: out.record.filter((x) => x.error).map((x) => x.error),
      recordFields: [...new Set(out.record.flatMap((x) => keysOf(x)))],
    };
  });

  await step('change_feed', async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const res = await client.changes({ since, limit: 2000, lang: 'en' });
    const lists = ['added', 'updated', 'reappeared', 'removed'];
    save('changes.json', Object.fromEntries(Object.entries(res).map(([k, v]) => [k, Array.isArray(v) ? v.slice(0, 5) : v])));
    return {
      topLevelFields: keysOf(res),
      counts: Object.fromEntries(lists.map((k) => [k, (res[k] || []).length])),
      hasMore: res.hasMore ?? res.truncated ?? null,
      nextCursor: res.nextCursor ?? null,
      addedItemFields: keysOf((res.added || [])[0]),
      updatedItemFields: keysOf((res.updated || [])[0]),
      updatedChangedFieldsSeen: [...new Set((res.updated || []).flatMap((u) => u.changedFields || []))],
      removedItemShape: typeof (res.removed || [])[0] === 'object' ? keysOf(res.removed[0]) : typeof (res.removed || [])[0],
      note: 'Counts cover the last 24 hours, capped at 2000 events.',
    };
  });

  await step('export_header', async () => {
    const res = await client.exportCsv();
    const generatedAt = res.headers.get('x-encarapi-generated-at');
    const contentLength = Number(res.headers.get('content-length')) || null;
    let head = '';
    let got = 0;
    // The body is a counted async stream; leaving the loop early cancels the download,
    // so a spike never fetches the whole file.
    for await (const value of res.body) {
      got += value.length;
      head += Buffer.from(value).toString('utf8');
      if (head.includes('\n') || got >= 64 * 1024) break;
    }
    const header = head.split('\n')[0].replace(/\r$/, '');
    return { generatedAt, contentLength, contentEncoding: res.headers.get('content-encoding'), columns: header.split(',').map((c) => c.replace(/^"|"$/g, '')) };
  });

  report.provider_usage = { requests, megabytesUsedByThisSpike: +(bytes / 1048576).toFixed(2) };
  const text = JSON.stringify(report, null, 2);
  if (OUT) { fs.writeFileSync(OUT, text); console.log(`\nReport written to ${OUT}`); }
  else console.log(`\n${text}`);
}

main().catch((e) => { console.error('Spike failed:', e instanceof EncarError ? `${e.code}: ${e.message}` : e.message); process.exit(1); });
