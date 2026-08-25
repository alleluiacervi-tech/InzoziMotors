const PDFDocument = require('pdfkit');
const pool = require('../../db');
const { FONTS, assertFontsPresent } = require('../contract/fonts');
const { issuePdf, DocumentError } = require('./service');
const {
  CATEGORIES,
  CHECKLIST_VERSION,
  evaluateChecklist,
  grade,
} = require('../inspection-policy');

const COMPANY = {
  legal_name: process.env.COMPANY_LEGAL_NAME || 'Sawa Cars Ltd',
  address: process.env.COMPANY_ADDRESS || 'Nyarutarama, Kigali, Rwanda',
  website: process.env.COMPANY_WEBSITE || 'sawacars.com',
  phone: process.env.COMPANY_PHONE || '+250 788 308 611',
  email: process.env.COMPANY_EMAIL || 'contact@sawacars.com',
};

// LEFT JOINs throughout: a walk-in inspection has neither a submission nor a
// car, and its vehicle identity lives on the inspection row itself. The three
// vehicle tiers below (car → submission → inspection) resolve in that order.
const INSPECTION_SQL = `
  SELECT i.id, i.status, i.center, i.score, i.notes, i.checklist_results,
         i.checklist_version, i.passed, i.critical_failures,
         i.started_at, i.completed_at, i.inspector_id, i.kind,
         i.customer_user_id, i.vehicle_make, i.vehicle_model, i.vehicle_year,
         i.vehicle_vin, i.vehicle_plate, i.vehicle_mileage,
         s.id AS submission_id, s.seller_id, s.make AS sub_make, s.model AS sub_model,
         s.year AS sub_year, s.mileage AS sub_mileage, s.color AS sub_color,
         s.transmission AS sub_transmission, s.fuel_type AS sub_fuel,
         c.id AS car_id, c.title AS car_title, c.make, c.model, c.year, c.mileage,
         c.vin, c.registration_plate, c.color, c.transmission, c.fuel_type,
         seller.name AS seller_name, customer.name AS customer_name,
         inspector.name AS inspector_name
    FROM inspections i
    LEFT JOIN submissions s ON s.id=i.submission_id
    LEFT JOIN users seller ON seller.id=s.seller_id
    LEFT JOIN users customer ON customer.id=i.customer_user_id
    LEFT JOIN users inspector ON inspector.id=i.inspector_id
    LEFT JOIN cars c ON c.id=i.car_id
   WHERE i.id=$1`;

async function snapshotForInspection(inspectionId) {
  const { rows } = await pool.query(INSPECTION_SQL, [inspectionId]);
  if (!rows.length) throw new DocumentError('Inspection not found', 404);
  const r = rows[0];
  if (r.status !== 'complete' || !r.checklist_results || r.score == null) {
    throw new DocumentError('Complete the inspection before generating its report', 409, 'INSPECTION_INCOMPLETE');
  }
  const evaluated = evaluateChecklist(r.checklist_results);
  if (r.checklist_version !== CHECKLIST_VERSION || !evaluated.valid
      || Boolean(r.passed) !== evaluated.passed || evaluated.score !== Number(r.score)) {
    throw new DocumentError(
      'This inspection does not contain a complete, internally consistent 150-point checklist.',
      409,
      'INSPECTION_EVIDENCE_INVALID'
    );
  }
  const standalone = r.kind === 'standalone';
  const make = r.make || r.sub_make || r.vehicle_make;
  const model = r.model || r.sub_model || r.vehicle_model;
  const year = r.year || r.sub_year || r.vehicle_year;
  return {
    company: COMPANY,
    // Who the report is for, and on what basis. A walk-in report is issued to
    // the customer who paid for it and says plainly that Sawa is not selling
    // the car — that independence is the whole point of the document.
    subject: {
      kind: standalone ? 'standalone' : 'listing',
      party_user_id: standalone ? r.customer_user_id : r.seller_id,
      party_name: standalone ? r.customer_name : r.seller_name,
    },
    inspection: {
      id: r.id, center: r.center, score: Number(r.score), grade: grade(Number(r.score)),
      started_at: r.started_at, completed_at: r.completed_at,
      inspector_name: r.inspector_name || 'Sawa Cars inspection team',
      notes: r.notes || null, checklist: r.checklist_results,
      checklist_version: CHECKLIST_VERSION, passed: evaluated.passed,
      category_scores: evaluated.category_scores,
      critical_failures: evaluated.critical_failures,
    },
    vehicle: {
      car_id: r.car_id,
      title: r.car_title || [year, make, model].filter(Boolean).join(' ').trim() || 'Vehicle',
      make, model, year,
      mileage: r.mileage ?? r.sub_mileage ?? r.vehicle_mileage,
      vin: r.vin || r.vehicle_vin || null,
      registration_plate: r.registration_plate || r.vehicle_plate || null,
      color: r.color || r.sub_color || null,
      transmission: r.transmission || r.sub_transmission || null,
      fuel_type: r.fuel_type || r.sub_fuel || null,
    },
    seller: { user_id: r.seller_id, name: r.seller_name },
    customer: standalone ? { user_id: r.customer_user_id, name: r.customer_name } : null,
    generated_at: new Date().toISOString(),
  };
}

function renderInspectionReport(snapshot, record = {}) {
  return new Promise((resolve, reject) => {
    try { assertFontsPresent(); } catch (error) { reject(error); return; }
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, autoFirstPage: false,
      info: { Title: `Vehicle Inspection Report — ${snapshot.vehicle.title}`, Author: snapshot.company.legal_name, Subject: 'Sawa Cars 150-point vehicle inspection' } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), pageCount }));
    doc.registerFont('brand', FONTS.brand).registerFont('heavy', FONTS.brandHeavy).registerFont('body', FONTS.body).registerFont('bold', FONTS.bodyBold);
    const red='#CC050F', ink='#1B1313', muted='#7A6E6E', line='#E8E3E3', green='#166534', amber='#B45309', danger='#B91C1C';
    const margin=48, width=499;
    const addPage = () => {
      doc.addPage();
      doc.font('heavy').fontSize(21).fillColor(red).text('SAWA', margin, margin, { lineBreak:false });
      doc.font('body').fontSize(7.5).fillColor(muted).text('DRIVEN BY TRUST', margin+2, margin+25, { characterSpacing:1.4, lineBreak:false });
      doc.font('body').fontSize(8).text(`${snapshot.company.website} · ${snapshot.company.phone}`, margin+230, margin+2, { width:269, align:'right' });
      doc.font('body').fontSize(7).fillColor(muted).text(record.document_number ? `${record.document_number} · ISSUED` : 'OFFICIAL INSPECTION REPORT', margin+230, margin+14, { width:269, align:'right' });
      doc.moveTo(margin, margin+43).lineTo(margin+width, margin+43).lineWidth(1.5).strokeColor(red).stroke();
      doc.y=margin+60;
    };
    const ensure = (height) => { if (doc.y+height > doc.page.height-margin-28) addPage(); };
    addPage();
    doc.font('heavy').fontSize(17).fillColor(ink).text('VEHICLE INSPECTION REPORT');
    doc.font('body').fontSize(9).fillColor(muted).text('Independent 150-point condition and documentation assessment', { lineGap:2 });
    doc.moveDown(1);

    // issuePdf re-renders drafts from their stored snapshot, so a draft created
    // before `subject` existed must still render. Default it, never assume it.
    const subject = snapshot.subject || { kind: 'listing', party_name: (snapshot.seller || {}).name };
    const score=snapshot.inspection.score;
    const verdicts=Object.values(snapshot.inspection.checklist);
    const counts={ pass:verdicts.filter(v=>v==='pass').length, flag:verdicts.filter(v=>v==='flag').length, fail:verdicts.filter(v=>v==='fail').length };
    const bandY=doc.y;
    doc.roundedRect(margin,bandY,width,82,6).fillColor('#F6F4F4').fill();
    doc.font('heavy').fontSize(30).fillColor(snapshot.inspection.passed?green:score>=83?amber:danger).text(`${score}/150`,margin+16,bandY+13,{lineBreak:false});
    doc.font('brand').fontSize(11).fillColor(ink).text(`Grade ${snapshot.inspection.grade}`,margin+18,bandY+52,{lineBreak:false});
    doc.font('bold').fontSize(10).fillColor(ink).text(snapshot.vehicle.title,margin+145,bandY+14,{width:335});
    doc.font('body').fontSize(8.5).fillColor(muted).text([
      snapshot.vehicle.vin ? `VIN ${snapshot.vehicle.vin}` : null,
      snapshot.vehicle.mileage != null ? `${Number(snapshot.vehicle.mileage).toLocaleString('en-RW')} km` : null,
      snapshot.inspection.center,
    ].filter(Boolean).join('  ·  '),margin+145,bandY+34,{width:335});
    doc.font('body').fontSize(8).fillColor(muted).text(`${counts.pass} passed  ·  ${counts.flag} flagged  ·  ${counts.fail} failed`,margin+145,bandY+55,{width:335});
    doc.y=bandY+100;

    doc.font('brand').fontSize(11).fillColor(ink).text('VEHICLE & INSPECTION DETAILS');
    const facts=[['Make / model',[snapshot.vehicle.make,snapshot.vehicle.model].filter(Boolean).join(' ')],['Year',snapshot.vehicle.year],['Registration',snapshot.vehicle.registration_plate||'Not recorded'],['Inspector',snapshot.inspection.inspector_name],['Completed',new Date(snapshot.inspection.completed_at).toLocaleString('en-RW',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Kigali'})],['Center',snapshot.inspection.center],[subject.kind==='standalone'?'Inspection requested by':'Vehicle presented by',subject.party_name||'Not recorded']];
    facts.forEach(([label,value],index)=>{ const y=doc.y+7; const x=margin+(index%2)*250; if(index%2===0&&index>0) doc.y+=30; doc.font('body').fontSize(6.5).fillColor(muted).text(String(label).toUpperCase(),x,y,{width:230}); doc.font('body').fontSize(9).fillColor(ink).text(String(value||'—'),x,y+10,{width:230}); });
    doc.y+=42;

    for (const category of CATEGORIES) {
      ensure(38 + category.items.length*21);
      doc.font('brand').fontSize(10).fillColor(ink).text(`${category.name} · ${category.max_points} points`);
      doc.moveDown(0.35);
      for (const item of category.items) {
        const verdict=snapshot.inspection.checklist[item.id]||'not recorded';
        const color=verdict==='pass'?green:verdict==='flag'?amber:verdict==='fail'?danger:muted;
        const y=doc.y;
        doc.font('body').fontSize(8.5).fillColor(ink).text(item.label,margin+8,y,{width:360});
        doc.font('bold').fontSize(7.5).fillColor(color).text(String(verdict).toUpperCase(),margin+390,y,{width:100,align:'right'});
        doc.moveTo(margin+8,y+15).lineTo(margin+width,y+15).lineWidth(0.4).strokeColor(line).stroke();
        doc.y=y+21;
      }
      doc.moveDown(0.45);
    }
    if(snapshot.inspection.notes){ ensure(70); doc.font('brand').fontSize(10).fillColor(ink).text('MECHANIC’S NOTES'); doc.moveDown(0.4); doc.font('body').fontSize(8.5).fillColor(ink).text(snapshot.inspection.notes,{width,lineGap:2}); }
    ensure(58); doc.moveDown(1); const noteY=doc.y; doc.roundedRect(margin,noteY,width,48,5).fillColor('#F6F4F4').fill();
    doc.font('bold').fontSize(8).fillColor(ink).text('How to read this report',margin+12,noteY,{width:475});
    doc.font('body').fontSize(7.5).fillColor(muted).text(`Pass means the item met the inspection standard. Flag means attention is recommended. Fail means the item did not meet the standard at inspection. This report records condition at the stated date; it is not a warranty.${subject.kind==='standalone'?' Sawa Cars is not selling this vehicle and has no interest in any sale of it; this is an independent assessment commissioned by the person named above.':''}`,margin+12,noteY+13,{width:475,lineGap:1});

    const range=doc.bufferedPageRange(); const pageCount=range.count;
    for(let i=0;i<pageCount;i++){ doc.switchToPage(i); doc.font('body').fontSize(7).fillColor(muted).text(`${record.document_number || `Inspection ${snapshot.inspection.id}`} · Page ${i+1} of ${pageCount}`,margin,doc.page.height-34,{width,align:'center',lineBreak:false}); }
    doc.end();
  });
}

async function issueInspectionReport(inspectionId, adminId) {
  const snapshot=await snapshotForInspection(inspectionId);
  return issuePdf({ kind:'inspection_report', subjectType:'inspection', subjectId:inspectionId,
    ownerUserId:(snapshot.subject && snapshot.subject.party_user_id) || (snapshot.seller && snapshot.seller.user_id) || null,
    title:`Inspection report — ${snapshot.vehicle.title}`,
    snapshot, generatedBy:adminId, render:renderInspectionReport });
}

module.exports={ issueInspectionReport, snapshotForInspection, renderInspectionReport, CATEGORIES };
