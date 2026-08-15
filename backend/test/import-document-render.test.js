const test = require('node:test');
const assert = require('node:assert/strict');
const {
  exactRwf, normaliseItems, renderQuotation, renderAgreement,
  renderDepositInvoice, renderPaymentReceipt,
} = require('../src/lib/documents/import-documents');

function snapshot() {
  return {
    company:{ legal_name:'Sawa Cars Ltd',address:'Kigali, Rwanda',website:'sawacars.com',phone:'+250 788 308 611',email:'contact@sawacars.com' },
    bank:{ name:'Bank of Kigali',account_name:null,account_number:null },
    order:{ id:'11111111-1111-4111-8111-111111111111',order_ref:'IMP-2026-TEST',origin_country:'South Korea',make:'Hyundai',model:'Santa Fe',year:2022,quote_expires_at:'2026-09-01T00:00:00Z',delivery_estimate:'8–12 weeks to Kigali' },
    buyer:{ id:'22222222-2222-4222-8222-222222222222',name:'Aline Uwase',email:'aline@example.com',phone:'+250 780 000 000' },
    agreement:{ id:'33333333-3333-4333-8333-333333333333',version:2,issued_at:'2026-08-15T08:00:00Z',accepted_at:'2026-08-15T09:00:00Z',terms:'50% is due after agreement acceptance. The remaining 50% is due in Kigali before handover.' },
    money:{ total_rwf:28500000,initial_payment_rwf:14250000,final_payment_rwf:14250000,line_items:[{label:'Vehicle and export preparation',amount_rwf:24000000},{label:'Shipping and landed services',amount_rwf:4500000}] },
    payment:{ id:'44444444-4444-4444-8444-444444444444',milestone:'initial_50',amount_rwf:14250000,status:'verified',bank_reference:'IMP-2026-TEST',verified_at:'2026-08-16T10:00:00Z' },
    generated_at:'2026-08-15T10:00:00Z',
  };
}

test('RWF values and fallback line items remain exact', () => {
  assert.equal(exactRwf(28500000), 'RWF 28,500,000');
  assert.deepEqual(normaliseItems([], 28500000), [{ label:'Complete landed vehicle import price',amount_rwf:28500000 }]);
});

test('complete import document pack renders valid numbered PDFs', async () => {
  const record={ document_number:'QUO-2026-00001' };
  for (const render of [renderQuotation,renderAgreement,renderDepositInvoice,renderPaymentReceipt]) {
    const pdf=await render(snapshot(),record);
    assert.equal(pdf.buffer.subarray(0,5).toString(),'%PDF-');
    assert.ok(pdf.buffer.length>15000);
    assert.ok(pdf.pageCount>=1);
  }
});
