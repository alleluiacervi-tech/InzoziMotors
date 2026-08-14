const test = require('node:test');
const assert = require('node:assert/strict');
const { renderInspectionReport, CATEGORIES } = require('../src/lib/documents/inspection-report');

function snapshot() {
  const checklist = {};
  CATEGORIES.flatMap(([, items]) => items).forEach((item, index) => {
    checklist[item] = index === 4 ? 'fail' : index % 9 === 0 ? 'flag' : 'pass';
  });
  return {
    company: { legal_name: 'Sawa Cars Ltd', website: 'sawacars.com', phone: '+250 788 308 611' },
    inspection: {
      id: '11111111-1111-4111-8111-111111111111', center: 'Sawa Cars Nyarutarama',
      score: 121, grade: 'B', inspector_name: 'Test Inspector',
      completed_at: '2026-08-15T08:00:00.000Z', checklist,
      notes: 'Front brake pads should be replaced during the next service.',
    },
    vehicle: {
      title: '2021 Toyota RAV4 Adventure', make: 'Toyota', model: 'RAV4', year: 2021,
      mileage: 64300, vin: 'JTMRZ33V485012345', registration_plate: 'RAD 123 B',
    },
    seller: { user_id: '22222222-2222-4222-8222-222222222222', name: 'Seller' },
    generated_at: '2026-08-15T08:05:00.000Z',
  };
}

test('inspection PDF renders the complete checklist across numbered pages', async () => {
  const pdf = await renderInspectionReport(snapshot());
  assert.equal(pdf.buffer.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.buffer.length > 20_000, 'embedded fonts and complete report should be present');
  assert.ok(pdf.pageCount >= 2, 'the complete checklist should span multiple pages');
});
