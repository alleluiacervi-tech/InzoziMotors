// ─────────────────────────────────────────────────────────────────────────────
// Internal PDFs for the admin console: the monthly revenue statement and the
// business report. Rendered on demand, never stored, never emailed — there is
// no scheduler (CLAUDE.md), so "the weekly report" is this document for the
// last seven days, produced when an operator asks for it.
//
// The statement is a reconciliation document. Its total is the sum of the
// ledger printed beneath it, the ledger is exactly the rows GET /admin/revenue
// counts (platform_fees paid, dated by collection; rental subscriptions not
// voided), and the page says so. It is Sawa's own service income — never a
// vehicle's price: Sawa is not a party to any sale.
//
// Letterhead, fonts and colours follow lib/documents/import-documents.js so
// every PDF Sawa produces looks like one company made it.
// ─────────────────────────────────────────────────────────────────────────────
const PDFDocument = require('pdfkit');
const { FONTS, assertFontsPresent } = require('../contract/fonts');

const COMPANY = {
  legal_name: process.env.COMPANY_LEGAL_NAME || 'Sawa Cars Ltd',
  tin: process.env.COMPANY_TIN || null,
  address: process.env.COMPANY_ADDRESS || 'Nyarutarama, Kigali, Rwanda',
  website: process.env.COMPANY_WEBSITE || 'sawacars.com',
};

// A fall is amber, not red: red is the brand's action colour and the console's
// breach colour, and a quieter month is neither.
const C = { red: '#CC050F', ink: '#1B1313', muted: '#6B6161', line: '#E8E3E3', pale: '#F7F5F5', good: '#166534', bad: '#8A5300' };

const LINE_LABEL = {
  inspection: 'Walk-in inspections',
  report: 'Report resale',
  rental_subscription: 'Rental listing subscriptions',
  featured: 'Sponsored placement',
  rental: 'Rental fees (legacy)',
  commission: 'Commission (retired)',
  certification: 'Certification (retired)',
};
const METHOD_LABEL = { cash: 'Cash', mobile_money: 'Mobile money', bank_transfer: 'Bank transfer', unrecorded: 'Not recorded' };

const rwf = (n) => `RWF ${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(Number(n || 0))}`;
const int = (n) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(Number(n || 0));
const longDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const stamp = (d = new Date()) => d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kigali' });

/**
 * A small layout kit over pdfkit: letterhead, headings, key figures and
 * ruled tables that break across pages with their header repeated.
 */
function createDoc({ title, subtitle, reference, info }) {
  assertFontsPresent();
  const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, autoFirstPage: false, info });
  doc.registerFont('brand', FONTS.brand).registerFont('heavy', FONTS.brandHeavy)
    .registerFont('body', FONTS.body).registerFont('bold', FONTS.bodyBold);
  const margin = 48;
  const width = 595.28 - margin * 2;
  const bottom = 841.89 - 58;

  const letterhead = () => {
    doc.addPage();
    doc.font('heavy').fontSize(21).fillColor(C.red).text('SAWA', margin, margin, { lineBreak: false });
    doc.font('body').fontSize(7).fillColor(C.muted).text('INTERNAL · NOT FOR CIRCULATION', margin + 2, margin + 25, { characterSpacing: 1.1, lineBreak: false });
    doc.font('body').fontSize(8).fillColor(C.muted).text(COMPANY.website, margin + 235, margin + 2, { width: width - 235, align: 'right' });
    doc.font('body').fontSize(7).text(reference, margin + 235, margin + 15, { width: width - 235, align: 'right' });
    doc.moveTo(margin, margin + 43).lineTo(margin + width, margin + 43).lineWidth(1.5).strokeColor(C.red).stroke();
    doc.x = margin;
    doc.y = margin + 61;
  };
  const ensure = (h) => { if (doc.y + h > bottom) letterhead(); };

  letterhead();
  doc.font('heavy').fontSize(18).fillColor(C.ink).text(title, margin, doc.y, { width });
  doc.font('body').fontSize(8.5).fillColor(C.muted).text(subtitle, { width });
  doc.moveDown(1.2);

  const kit = {
    doc, margin, width,
    heading(text, note) {
      // Room for the heading, a table header and two rows, so a heading is
      // never stranded at the foot of a page.
      ensure(88);
      doc.moveDown(0.6);
      doc.font('brand').fontSize(10.5).fillColor(C.ink).text(text, margin, doc.y, { width });
      if (note) doc.font('body').fontSize(7.5).fillColor(C.muted).text(note, { width });
      doc.moveDown(0.45);
    },
    /** A row of headline figures: [{ label, value, sub }]. */
    figures(items) {
      ensure(62);
      const y = doc.y;
      const w = width / items.length;
      doc.roundedRect(margin, y, width, 54, 6).fillColor(C.pale).fill();
      items.forEach((it, i) => {
        const x = margin + i * w + 12;
        doc.font('body').fontSize(7).fillColor(C.muted).text(it.label, x, y + 9, { width: w - 18 });
        doc.font('heavy').fontSize(it.big ? 15 : 13).fillColor(it.tone === 'money' ? C.red : C.ink).text(it.value, x, y + 20, { width: w - 18, lineBreak: false });
        if (it.sub) doc.font('body').fontSize(6.8).fillColor(it.subTone === 'good' ? C.good : it.subTone === 'bad' ? C.bad : C.muted).text(it.sub, x, y + 39, { width: w - 18, lineBreak: false });
      });
      doc.x = margin;
      doc.y = y + 66;
    },
    /**
     * cols: [{ header, width (fraction), align }]; rows: string[][].
     * `total` (optional) is drawn as a bold closing row.
     */
    table(cols, rows, { total, empty = 'Nothing recorded in this period.' } = {}) {
      const widths = cols.map((c) => c.width * width);
      const drawHeader = () => {
        ensure(24);
        const y = doc.y;
        let x = margin;
        cols.forEach((c, i) => {
          doc.font('bold').fontSize(7).fillColor(C.muted).text(c.header, x + 4, y, { width: widths[i] - 8, align: c.align || 'left', lineBreak: false });
          x += widths[i];
        });
        doc.moveTo(margin, y + 12).lineTo(margin + width, y + 12).lineWidth(0.8).strokeColor(C.ink).stroke();
        doc.y = y + 17;
      };
      const drawRow = (cells, bold) => {
        const heights = cells.map((cell, i) => doc.font(bold ? 'bold' : 'body').fontSize(8).heightOfString(String(cell ?? '—'), { width: widths[i] - 8 }));
        const h = Math.max(11, ...heights);
        if (doc.y + h + 8 > bottom) { letterhead(); drawHeader(); }
        const y = doc.y;
        let x = margin;
        cells.forEach((cell, i) => {
          doc.font(bold ? 'bold' : 'body').fontSize(8).fillColor(C.ink).text(String(cell ?? '—'), x + 4, y, { width: widths[i] - 8, align: cols[i].align || 'left' });
          x += widths[i];
        });
        doc.moveTo(margin, y + h + 4).lineTo(margin + width, y + h + 4).lineWidth(bold ? 0.8 : 0.4).strokeColor(bold ? C.ink : C.line).stroke();
        doc.y = y + h + 8;
      };
      drawHeader();
      if (!rows.length) {
        doc.font('body').fontSize(8).fillColor(C.muted).text(empty, margin + 4, doc.y, { width: width - 8 });
        doc.moveDown(0.6);
      }
      rows.forEach((r) => drawRow(r, false));
      if (total && rows.length) drawRow(total, true);
      doc.x = margin;
      doc.moveDown(0.3);
    },
    paragraph(text) {
      doc.font('body').fontSize(7.8);
      ensure(doc.heightOfString(text, { width, lineGap: 2 }) + 4);
      doc.fillColor(C.muted).text(text, margin, doc.y, { width, lineGap: 2 });
      doc.moveDown(0.5);
    },
    finish() {
      return new Promise((resolve, reject) => {
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('error', reject);
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i += 1) {
          doc.switchToPage(range.start + i);
          // The folio sits inside the bottom margin; without this pdfkit
          // would treat it as overflow and add a blank page per page.
          doc.page.margins.bottom = 0;
          doc.font('body').fontSize(7).fillColor(C.muted)
            .text(`${COMPANY.legal_name} · ${reference} · Page ${i + 1} of ${range.count}`, margin, 841.89 - 34, { width, align: 'center', lineBreak: false });
        }
        doc.end();
      });
    },
  };
  return kit;
}

const change = (cur, prev) => {
  if (cur == null || prev == null) return null;
  if (prev === 0) return cur === 0 ? { text: 'No change', tone: null } : { text: 'New this period', tone: null };
  const p = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  if (p === 0) return { text: 'No change', tone: null };
  return { text: `${p > 0 ? '+' : '−'}${Math.abs(p)}% vs previous`, tone: p > 0 ? 'good' : 'bad' };
};

/**
 * @param {object} data { month, range, generated_by, ledger[], totals }
 */
async function renderRevenueStatement(data) {
  const { range } = data;
  const monthName = new Date(`${range.from}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const reference = `REV-${data.month}`;
  const kit = createDoc({
    title: `Revenue statement · ${monthName}`,
    subtitle: `${longDate(range.from)} to ${longDate(range.to)}, Kigali time. Generated ${stamp()} by ${data.generated_by}.`,
    reference,
    info: { Title: `Sawa revenue statement ${data.month}`, Author: COMPANY.legal_name },
  });

  const total = data.ledger.reduce((n, r) => n + r.amount, 0);
  const prev = data.previous_total;
  const delta = change(total, prev);
  kit.figures([
    { label: 'Collected this month', value: rwf(total), tone: 'money', big: true, sub: delta?.text, subTone: delta?.tone },
    { label: 'Entries', value: int(data.ledger.length) },
    { label: 'Previous month', value: rwf(prev) },
  ]);

  const group = (keyFn, labelFn) => {
    const m = new Map();
    for (const r of data.ledger) {
      const k = keyFn(r);
      const cur = m.get(k) || { key: k, count: 0, amount: 0 };
      cur.count += 1; cur.amount += r.amount;
      m.set(k, cur);
    }
    return [...m.values()].sort((a, b) => b.amount - a.amount).map((g) => [labelFn(g.key), int(g.count), rwf(g.amount), total ? `${Math.round((g.amount / total) * 100)}%` : '—']);
  };
  const summaryCols = [
    { header: 'Line', width: 0.46 }, { header: 'Entries', width: 0.14, align: 'right' },
    { header: 'Amount', width: 0.26, align: 'right' }, { header: 'Share', width: 0.14, align: 'right' },
  ];
  const totalRow = ['Total', int(data.ledger.length), rwf(total), total ? '100%' : '—'];

  kit.heading('By revenue line');
  kit.table(summaryCols, group((r) => r.line, (k) => LINE_LABEL[k] || k), { total: totalRow });
  kit.heading('By payment method');
  kit.table([{ ...summaryCols[0], header: 'Method' }, ...summaryCols.slice(1)], group((r) => r.method || 'unrecorded', (k) => METHOD_LABEL[k] || k), { total: totalRow });
  kit.heading('By inspection center', 'Fees tied to an inspection. Subscriptions and other lines are not center revenue.');
  const centerRows = data.ledger.filter((r) => r.center);
  const centerTotal = centerRows.reduce((n, r) => n + r.amount, 0);
  const byCenter = new Map();
  for (const r of centerRows) {
    const cur = byCenter.get(r.center) || { count: 0, amount: 0 };
    cur.count += 1; cur.amount += r.amount; byCenter.set(r.center, cur);
  }
  kit.table([{ ...summaryCols[0], header: 'Center' }, ...summaryCols.slice(1)],
    [...byCenter.entries()].sort((a, b) => b[1].amount - a[1].amount)
      .map(([k, g]) => [k, int(g.count), rwf(g.amount), centerTotal ? `${Math.round((g.amount / centerTotal) * 100)}%` : '—']),
    { total: ['Center total', int(centerRows.length), rwf(centerTotal), centerTotal ? '100%' : '—'] });

  kit.heading('Ledger', 'Every entry counted above, in the order it was collected.');
  kit.table([
    { header: 'Collected', width: 0.17 }, { header: 'Line', width: 0.22 }, { header: 'Method', width: 0.14 },
    { header: 'Center', width: 0.17 }, { header: 'Reference', width: 0.13 }, { header: 'Amount', width: 0.17, align: 'right' },
  ], data.ledger.map((r) => [r.collected_at, LINE_LABEL[r.line] || r.line, METHOD_LABEL[r.method || 'unrecorded'] || r.method, r.center || '—', r.reference || '—', rwf(r.amount)]),
  { total: ['Total', '', '', '', '', rwf(total)], empty: 'No revenue was collected this month.' });

  if (data.excluded_non_rwf > 0) {
    kit.paragraph(`${data.excluded_non_rwf} paid entr${data.excluded_non_rwf === 1 ? 'y' : 'ies'} recorded in a currency other than RWF ${data.excluded_non_rwf === 1 ? 'is' : 'are'} not included. Sawa's books are kept in Rwandan francs; correct the entry's currency in the console to bring it in.`);
  }
  kit.paragraph('Reconciliation: this statement lists every platform fee with status paid, dated by its collection time (or its creation time where no collection time was recorded), and every rental subscription that has not been voided, dated by when it was recorded. Waived and voided entries are excluded. The same rule drives the Revenue page and the Insights overview, so the three always agree.');
  kit.paragraph('These are Sawa Cars\' own service fees. They are never the price of a vehicle: Sawa is not a party to any sale, rental or import payment between users.');
  return kit.finish();
}

/**
 * @param {object} data { range, generated_by, overview, funnels, quality, centers }
 */
async function renderBusinessReport(data) {
  const { range, overview, funnels, quality, centers } = data;
  const reference = `BIZ-${range.from}-${range.to}`;
  const kit = createDoc({
    title: 'Business report',
    subtitle: `${longDate(range.from)} to ${longDate(range.to)} (${range.days} day${range.days === 1 ? '' : 's'}), compared with the ${range.days} days before. Kigali time. Generated ${stamp()} by ${data.generated_by}.`,
    reference,
    info: { Title: `Sawa business report ${range.from} to ${range.to}`, Author: COMPANY.legal_name },
  });

  const cur = overview.kpis.current;
  const prev = overview.kpis.previous;
  const fig = (label, key, fmt = int, opts = {}) => {
    const d = change(cur[key], prev[key]);
    return { label, value: cur[key] == null ? '—' : fmt(cur[key]), sub: d?.text, subTone: d?.tone, ...opts };
  };
  kit.figures([
    fig('Revenue collected', 'revenue_rwf', rwf, { tone: 'money', big: true }),
    fig('Listings published', 'published'),
    fig('Contact requests', 'contacts'),
    fig('Inspections completed', 'inspections_completed'),
  ]);

  const pctText = (v) => (v == null ? '—' : `${v}%`);
  const rows = [
    ['Supply', 'Submissions received', int(cur.submissions), int(prev.submissions)],
    ['', 'Submissions reviewed', int(cur.reviewed), int(prev.reviewed)],
    ['', 'Reviewed within 24 hours', pctText(cur.review_sla_rate), pctText(prev.review_sla_rate)],
    ['', 'Inspections completed', int(cur.inspections_completed), int(prev.inspections_completed)],
    ['', 'Inspection pass rate', pctText(cur.pass_rate), pctText(prev.pass_rate)],
    ['', 'Listings published', int(cur.published), int(prev.published)],
    ['', 'Median days, submission to live', cur.median_days_to_live ?? '—', prev.median_days_to_live ?? '—'],
    ['', 'Listings marked sold', int(cur.marked_sold), int(prev.marked_sold)],
    ['Demand', 'New buyers', int(cur.new_buyers), int(prev.new_buyers)],
    ['', 'New sellers', int(cur.new_sellers), int(prev.new_sellers)],
    ['', 'Saves', int(cur.saves), int(prev.saves)],
    ['', 'Contact requests', int(cur.contacts), int(prev.contacts)],
    ['', 'Rental inquiries', int(cur.rental_inquiries), int(prev.rental_inquiries)],
    ['', 'Import enquiries', int(cur.import_enquiries), int(prev.import_enquiries)],
    ['Money', 'Revenue collected', rwf(cur.revenue_rwf), rwf(prev.revenue_rwf)],
  ];
  kit.heading('This period and the one before');
  kit.table([
    { header: 'Area', width: 0.14 }, { header: 'Measure', width: 0.46 },
    { header: 'This period', width: 0.2, align: 'right' }, { header: 'Previous', width: 0.2, align: 'right' },
  ], rows);

  const s = overview.snapshot;
  kit.heading('Right now', `Live counts at ${stamp()}, not limited to the period.`);
  kit.table([{ header: 'Measure', width: 0.7 }, { header: 'Count', width: 0.3, align: 'right' }], [
    ['Live listings', int(s.live_inventory)],
    ['Submissions awaiting review', int(s.awaiting_review)],
    ['… of which waiting more than 24 hours', int(s.reviews_breached)],
    ['Identity checks waiting', int(s.identity_queue)],
    ['Reported conversations open', int(s.open_reports)],
  ]);

  kit.heading('Seller funnel', 'Submissions received in the period, and how far each has got by today.');
  kit.table([
    { header: 'Stage', width: 0.34 }, { header: 'Reached', width: 0.13, align: 'right' },
    { header: 'Of submitted', width: 0.17, align: 'right' }, { header: 'Step conversion', width: 0.2, align: 'right' },
    { header: 'Median days', width: 0.16, align: 'right' },
  ], funnels.seller.steps.map((st) => [st.label, int(st.count), pctText(st.of_start), st.from_previous == null ? '—' : pctText(st.from_previous), st.median_days ?? '—']));

  kit.heading('Revenue by line');
  kit.table([{ header: 'Line', width: 0.7 }, { header: 'Collected', width: 0.3, align: 'right' }],
    overview.money.by_line.map((r) => [LINE_LABEL[r.key] || r.key, rwf(r.total)]),
    { total: ['Total', rwf(overview.money.by_line.reduce((n, r) => n + r.total, 0))] });

  kit.heading('Inspection quality', `${int(quality.completed)} completed, pass rate ${pctText(quality.pass_rate)}, average score ${quality.avg_score ?? '—'} of ${quality.score_max}.`);
  kit.table([{ header: 'Checklist item failing most', width: 0.6 }, { header: 'Category', width: 0.28 }, { header: 'Fails', width: 0.12, align: 'right' }],
    quality.top_issues.slice(0, 8).map((r) => [r.label, r.category || '—', int(r.fails)]),
    { empty: 'No failed checklist items in this period.' });

  kit.heading('Inspection centers');
  kit.table([
    { header: 'Center', width: 0.28 }, { header: 'Completed', width: 0.13, align: 'right' },
    { header: 'Pass rate', width: 0.12, align: 'right' }, { header: 'Utilisation', width: 0.14, align: 'right' },
    { header: 'No-shows', width: 0.12, align: 'right' }, { header: 'Revenue', width: 0.21, align: 'right' },
  ], centers.centers.map((c) => [c.center, int(c.completed), pctText(c.pass_rate), pctText(c.utilisation), int(c.no_shows), rwf(c.revenue_rwf)]));

  kit.paragraph('Definitions: revenue is money Sawa collected (paid platform fees and rental subscriptions not voided), never a vehicle\'s price. Funnels follow the submissions received in the period to the furthest stage each reached, so a step never exceeds the one before it. Utilisation is completed inspections over daily capacity × Monday–Saturday working days.');
  return kit.finish();
}

module.exports = { renderRevenueStatement, renderBusinessReport, LINE_LABEL, METHOD_LABEL };
