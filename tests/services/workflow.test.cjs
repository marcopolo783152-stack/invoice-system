const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('lib/service-workflow.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = { exports: {} };
new Function('module', 'exports', code)(loaded, loaded.exports);
const { applyServiceAction: apply, emptyPlan, deliveryBucket, followUpBucket, businessClock, preserveServiceWorkflow } = loaded.exports;
const by = { uid: 'staff-1', name: 'Alex' }, at = '2026-10-23T14:00:00.000Z';
const base = () => ({ documentType: 'WASH', invoiceNumber: 'TEST', mode: 'wash', status: 'ready', items: [], payments: [{ amount: 50 }], signature: 'preserve-me' });
const call = (id = 'call-1', extra = {}) => ({ type: 'call', call: { id, outcome: 'no_answer', message: 'voicemail', notes: 'Please call back', pickupDate: '', pickupTime: '', followUpDate: '2026-10-24', ...extra } });
const plan = (extra = {}, expectedRevision = 0) => ({ type: 'plan', expectedRevision, plan: { ...emptyPlan(), method: 'delivery', ...extra } });
const withWorkflow = (data, action) => ({ ...data, serviceWorkflow: apply(data, action, by, at) });

test('legacy service invoices start without invented calls or deliveries', () => {
  assert.equal(deliveryBucket(base()), null);
  assert.equal(followUpBucket(base()), null);
  const data = withWorkflow(base(), plan());
  assert.deepEqual(data.serviceWorkflow.calls, []);
  assert.equal(deliveryBucket(data), 'unscheduled');
});
test('call attempts append with automatic staff identity and retain previous attempts', () => {
  let data = withWorkflow(base(), call());
  const first = data.serviceWorkflow.calls[0];
  assert.deepEqual(first.by, by); assert.equal(first.at, at);
  data = withWorkflow(data, call('call-2', { outcome: 'answered', pickupDate: '2026-10-25', pickupTime: '14:30', followUpDate: '' }));
  assert.equal(data.serviceWorkflow.calls.length, 2);
  assert.deepEqual(data.serviceWorkflow.calls[0], first);
  assert.equal(data.serviceWorkflow.calls[1].pickupTime, '14:30');
  assert.equal(data.serviceWorkflow.calls[1].message, 'none');
  assert.equal(data.serviceWorkflow.followUpDate, '');
  assert.equal(data.serviceWorkflow.plan.date, '2026-10-25');
  assert.equal(data.serviceWorkflow.plan.startTime, '14:30');
  assert.deepEqual(data.payments, base().payments); assert.equal(data.signature, 'preserve-me');
});
test('repeat submission with the same call id is idempotent', () => {
  const data = withWorkflow(base(), call());
  assert.deepEqual(apply(data, call(), by, at), data.serviceWorkflow);
});
test('unanswered calls require follow-up; message types and pickup times are validated', () => {
  assert.throws(() => apply(base(), call('1', { followUpDate: '' }), by, at), /follow-up/);
  assert.throws(() => apply(base(), call('1', { message: 'bad' }), by, at), /call result/);
  assert.throws(() => apply(base(), call('1', { pickupTime: '25:00' }), by, at), /time/);
  assert.throws(() => apply(base(), call('1', { pickupDate: '2026-02-30' }), by, at));
  assert.throws(() => apply(base(), call('1', { notes: 'x'.repeat(4001) }), by, at), /notes/);
});
test('delivery scheduling rejects invalid dates and reversed windows', () => {
  for (const fields of [{ date: '2026-02-30' }, { startTime: '12:00' }, { date: '2026-10-24', startTime: '14:00', endTime: '13:00' }, { date: '2026-10-24', endTime: '13:00' }, { method: 'invalid' }]) assert.throws(() => apply(base(), plan(fields), by, at));
});
test('delivery groups use Alexandria dates even across UTC midnight and DST changes', () => {
  const data = withWorkflow(base(), plan({ date: '2026-10-23', startTime: '16:00', endTime: '17:00' }));
  assert.equal(deliveryBucket(data, new Date('2026-10-23T14:00:00Z')), 'today');
  assert.equal(deliveryBucket(data, new Date('2026-10-23T21:01:00Z')), 'overdue');
  const allDay = withWorkflow(base(), plan({ date: '2026-10-23' }));
  assert.equal(deliveryBucket(allDay, new Date('2026-10-24T02:00:00Z')), 'today');
  assert.equal(deliveryBucket(allDay, new Date('2026-10-24T04:00:00Z')), 'overdue');
  assert.equal(deliveryBucket(allDay, new Date('2026-10-22T14:00:00Z')), 'upcoming');
  assert.deepEqual(businessClock(new Date('2026-11-01T05:30:00Z')), { date: '2026-11-01', time: '01:30' });
  assert.deepEqual(businessClock(new Date('2026-11-01T06:30:00Z')), { date: '2026-11-01', time: '01:30' });
  assert.deepEqual(businessClock(new Date('2026-10-24T04:00:00Z')), { date: '2026-10-24', time: '00:00' });
});
test('follow-ups sort into today, overdue and upcoming; handled calls retain history', () => {
  let data = withWorkflow(base(), call());
  assert.equal(followUpBucket(data, new Date('2026-10-23T14:00:00Z')), 'upcoming');
  assert.equal(followUpBucket(data, new Date('2026-10-24T14:00:00Z')), 'today');
  assert.equal(followUpBucket(data, new Date('2026-10-25T14:00:00Z')), 'overdue');
  data = withWorkflow(data, { type: 'followup_done', expectedRevision: 1 });
  assert.equal(followUpBucket(data), null); assert.equal(data.serviceWorkflow.calls.length, 1);
});
test('stale schedule, completion and follow-up writes cannot overwrite newer staff work', () => {
  const data = withWorkflow(base(), call());
  for (const action of [plan({}, 0), { type: 'delivered', expectedRevision: 0 }, { type: 'followup_done', expectedRevision: 0 }]) assert.throws(() => apply(data, action, by, at), /Another staff member/);
});
test('old invoice edits preserve current workflow rather than overwriting it', () => {
  const current = withWorkflow(base(), call());
  const edited = { ...base(), notes: 'Updated invoice', payments: [{ amount: 75 }] };
  const merged = preserveServiceWorkflow(edited, current);
  assert.deepEqual(merged.serviceWorkflow, current.serviceWorkflow);
  assert.deepEqual(merged.payments, edited.payments);
  assert.equal(merged.notes, edited.notes);
  const stale = { ...edited, serviceWorkflow: { revision: 0, calls: [] } };
  assert.deepEqual(preserveServiceWorkflow(stale, current).serviceWorkflow, current.serviceWorkflow);
});
test('delivered invoices disappear from active reminders and can be reopened', () => {
  let data = withWorkflow(base(), plan({ date: '2026-10-23' }));
  data = withWorkflow(data, call());
  data = withWorkflow(data, { type: 'delivered', expectedRevision: 2 });
  assert.equal(deliveryBucket(data), null); assert.equal(followUpBucket(data), null);
  assert.deepEqual(data.serviceWorkflow.delivered, { at, by });
  assert.equal(data.serviceWorkflow.calls.length, 1);
  assert.equal(data.status, 'ready'); assert.deepEqual(data.payments, base().payments);
  data = withWorkflow(data, { type: 'reopen', expectedRevision: 3 });
  assert.equal(deliveryBucket(data, new Date(at)), 'today');
});
test('completion requires delivery method and date', () => {
  assert.throws(() => apply(base(), { type: 'delivered', expectedRevision: 0 }, by, at), /Schedule/);
  const data = withWorkflow(base(), plan());
  assert.throws(() => apply(data, { type: 'delivered', expectedRevision: 1 }, by, at), /Schedule/);
});
test('draft, returned, retail and completed services do not enter the active queues', () => {
  const scheduled = withWorkflow(base(), plan({ date: '2026-10-23' }));
  for (const patch of [{ isDraft: true }, { returned: true }, { status: 'picked_up' }, { documentType: 'INVOICE', mode: 'retail' }]) {
    const data = { ...scheduled, ...patch };
    assert.equal(deliveryBucket(data), null); assert.equal(followUpBucket(data), null);
    assert.throws(() => apply(data, call(), by, at));
  }
});
