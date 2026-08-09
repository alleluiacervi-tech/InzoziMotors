const PDFDocument = require('pdfkit');
const { FONTS, assertFontsPresent } = require('./fonts');
const { CLAUSES, DECLARATION, INTERMEDIARY_NOTE } = require('./clauses');
const { formatMoney, moneyInWords, formatLongDate } = require('./format');

// A4 sale-agreement renderer.
//
// LAYOUT CONTRACT (each rule exists because breaking it produced a real defect
// in the prototype):
//
//   • MEASURE, THEN DRAW. Every row is sized with heightOfString at exactly the
//     width it will be drawn at, using one width variable for both. Measuring at
//     one width and rendering at another silently overlaps the next section.
//   • NEVER TRUNCATE. Long values wrap and grow their row. Nothing is clipped,
//     because a clipped name in a contract is a wrong name.
//   • SIGNATURE BLOCKS ARE MEASURED AND KEPT TOGETHER. Their height depends on
//     how far the parties' names wrap; a fixed height let a 76-character name
//     collide with the ID label underneath. The whole section is measured first
//     and pushed to a fresh page rather than split.
//   • THE FOOTER ZEROES margins.bottom. Writing below the bottom margin makes
//     pdfkit silently append pages — this is how a 2-page contract became 6.

const PAGE = { size: 'A4', margin: 52 };
const C = {
  red: '#CC050F', ink: '#1B1313', body: '#423737', muted: '#7A6E6E',
  rule: '#E8E3E3', ruleSoft: '#F0EDED', sigRule: '#9C9090',
};

class ContractRenderer {
  constructor(snapshot, opts = {}) {
    this.s = snapshot;
    this.watermark = opts.watermark !== false;
    this.doc = new PDFDocument({ ...PAGE, bufferPages: true, autoFirstPage: false,
      info: {
        Title: `Vehicle Sale Agreement ${snapshot.contract_number}`,
        Author: 'Sawa Cars Ltd',
        Subject: `Sale of ${snapshot.vehicle.year} ${snapshot.vehicle.make} ${snapshot.vehicle.model}`,
        Keywords: snapshot.contract_number,
      },
    });
    this.M = PAGE.margin;
    this.doc.addPage();
    this.W = this.doc.page.width - this.M * 2;
    const d = this.doc;
    d.registerFont('brand', FONTS.brand);
    d.registerFont('brandHeavy', FONTS.brandHeavy);
    d.registerFont('brandBody', FONTS.brandBody);
    d.registerFont('body', FONTS.body);
    d.registerFont('bodyBold', FONTS.bodyBold);
  }

  get bottomLimit() { return this.doc.page.height - this.M - 18; }

  /** Start a new page if `need` points won't fit. */
  ensure(need) {
    if (this.doc.y + need > this.bottomLimit) {
      this.doc.addPage();
      this.doc.y = this.M;
    }
  }

  // ── letterhead ─────────────────────────────────────────────────────────────
  letterhead() {
    const d = this.doc, M = this.M, W = this.W;
    const co = this.s.company;
    d.font('brandHeavy').fontSize(23).fillColor(C.red)
      .text('SAWA', M, M, { characterSpacing: -0.6, lineBreak: false });
    d.font('brandBody').fontSize(7.5).fillColor(C.muted)
      .text('DRIVEN BY TRUST', M + 2, M + 26, { characterSpacing: 1.6, lineBreak: false });

    d.font('brandBody').fontSize(8).fillColor(C.muted);
    const right = [
      `${co.legal_name}${co.tin ? ` · TIN ${co.tin}` : ''}`,
      co.address,
      [co.website, co.phone].filter(Boolean).join(' · '),
    ].filter(Boolean);
    right.forEach((line, i) => {
      d.text(line, M + W - 260, M + 1 + i * 10.5, { width: 260, align: 'right', lineBreak: false });
    });

    d.moveTo(M, M + 44).lineTo(M + W, M + 44).lineWidth(1.6).strokeColor(C.red).stroke();
    d.y = M + 62;
    d.x = M;
  }

  // ── title + the three-cell identity band ───────────────────────────────────
  titleBand() {
    const d = this.doc, M = this.M, W = this.W;
    d.x = M;
    d.font('brandHeavy').fontSize(16).fillColor(C.ink)
      .text('VEHICLE SALE AGREEMENT', M, d.y, { width: W, align: 'center', characterSpacing: 0.3 });
    d.font('brandBody').fontSize(8.5).fillColor(C.muted)
      .text('AMASEZERANO Y’UBUGURIZI BW’IKINYABIZIGA', M, d.y + 3, { width: W, align: 'center', characterSpacing: 0.6 });

    const y = d.y + 12, h = 30, cw = W / 3;
    d.roundedRect(M, y, W, h, 4).lineWidth(0.8).strokeColor(C.rule).stroke();
    const cells = [
      ['CONTRACT No.', this.s.contract_number],
      ['DATE OF ISSUE', formatLongDate(this.s.issued_on)],
      ['HANDOVER', this.s.terms.handover_display || '—'],
    ];
    cells.forEach(([k, v], i) => {
      const x = M + i * cw + 10;
      d.font('brandBody').fontSize(6.4).fillColor(C.muted)
        .text(k, x, y + 6.5, { width: cw - 16, characterSpacing: 0.8, lineBreak: false });
      d.font('brand').fontSize(9).fillColor(i === 0 ? C.red : C.ink)
        .text(String(v), x, y + 15, { width: cw - 16, lineBreak: false, ellipsis: false });
      if (i) d.moveTo(M + i * cw, y + 5).lineTo(M + i * cw, y + h - 5).lineWidth(0.6).strokeColor(C.rule).stroke();
    });
    d.y = y + h + 14;
  }

  section(n, title) {
    const d = this.doc;
    this.ensure(52);
    const y = d.y;
    d.rect(this.M, y, 3, 11).fillColor(C.red).fill();
    d.font('brand').fontSize(9.5).fillColor(C.ink)
      .text(`${n}.  ${title}`, this.M + 9, y + 0.5, { characterSpacing: 0.4, lineBreak: false });
    d.y = y + 17;
    d.x = this.M;
  }

  /**
   * Two-column labelled rows. A row whose key starts with '@' spans full width —
   * used for values (declared condition, price in words) that would look cramped
   * in half.
   */
  rows(pairs) {
    const d = this.doc, M = this.M, W = this.W, pad = 8;
    let i = 0;
    while (i < pairs.length) {
      let slice = pairs.slice(i, i + 2);
      let span = false;
      if (String(slice[0][0]).startsWith('@')) {
        slice = [[slice[0][0].slice(1), slice[0][1]]];
        span = true;
      }
      const eff = span ? 1 : slice.length;
      const cw = W / (span ? 1 : 2);      // ONE width for measure and draw
      const tw = cw - pad * 2;

      d.font('body').fontSize(9);
      let h = 0;
      for (const [, v] of slice) {
        h = Math.max(h, 11 + d.heightOfString(this.val(v), { width: tw }));
      }
      this.ensure(h + 9);
      const y = d.y;
      slice.forEach(([k, v], c) => {
        const x = M + c * cw;
        d.font('brandBody').fontSize(6.4).fillColor(C.muted)
          .text(String(k).toUpperCase(), x + pad, y + 1, { width: tw, characterSpacing: 0.7 });
        d.font('body').fontSize(9).fillColor(C.ink)
          .text(this.val(v), x + pad, y + 10, { width: tw });
      });
      d.moveTo(M, y + h + 4).lineTo(M + W, y + h + 4).lineWidth(0.5).strokeColor(C.ruleSoft).stroke();
      d.y = y + h + 9;
      d.x = M;
      i += eff;
    }
    d.y += 3;
  }

  val(v) { return v == null || v === '' ? '—' : String(v); }

  paragraph(text, size = 8.4) {
    const d = this.doc;
    const need = d.heightOfString(text, { width: this.W }) + 6;
    this.ensure(need);
    d.font('body').fontSize(size).fillColor(C.body)
      .text(text, this.M, d.y, { width: this.W, align: 'justify', lineGap: 1.4 });
    d.y += 10;
    d.x = this.M;
  }

  clause(n, text) {
    const d = this.doc;
    const tw = this.W - 16;
    d.font('body').fontSize(8.4);
    const need = d.heightOfString(text, { width: tw }) + 6;
    this.ensure(need);
    const y = d.y;
    d.font('brand').fontSize(8.2).fillColor(C.red).text(n, this.M, y + 0.5, { width: 14, lineBreak: false });
    d.font('body').fontSize(8.4).fillColor(C.body)
      .text(text, this.M + 16, y, { width: tw, align: 'justify', lineGap: 1.4 });
    d.y += 5;
    d.x = this.M;
  }

  // ── signature blocks ───────────────────────────────────────────────────────
  // Heights are derived from the wrapped name, and the whole section is kept
  // together. This is the fix for the prototype's collision bug.
  signatures() {
    const d = this.doc, M = this.M, W = this.W;
    const blocks = [
      ['FOR SAWA CARS LTD', this.s.sawa.officer_name, `Staff ID ${this.s.sawa.officer_id}`],
      ['THE SELLER', this.s.seller.legal_name, this.idLabel(this.s.seller)],
      ['THE BUYER', this.s.buyer.legal_name, this.idLabel(this.s.buyer)],
    ];
    const nameW = W * 0.46 - 20;

    const measure = (name, idText) => {
      d.font('body').fontSize(8.6);
      const nameH = d.heightOfString(name, { width: nameW });
      const idH = d.heightOfString(idText, { width: nameW });
      // 23pt of chrome above the name, 8pt gap, 8pt label, 12pt tail padding.
      return Math.max(58, 23 + nameH + 8 + 8 + idH + 12);
    };
    const heights = blocks.map(([, n, i]) => measure(n, i));
    const gap = 10;
    const total = 17 + heights.reduce((a, b) => a + b + gap, 0);

    // Keep the heading and all three blocks on one page — a signature block
    // split across a page break invalidates the page it starts on.
    if (d.y + total > this.bottomLimit) { d.addPage(); d.y = M; }
    this.section(6, 'SIGNATURES');

    blocks.forEach(([role, name, idText], bi) => {
      const bh = heights[bi];
      const y = d.y;
      d.roundedRect(M, y, W, bh, 4).lineWidth(0.8).strokeColor(C.rule).stroke();
      d.font('brand').fontSize(7.4).fillColor(C.red)
        .text(role, M + 10, y + 8, { characterSpacing: 0.8, lineBreak: false });

      d.font('brandBody').fontSize(6.2).fillColor(C.muted)
        .text('FULL NAME', M + 10, y + 23, { characterSpacing: 0.7, lineBreak: false });
      d.font('body').fontSize(8.6).fillColor(C.ink)
        .text(name, M + 10, y + 31, { width: nameW });
      const afterName = d.y;
      d.font('brandBody').fontSize(6.2).fillColor(C.muted)
        .text('ID / PASSPORT', M + 10, afterName + 4, { characterSpacing: 0.7, lineBreak: false });
      d.font('body').fontSize(8.6).fillColor(C.ink)
        .text(idText, M + 10, afterName + 12, { width: nameW });

      // Signature and date rules sit on a baseline near the block's foot,
      // independent of how far the name wrapped.
      const ruleY = y + bh - 26;
      const sx = M + W * 0.52;
      const sw = W * 0.27;
      d.moveTo(sx, ruleY).lineTo(sx + sw, ruleY).lineWidth(0.9).strokeColor(C.sigRule).stroke();
      d.font('brandBody').fontSize(6.2).fillColor(C.muted)
        .text('SIGNATURE', sx, ruleY + 4, { characterSpacing: 0.7, lineBreak: false });
      const dx = sx + sw + 14;
      d.moveTo(dx, ruleY).lineTo(M + W - 10, ruleY).lineWidth(0.9).strokeColor(C.sigRule).stroke();
      d.font('brandBody').fontSize(6.2).fillColor(C.muted)
        .text('DATE', dx, ruleY + 4, { characterSpacing: 0.7, lineBreak: false });

      d.y = y + bh + gap;
      d.x = M;
    });
  }

  idLabel(party) {
    const kind = { national_id: 'National ID', passport: 'Passport', driving_licence: 'Driving licence' }[party.id_type] || 'ID';
    return `${kind} ${party.id_number}`;
  }

  // ── per-page furniture ─────────────────────────────────────────────────────
  decorate() {
    const d = this.doc;
    const range = d.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      d.switchToPage(range.start + i);
      // Without this, writing in the footer band appends blank pages.
      d.page.margins.bottom = 0;

      if (this.watermark) this.stampDraft();

      const fy = d.page.height - this.M + 14;
      d.moveTo(this.M, fy - 8).lineTo(this.M + this.W, fy - 8).lineWidth(0.5).strokeColor(C.rule).stroke();
      d.font('brandBody').fontSize(6.8).fillColor(C.muted)
        .text(`${this.s.contract_number} · Vehicle Sale Agreement · ${this.s.company.legal_name}`,
          this.M, fy, { width: this.W * 0.72, lineBreak: false });
      d.font('brandBody').fontSize(6.8).fillColor(C.muted)
        .text(`Page ${i + 1} of ${range.count}`, this.M + this.W - 110, fy, { width: 110, align: 'right', lineBreak: false });
    }
  }

  // Until a Rwandan advocate signs the clauses off, every copy says so on its
  // face. Turned off by CONTRACT_DRAFT_MODE=false once reviewed.
  stampDraft() {
    const d = this.doc;
    d.save();
    d.rotate(-38, { origin: [d.page.width / 2, d.page.height / 2] });
    d.font('brandHeavy').fontSize(46).fillColor(C.red).fillOpacity(0.09)
      .text('DRAFT — NOT FOR SIGNATURE', 0, d.page.height / 2 - 26,
        { width: d.page.width, align: 'center', lineBreak: false });
    d.restore();
    d.fillOpacity(1);
  }

  build() {
    assertFontsPresent();
    const s = this.s;
    const cur = s.terms.currency;

    this.letterhead();
    this.titleBand();

    this.section(1, 'PARTIES TO THIS AGREEMENT');
    this.rows([
      ['Seller (full legal name)', s.seller.legal_name],
      ['Buyer (full legal name)', s.buyer.legal_name],
      [`Seller ${this.docWord(s.seller)}`, s.seller.id_number],
      [`Buyer ${this.docWord(s.buyer)}`, s.buyer.id_number],
      ['Seller telephone', s.seller.phone],
      ['Buyer telephone', s.buyer.phone],
      ['Seller address', this.addr(s.seller)],
      ['Buyer address', this.addr(s.buyer)],
    ]);
    this.doc.font('body').fontSize(7.6).fillColor(C.muted)
      .text(INTERMEDIARY_NOTE(s.company.legal_name), this.M, this.doc.y, { width: this.W, lineGap: 1.2 });
    this.doc.y += 12;
    this.doc.x = this.M;

    this.section(2, 'VEHICLE');
    this.rows([
      ['Make', s.vehicle.make],
      ['Model', s.vehicle.model],
      ['Year of manufacture', s.vehicle.year],
      ['Chassis / VIN', s.vehicle.vin],
      ['Registration plate', s.vehicle.plate],
      ['Odometer at handover', `${Number(s.vehicle.mileage_km).toLocaleString('en-US')} km`],
      ['Fuel', s.vehicle.fuel],
      ['Transmission', s.vehicle.transmission],
      ['Colour', s.vehicle.colour],
      ['Inspection', s.vehicle.inspection_summary],
      ['@Declared condition', s.vehicle.condition],
    ]);

    this.section(3, 'SALE TERMS');
    this.rows([
      ['Agreed price', formatMoney(s.terms.price_minor, cur)],
      ['Currency', cur],
      ['@Price in words', moneyInWords(s.terms.price_minor, cur)],
      ['Payment method', s.terms.payment_method],
      ['Deposit paid', s.terms.deposit_minor ? formatMoney(s.terms.deposit_minor, cur) : 'None'],
      ['Balance due', s.terms.balance_minor > 0
        ? `${formatMoney(s.terms.balance_minor, cur)}${s.terms.balance_due_on ? ` by ${formatLongDate(s.terms.balance_due_on)}` : ''}`
        : 'Paid in full'],
      ['Handover date', formatLongDate(s.terms.handover_on)],
      ['Handover centre', s.terms.handover_center],
    ]);

    this.section(4, 'TERMS AND CONDITIONS');
    for (const [n, text] of CLAUSES(s)) this.clause(n, text);

    this.section(5, 'DECLARATIONS');
    this.paragraph(DECLARATION);

    this.signatures();
    this.decorate();
    // Read the count BEFORE end(): pdfkit flushes its buffered page range while
    // finalising, so afterwards bufferedPageRange().count is 0.
    this.pageCount = this.doc.bufferedPageRange().count;
    this.doc.end();
    return this.doc;
  }

  docWord(p) {
    return p.id_type === 'passport' ? 'passport number'
      : p.id_type === 'driving_licence' ? 'driving licence number'
      : 'national ID number';
  }

  addr(p) {
    return [p.address_line, p.cell, p.sector, p.district].filter(Boolean).join(', ');
  }
}

/** Renders to a Buffer. Rejects if any layout step throws. */
function renderContractPDF(snapshot, opts = {}) {
  return new Promise((resolve, reject) => {
    let renderer, doc;
    try {
      renderer = new ContractRenderer(snapshot, opts);
      doc = renderer.build();
    } catch (err) { return reject(err); }
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('error', reject);
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), pageCount: renderer.pageCount }));
  });
}

module.exports = { renderContractPDF };
