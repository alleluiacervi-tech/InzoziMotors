const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random()*1e6)}@test.local`;
// A 1x1 PNG, just enough to pass verifyImportDocument's magic-byte check.
const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
async function register(name='Buyer'){const email=unique('import');const password='password123';const r=await api().post('/auth/register').send({name,email,password,role:'buyer'}).expect(201);return{id:r.body.user.id,email,password,token:r.body.token};}
async function admin(){const u=await register('Admin');await pool.query("UPDATE users SET role='admin' WHERE id=$1",[u.id]);const r=await api().post('/auth/login').send({email:u.email,password:u.password}).expect(200);return{...u,token:r.body.token};}
test.after(async()=>pool.end());

test('imports are private, quoted in RWF, and agreement acceptance unlocks the first 50%',async()=>{
  const buyer=await register();const stranger=await register('Stranger');const operator=await admin();
  const created=await api().post('/imports').set('Authorization',`Bearer ${buyer.token}`).send({origin_country:'China',make:'Toyota',model:'RAV4',year:2023}).expect(201);
  await api().get(`/imports/${created.body.id}`).set('Authorization',`Bearer ${stranger.token}`).expect(404);
  await api().post(`/imports/${created.body.id}/quote`).set('Authorization',`Bearer ${operator.token}`).send({quoted_total_rwf:30000000,exchange_rate:1400}).expect(200);
  const pack=await api().post(`/imports/${created.body.id}/document-pack`).set('Authorization',`Bearer ${operator.token}`).expect(200);
  assert.equal(pack.body.documents.length,3);
  assert.deepEqual(pack.body.documents.map(d=>d.kind).sort(),['import_agreement','import_deposit_invoice','import_quotation']);
  await api().get(`/imports/${created.body.id}/generated-documents/import_quotation/file`).set('Authorization',`Bearer ${buyer.token}`).expect('Content-Type',/application\/pdf/).expect(200);
  const quoted=await api().get(`/imports/${created.body.id}`).set('Authorization',`Bearer ${buyer.token}`).expect(200);
  assert.deepEqual(quoted.body.payments.map(p=>Number(p.amount_rwf)),[15000000,15000000]);
  assert.equal(quoted.body.agreements.length,1);
  await api().post(`/imports/${created.body.id}/accept-agreement`).set('Authorization',`Bearer ${buyer.token}`).expect(200);
  const accepted=await api().get(`/imports/${created.body.id}`).set('Authorization',`Bearer ${buyer.token}`).expect(200);
  assert.equal(accepted.body.status,'deposit_due');assert.ok(accepted.body.agreement_accepted_at);
});

test('the single super admin completes separate review and verification checkpoints',async()=>{
  const buyer=await register();const operator=await admin();
  const created=await api().post('/imports').set('Authorization',`Bearer ${buyer.token}`).send({origin_country:'South Korea',make:'Hyundai',model:'Tucson',year:2022}).expect(201);
  await api().post(`/imports/${created.body.id}/quote`).set('Authorization',`Bearer ${operator.token}`).send({quoted_total_rwf:24000000}).expect(200);
  const detail=await api().get(`/imports/${created.body.id}`).set('Authorization',`Bearer ${buyer.token}`).expect(200);const payment=detail.body.payments[0];
  await pool.query("UPDATE import_payments SET status='submitted',bank_reference='BK-TEST' WHERE id=$1",[payment.id]);
  await api().patch(`/imports/${created.body.id}/payments/${payment.id}`).set('Authorization',`Bearer ${operator.token}`).send({status:'verified'}).expect(409);
  await api().patch(`/imports/${created.body.id}/payments/${payment.id}`).set('Authorization',`Bearer ${operator.token}`).send({status:'reviewed'}).expect(200);
  await api().patch(`/imports/${created.body.id}/payments/${payment.id}`).set('Authorization',`Bearer ${operator.token}`).send({status:'verified'}).expect(200);
  const receipt=await api().post(`/imports/${created.body.id}/payments/${payment.id}/receipt`).set('Authorization',`Bearer ${operator.token}`).expect(200);
  assert.equal(receipt.body.kind,'import_payment_receipt');
  await api().get(`/imports/${created.body.id}/payments/${payment.id}/receipt/file`).set('Authorization',`Bearer ${buyer.token}`).expect('Content-Type',/application\/pdf/).expect(200);
});

test('actual cost stays separate from the quote, and never reaches the buyer',async()=>{
  const buyer=await register();const operator=await admin();
  const created=await api().post('/imports').set('Authorization',`Bearer ${buyer.token}`).send({origin_country:'Japan',make:'Toyota',model:'Land Cruiser',year:2021}).expect(201);
  await api().post(`/imports/${created.body.id}/quote`).set('Authorization',`Bearer ${operator.token}`).send({quoted_total_rwf:40000000}).expect(200);

  await api().patch(`/imports/${created.body.id}/cost`).set('Authorization',`Bearer ${buyer.token}`).send({actual_cost_rwf:30000000}).expect(403);
  const negative=await api().patch(`/imports/${created.body.id}/cost`).set('Authorization',`Bearer ${operator.token}`).send({actual_cost_rwf:-1}).expect(400);
  assert.match(negative.body.error,/RWF/);

  const recorded=await api().patch(`/imports/${created.body.id}/cost`).set('Authorization',`Bearer ${operator.token}`).send({actual_cost_rwf:30000000,note:'Vehicle 24M, freight 4M, duty 2M'}).expect(200);
  assert.equal(Number(recorded.body.actual_cost_rwf),30000000);
  assert.equal(Number(recorded.body.quoted_total_rwf),40000000);
  assert.ok(recorded.body.cost_recorded_at);

  // A correction, not a void-and-reissue — cost data arrives piecemeal.
  const corrected=await api().patch(`/imports/${created.body.id}/cost`).set('Authorization',`Bearer ${operator.token}`).send({actual_cost_rwf:31000000}).expect(200);
  assert.equal(Number(corrected.body.actual_cost_rwf),31000000);

  // The buyer's own read of the same order never carries Sawa's cost.
  const asBuyer=await api().get(`/imports/${created.body.id}`).set('Authorization',`Bearer ${buyer.token}`).expect(200);
  assert.equal('actual_cost_rwf' in asBuyer.body,false);
  assert.equal('cost_note' in asBuyer.body,false);
  assert.equal(asBuyer.body.events.some((e)=>e.event_type==='cost_recorded'),false,'the cost event must not be customer-visible');

  const asAdmin=await api().get(`/imports/${created.body.id}`).set('Authorization',`Bearer ${operator.token}`).expect(200);
  assert.equal(Number(asAdmin.body.actual_cost_rwf),31000000);

  const mine=await api().get('/imports/mine').set('Authorization',`Bearer ${buyer.token}`).expect(200);
  const own=mine.body.find((o)=>o.id===created.body.id);
  assert.equal('actual_cost_rwf' in own,false);
});

test('final-50 proof cannot jump ahead of the pipeline, and each payment carries its own deterministic reference',async()=>{
  const buyer=await register();const operator=await admin();
  const created=await api().post('/imports').set('Authorization',`Bearer ${buyer.token}`).send({origin_country:'China',make:'BYD',model:'Atto 3',year:2024}).expect(201);
  await api().post(`/imports/${created.body.id}/quote`).set('Authorization',`Bearer ${operator.token}`).send({quoted_total_rwf:20000000}).expect(200);
  await api().post(`/imports/${created.body.id}/accept-agreement`).set('Authorization',`Bearer ${buyer.token}`).expect(200);

  const quoted=await api().get(`/imports/${created.body.id}`).set('Authorization',`Bearer ${buyer.token}`).expect(200);
  const initial=quoted.body.payments.find((p)=>p.milestone==='initial_50');
  const final=quoted.body.payments.find((p)=>p.milestone==='final_50');
  assert.equal(initial.reference,`${created.body.order_ref}-D1`);
  assert.equal(final.reference,`${created.body.order_ref}-D2`);
  // Bank details are shown while a payment is due -- the P0 fix: a buyer was
  // told to "pay using the corporate bank instructions displayed on your
  // official order" and no client ever displayed any.
  assert.ok(initial.payment_instructions);
  assert.ok(initial.payment_instructions.name);

  // Both milestones are 'due' the moment a quote is issued, but the order is
  // only at deposit_due -- final-50 proof must not be accepted yet, or it
  // would skip ordered/shipping_booked/in_transit/arrived/kigali_inspection
  // entirely. See docs/IMPORTS-AUDIT.md, P1.
  await api().post(`/imports/${created.body.id}/payments/${final.id}/proof`).set('Authorization',`Bearer ${buyer.token}`)
    .field('bank_reference','BK-TOO-EARLY').attach('proof',PNG_1x1,{filename:'proof.png',contentType:'image/png'}).expect(409);

  const stillDue=await api().get(`/imports/${created.body.id}`).set('Authorization',`Bearer ${buyer.token}`).expect(200);
  assert.equal(stillDue.body.payments.find((p)=>p.milestone==='final_50').status,'due');

  // The initial-50 proof, by contrast, is legitimately due right now.
  const submitted=await api().post(`/imports/${created.body.id}/payments/${initial.id}/proof`).set('Authorization',`Bearer ${buyer.token}`)
    .field('bank_reference','BK-ON-TIME').attach('proof',PNG_1x1,{filename:'proof.png',contentType:'image/png'}).expect(200);
  assert.equal(submitted.body.status,'submitted');

  // Once submitted, the payment is no longer 'due', so instructions to pay
  // it again are gone -- there is nothing left to instruct.
  const afterSubmit=await api().get(`/imports/${created.body.id}`).set('Authorization',`Bearer ${buyer.token}`).expect(200);
  assert.equal(afterSubmit.body.payments.find((p)=>p.milestone==='initial_50').payment_instructions,null);
});

test('an expired quote cannot be accepted',async()=>{
  const buyer=await register();const operator=await admin();
  const created=await api().post('/imports').set('Authorization',`Bearer ${buyer.token}`).send({origin_country:'Japan',make:'Suzuki',model:'Swift',year:2023}).expect(201);
  await api().post(`/imports/${created.body.id}/quote`).set('Authorization',`Bearer ${operator.token}`).send({quoted_total_rwf:12000000,quote_expires_at:'2020-01-01T00:00:00.000Z'}).expect(200);

  const expired=await api().post(`/imports/${created.body.id}/accept-agreement`).set('Authorization',`Bearer ${buyer.token}`).expect(409);
  assert.match(expired.body.error,/expired/i);

  // A fresh quotation supersedes the expired one and can be accepted.
  await api().post(`/imports/${created.body.id}/quote`).set('Authorization',`Bearer ${operator.token}`).send({quoted_total_rwf:12000000,quote_expires_at:'2099-01-01T00:00:00.000Z'}).expect(200);
  await api().post(`/imports/${created.body.id}/accept-agreement`).set('Authorization',`Bearer ${buyer.token}`).expect(200);
});

test('only an admin can create a pre-verified showroom account',async()=>{
  const buyer=await register();const operator=await admin();const email=unique('showroom');
  await api().post('/admin/showrooms').set('Authorization',`Bearer ${buyer.token}`).send({name:'Contact',business_name:'Trusted Motors',email}).expect(403);
  const made=await api().post('/admin/showrooms').set('Authorization',`Bearer ${operator.token}`).send({name:'Contact',business_name:'Trusted Motors',email}).expect(201);
  assert.equal(made.body.seller_type,'showroom');assert.equal(made.body.id_verified,'approved');
  const row=await pool.query('SELECT password_hash,admin_created,must_change_password FROM users WHERE id=$1',[made.body.id]);
  assert.equal(row.rows[0].password_hash,null);assert.equal(row.rows[0].admin_created,true);assert.equal(row.rows[0].must_change_password,true);
});
