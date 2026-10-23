const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('module', 'exports', 'require', code)(module, module.exports, name => {
    if (!(name in dependencies)) throw Error('Unexpected runtime dependency: ' + name);
    return dependencies[name];
  });
  return module.exports;
}
const workflow = load('lib/service-workflow.ts');
const policy = load('lib/access-policy.ts');
const staff = { uid: 'staff', name: 'Alex', email: 'test@example.com', role: 'seller', active: true, permissions: {} };
function setup({ currentUid = 'staff', exists = true } = {}) {
  const invoice = { data: { documentType: 'WASH', mode: 'wash', status: 'ready', invoiceNumber: 'TEST', payments: [{ amount: 10 }], signature: 'keep' }, totalAmount: 100 };
  let writes = [], events = [], ref;
  global.window = { dispatchEvent: event => events.push(event.type) };
  const storage = load('lib/service-workflow-storage.ts', {
    './firebase': { db: {} }, './auth': { auth: { currentUser: { uid: currentUid } } },
    './user-storage': { getStorePrefix: () => 'test_' }, './access-policy': policy, './service-workflow': workflow,
    'firebase/firestore': {
      doc: (_, collection, id) => (ref = { collection, id }),
      Timestamp: { now: () => 'timestamp' },
      runTransaction: async (_, callback) => callback({ get: async () => ({ exists: () => exists, data: () => invoice }), update: (target, patch) => writes.push({ target, patch }) })
    }
  });
  return { ...storage, invoice, writes, events, ref: () => ref };
}
const action = { type: 'call', call: { id: 'unique-id', outcome: 'no_answer', message: 'voicemail', notes: 'Test note', pickupDate: '', pickupTime: '', followUpDate: '2026-10-24' } };
test('storage writes only service metadata and never replaces financial or customer fields', async () => {
  const store = setup();
  await store.updateServiceWorkflow('invoice-1', action, staff);
  assert.deepEqual(store.ref(), { collection: 'test_invoices', id: 'invoice-1' });
  assert.equal(store.writes.length, 1);
  assert.deepEqual(Object.keys(store.writes[0].patch).sort(), ['data.serviceWorkflow', 'updatedAt']);
  const call = store.writes[0].patch['data.serviceWorkflow'].calls[0];
  assert.equal(call.by.uid, staff.uid); assert.equal(call.by.name, staff.name);
  assert.ok(!Number.isNaN(Date.parse(call.at)));
  assert.deepEqual(store.invoice.data.payments, [{ amount: 10 }]);
  assert.equal(store.invoice.totalAmount, 100); assert.equal(store.invoice.data.signature, 'keep');
  assert.deepEqual(store.events, ['backup-trigger']);
});
test('unmatched identities, inactive staff and read-only custom roles cannot write', async () => {
  for (const [options, identity] of [[{ currentUid: 'someone-else' }, staff], [{}, { ...staff, active: false }], [{}, { ...staff, role: 'custom', permissions: { 'invoices.read': true } }]]) {
    const store = setup(options);
    await assert.rejects(store.updateServiceWorkflow('invoice-1', action, identity), /permission/);
    assert.equal(store.writes.length, 0);
  }
});
test('deleted invoices fail explicitly without recreating records or reporting success', async () => {
  const store = setup({ exists: false });
  await assert.rejects(store.updateServiceWorkflow('invoice-1', action, staff), /no longer exists/);
  assert.equal(store.writes.length, 0); assert.equal(store.events.length, 0);
});
test('invalid call data fails before a transaction write', async () => {
  const store = setup();
  await assert.rejects(store.updateServiceWorkflow('invoice-1', { ...action, call: { ...action.call, followUpDate: '' } }, staff), /follow-up/);
  assert.equal(store.writes.length, 0);
});
