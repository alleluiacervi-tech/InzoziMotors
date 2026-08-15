const PDFDocument = require('pdfkit');
const pool = require('../../db');
const { FONTS, assertFontsPresent } = require('../contract/fonts');
const { issuePdf, DocumentError } = require('./service');

const COMPANY = {
  legal_name: process.env.COMPANY_LEGAL_NAME || 'Sawa Cars Ltd',
  tin: process.env.COMPANY_TIN || null,
  address: process.env.COMPANY_ADDRESS || 'Nyarutarama, Kigali, Rwanda',
  website: process.env.COMPANY_WEBSITE || 'sawacars.com',
  phone: process.env.COMPANY_PHONE || '+250 788 308 611',
  email: process.env.COMPANY_EMAIL || 'contact@sawacars.com',
};

const BANK = {
  name: process.env.IMPORT_BANK_NAME || 'Bank of Kigali',
  account_name: process.env.IMPORT_BANK_ACCOUNT_NAME || null,
  account_number: process.env.IMPORT_BANK_ACCOUNT_NUMBER || null,
};

const ORDER_SQL = `
  SELECT o.*, u.name AS buyer_name, u.email AS buyer_email, u.phone AS buyer_phone,
         a.id AS agreement_id, a.version AS agreement_version, a.terms_snapshot,
         a.issued_at AS agreement_issued_at, a.accepted_at AS agreement_accepted_at
    FROM import_orders o
    JOIN users u ON u.id=o.buyer_id
    JOIN import_agreements a ON a.import_order_id=o.id AND a.superseded_at IS NULL
   WHERE o.id=$1`;

const exactRwf = (value) => `RWF ${new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
const date = (value) => value ? new Date(value).toLocaleDateString('en-RW', { dateStyle: 'medium', timeZone: 'Africa/Kigali' }) : 'Not specified';

function normaliseItems(raw, total) {
  const items = Array.isArray(raw) ? raw.map((item) => ({
    label: String(item?.label || item?.description || item?.name || '').trim().slice(0, 180),
    amount_rwf: Number(item?.amount_rwf ?? item?.amount ?? 0),
  })).filter((item) => item.label && Number.isSafeInteger(item.amount_rwf) && item.amount_rwf >= 0) : [];
  return items.length ? items : [{ label: 'Complete landed vehicle import price', amount_rwf: Number(total) }];
}

async function snapshotForImport(orderId) {
  const { rows } = await pool.query(ORDER_SQL, [orderId]);
  if (!rows.length) throw new DocumentError('Issue a quotation before preparing its document pack', 409, 'QUOTE_REQUIRED');
  const row = rows[0];
  const terms = row.terms_snapshot || {};
  const total = Number(terms.quoted_total_rwf ?? row.quoted_total_rwf);
  if (!Number.isSafeInteger(total) || total < 100000) throw new DocumentError('The quotation has no valid RWF total', 409);
  return {
    company: COMPANY,
    bank: BANK,
    order: {
      id: row.id, order_ref: row.order_ref, origin_country: row.origin_country,
      make: row.make, model: row.model, year: row.year, vin: row.vin,
      supplier_reference: row.supplier_reference, specification: row.specification || {},
      quote_expires_at: terms.quote_expires_at || row.quote_expires_at,
      delivery_estimate: terms.delivery_estimate || row.delivery_estimate,
    },
    buyer: { id: row.buyer_id, name: row.buyer_name, email: row.buyer_email, phone: row.buyer_phone },
    agreement: {
      id: row.agreement_id, version: Number(row.agreement_version), issued_at: row.agreement_issued_at,
      accepted_at: row.agreement_accepted_at, terms: String(terms.terms || '').trim(),
    },
    money: {
      total_rwf: total,
      initial_payment_rwf: Number(terms.initial_payment_rwf ?? Math.floor(total / 2)),
      final_payment_rwf: Number(terms.final_payment_rwf ?? total - Math.floor(total / 2)),
      line_items: normaliseItems(terms.line_items, total),
    },
    generated_at: new Date().toISOString(),
  };
}

async function snapshotForReceipt(orderId, paymentId) {
  const order = await snapshotForImport(orderId);
  const { rows } = await pool.query(
    `SELECT id,milestone,amount_rwf,status,bank_reference,verified_at
       FROM import_payments WHERE id=$1 AND import_order_id=$2`, [paymentId, orderId]
  );
  if (!rows.length) throw new DocumentError('Payment not found', 404);
  if (rows[0].status !== 'verified') throw new DocumentError('Only a verified payment can have an official receipt', 409, 'PAYMENT_NOT_VERIFIED');
  return { ...order, payment: { ...rows[0], amount_rwf: Number(rows[0].amount_rwf) } };
}

function renderImportDocument(snapshot, record, type) {
  return new Promise((resolve, reject) => {
    try { assertFontsPresent(); } catch (error) { reject(error); return; }
    const titles = {
      quotation: ['IMPORT QUOTATION', 'Exact landed-price offer in Rwandan francs'],
      agreement: ['VEHICLE IMPORT SERVICE AGREEMENT', 'Versioned terms for sourcing and delivery to Kigali'],
      invoice: ['50% DEPOSIT INVOICE', 'Initial payment due after agreement acceptance'],
      receipt: ['OFFICIAL PAYMENT RECEIPT', 'Verified funds received for vehicle import'],
    };
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, autoFirstPage: false,
      info: { Title: `${titles[type][0]} — ${snapshot.order.order_ref}`, Author: snapshot.company.legal_name } });
    const chunks=[]; let pageCount=0;
    doc.on('data',(chunk)=>chunks.push(chunk)); doc.on('error',reject);
    doc.on('end',()=>resolve({ buffer:Buffer.concat(chunks), pageCount }));
    doc.registerFont('brand',FONTS.brand).registerFont('heavy',FONTS.brandHeavy).registerFont('body',FONTS.body).registerFont('bold',FONTS.bodyBold);
    const red='#CC050F', ink='#1B1313', muted='#746A6A', line='#E8E3E3', green='#166534', pale='#F7F5F5';
    const margin=48, width=499;
    const addPage=()=>{ doc.addPage(); pageCount+=1; doc.font('heavy').fontSize(21).fillColor(red).text('SAWA',margin,margin,{lineBreak:false}); doc.font('body').fontSize(7).fillColor(muted).text('DRIVEN BY TRUST',margin+2,margin+25,{characterSpacing:1.3,lineBreak:false}); doc.font('body').fontSize(8).text(`${snapshot.company.website} · ${snapshot.company.phone}`,margin+235,margin+2,{width:264,align:'right'}); doc.font('body').fontSize(7).text(`${record.document_number || 'DRAFT'} · VERSION ${snapshot.agreement.version}`,margin+235,margin+15,{width:264,align:'right'}); doc.moveTo(margin,margin+43).lineTo(margin+width,margin+43).lineWidth(1.5).strokeColor(red).stroke(); doc.y=margin+61; };
    const ensure=(height)=>{ if(doc.y+height>doc.page.height-margin-30)addPage(); };
    const heading=(text)=>{ ensure(35); doc.moveDown(.7); doc.font('brand').fontSize(10).fillColor(ink).text(text.toUpperCase()); doc.moveDown(.45); };
    const fact=(label,value,x,y,w=235)=>{ doc.font('body').fontSize(6.5).fillColor(muted).text(label.toUpperCase(),x,y,{width:w}); doc.font('body').fontSize(9).fillColor(ink).text(String(value||'—'),x,y+10,{width:w}); };
    const paragraph=(text)=>{ ensure(45); doc.font('body').fontSize(9).fillColor(ink).text(String(text),{width,lineGap:3}); };
    addPage();
    doc.font('heavy').fontSize(17).fillColor(ink).text(titles[type][0]);
    doc.font('body').fontSize(8.5).fillColor(muted).text(titles[type][1]); doc.moveDown(1.1);
    if(type==='receipt'){ const y=doc.y; doc.roundedRect(margin,y,width,52,6).fillColor('#EAF6ED').fill(); doc.font('heavy').fontSize(20).fillColor(green).text('PAID & VERIFIED',margin+15,y+14,{width:235}); doc.font('heavy').fontSize(17).fillColor(ink).text(exactRwf(snapshot.payment.amount_rwf),margin+260,y+16,{width:224,align:'right'}); doc.y=y+68; }
    const y=doc.y; fact('Import reference',snapshot.order.order_ref,margin,y); fact('Document issued',date(snapshot.generated_at),margin+260,y); doc.y=y+34;
    fact('Customer',snapshot.buyer.name,margin,doc.y); fact('Email / phone',[snapshot.buyer.email,snapshot.buyer.phone].filter(Boolean).join(' · '),margin+260,doc.y); doc.y+=40;
    heading('Vehicle');
    const vehicle=`${snapshot.order.year || ''} ${snapshot.order.make} ${snapshot.order.model}`.trim();
    const vy=doc.y; fact('Vehicle',vehicle,margin,vy); fact('Origin',snapshot.order.origin_country,margin+260,vy); doc.y=vy+34;
    if(snapshot.order.vin){ fact('VIN',snapshot.order.vin,margin,doc.y); doc.y+=32; }

    if(type==='quotation'){
      heading('Itemized quotation');
      snapshot.money.line_items.forEach((item,index)=>{ ensure(28); const iy=doc.y; doc.font('body').fontSize(8.5).fillColor(ink).text(`${index+1}. ${item.label}`,margin+8,iy,{width:330}); doc.font('bold').fontSize(8.5).text(exactRwf(item.amount_rwf),margin+350,iy,{width:141,align:'right'}); doc.moveTo(margin+8,iy+18).lineTo(margin+width,iy+18).lineWidth(.4).strokeColor(line).stroke(); doc.y=iy+25; });
      const ty=doc.y+4; doc.roundedRect(margin,ty,width,49,5).fillColor(pale).fill(); doc.font('bold').fontSize(8).fillColor(muted).text('TOTAL LANDED PRICE',margin+14,ty+10); doc.font('heavy').fontSize(16).fillColor(ink).text(exactRwf(snapshot.money.total_rwf),margin+230,ty+15,{width:255,align:'right'}); doc.y=ty+63;
      heading('Payment schedule'); paragraph(`50% initial payment: ${exactRwf(snapshot.money.initial_payment_rwf)}. Remaining balance after arrival and Kigali inspection, before handover: ${exactRwf(snapshot.money.final_payment_rwf)}.`);
      heading('Timing'); paragraph(`Offer valid until: ${date(snapshot.order.quote_expires_at)}. Delivery estimate: ${snapshot.order.delivery_estimate || 'To be confirmed in writing after supplier booking.'}`);
    } else if(type==='agreement'){
      heading('Parties and scope'); paragraph(`${snapshot.company.legal_name} will arrange sourcing and import operations for the vehicle identified above for ${snapshot.buyer.name}. This document records the commercial terms accepted for import reference ${snapshot.order.order_ref}.`);
      heading('Price and payment'); paragraph(`The complete agreed landed price is ${exactRwf(snapshot.money.total_rwf)}. An initial 50% payment of ${exactRwf(snapshot.money.initial_payment_rwf)} becomes due after agreement acceptance. The remaining ${exactRwf(snapshot.money.final_payment_rwf)} becomes due after arrival and Kigali inspection, before handover.`);
      heading('Recorded terms'); paragraph(snapshot.agreement.terms || '50% is due after agreement acceptance. The remaining 50% is due after arrival and Kigali inspection, before handover.');
      heading('Acceptance record'); paragraph(snapshot.agreement.accepted_at ? `Accepted electronically on ${date(snapshot.agreement.accepted_at)}. The system preserves this version and its commercial snapshot as an immutable operational record.` : 'Awaiting electronic acceptance by the customer. Payment instructions do not replace acceptance of this agreement.');
    } else if(type==='invoice'){
      heading('Amount due'); const iy=doc.y; doc.roundedRect(margin,iy,width,64,6).fillColor(pale).fill(); doc.font('body').fontSize(8).fillColor(muted).text('INITIAL 50% PAYMENT',margin+16,iy+13); doc.font('heavy').fontSize(21).fillColor(ink).text(exactRwf(snapshot.money.initial_payment_rwf),margin+16,iy+30); doc.y=iy+78;
      heading('Payment reference'); paragraph(`Use ${snapshot.order.order_ref} as the bank payment reference. Sawa Cars verifies uploaded proof against the bank record before an order is placed.`);
      heading('Bank instructions'); paragraph(snapshot.bank.account_name && snapshot.bank.account_number ? `${snapshot.bank.name}\nAccount name: ${snapshot.bank.account_name}\nAccount number: ${snapshot.bank.account_number}` : `${snapshot.bank.name}. Confirm the official account details shown in your authenticated Sawa Cars account or directly with Sawa Cars before sending funds. Bank credentials are intentionally not guessed on this invoice.`);
      heading('Important'); paragraph('This invoice is a request for payment, not proof of payment. An official receipt is issued only after finance verification. Never send funds to account details received from an unverified third party.');
    } else {
      heading('Payment record'); const py=doc.y; fact('Milestone',String(snapshot.payment.milestone).replaceAll('_',' '),margin,py); fact('Bank reference',snapshot.payment.bank_reference,margin+260,py); doc.y=py+34; fact('Verified on',date(snapshot.payment.verified_at),margin,doc.y); fact('Import reference',snapshot.order.order_ref,margin+260,doc.y); doc.y+=40;
      heading('Receipt statement'); paragraph(`${snapshot.company.legal_name} confirms verification of ${exactRwf(snapshot.payment.amount_rwf)} for the ${String(snapshot.payment.milestone).replaceAll('_',' ')} milestone. This receipt records verified funds only and is linked to the immutable import quotation and agreement version ${snapshot.agreement.version}.`);
    }
    ensure(65); doc.moveDown(1); const ny=doc.y; doc.roundedRect(margin,ny,width,52,5).fillColor(pale).fill(); doc.font('bold').fontSize(8).fillColor(ink).text(snapshot.company.legal_name,margin+12,ny+10); doc.font('body').fontSize(7.5).fillColor(muted).text([snapshot.company.address,snapshot.company.tin?`TIN ${snapshot.company.tin}`:null,snapshot.company.email].filter(Boolean).join(' · '),margin+12,ny+24,{width:475});
    const range=doc.bufferedPageRange(); pageCount=range.count;
    for(let i=0;i<pageCount;i++){ doc.switchToPage(i); doc.font('body').fontSize(7).fillColor(muted).text(`${record.document_number || snapshot.order.order_ref} · Page ${i+1} of ${pageCount}`,margin,doc.page.height-34,{width,align:'center',lineBreak:false}); }
    doc.end();
  });
}

const renderQuotation=(snapshot,record)=>renderImportDocument(snapshot,record,'quotation');
const renderAgreement=(snapshot,record)=>renderImportDocument(snapshot,record,'agreement');
const renderDepositInvoice=(snapshot,record)=>renderImportDocument(snapshot,record,'invoice');
const renderPaymentReceipt=(snapshot,record)=>renderImportDocument(snapshot,record,'receipt');

async function issueImportPack(orderId, adminId) {
  const snapshot=await snapshotForImport(orderId); const common={ subjectType:'import_order',subjectId:orderId,ownerUserId:snapshot.buyer.id,snapshot,generatedBy:adminId,version:snapshot.agreement.version };
  return Promise.all([
    issuePdf({ ...common,kind:'import_quotation',title:`Import quotation — ${snapshot.order.order_ref}`,render:renderQuotation }),
    issuePdf({ ...common,kind:'import_agreement',title:`Import agreement — ${snapshot.order.order_ref}`,render:renderAgreement }),
    issuePdf({ ...common,kind:'import_deposit_invoice',title:`50% deposit invoice — ${snapshot.order.order_ref}`,render:renderDepositInvoice }),
  ]);
}

async function issueImportReceipt(orderId,paymentId,adminId){ const snapshot=await snapshotForReceipt(orderId,paymentId); return issuePdf({ kind:'import_payment_receipt',subjectType:'import_payment',subjectId:paymentId,ownerUserId:snapshot.buyer.id,title:`Payment receipt — ${snapshot.order.order_ref}`,snapshot,generatedBy:adminId,render:renderPaymentReceipt }); }

module.exports={ exactRwf,normaliseItems,snapshotForImport,snapshotForReceipt,renderQuotation,renderAgreement,renderDepositInvoice,renderPaymentReceipt,issueImportPack,issueImportReceipt };
