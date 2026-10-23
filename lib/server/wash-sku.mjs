export const WASH_SKU_FLOOR = 1270;
export function highestWashSku(records, floor = WASH_SKU_FLOOR) {
 let highest = floor;
 for (const record of records) {
  const items = record?.data?.items || record?.items || [];
  for (const item of items) {
   const match = String(item?.sku || '').trim().match(/^MPW\s*0*(\d+)$/i);
   const number = match ? Number(match[1]) : 0;
   if (Number.isSafeInteger(number)) highest = Math.max(highest, number);
  }
 }
 return highest;
}
// Persistent high-water mark, with an operation ledger for network retries.
export async function reserveWashSkus(db, {requestId, count, uid, observedMax}) {
 const counter = db.doc('system_counters/wash_sku');
 const receipt = counter.collection('reservations').doc(requestId);
 return db.runTransaction(async tx => {
  const [state, prior] = await Promise.all([tx.get(counter), tx.get(receipt)]);
  if (prior.exists) {
   const saved = prior.data();
   if (saved.uid !== uid || saved.count !== count) throw Error('RESERVATION_CONFLICT');
   return saved.skus;
  }
  const current = state.data()?.lastUsed ?? 0;
  if (!Number.isSafeInteger(current) || current < 0) throw Error('INVALID_COUNTER');
  const last = Math.max(WASH_SKU_FLOOR, observedMax, current);
  if (!Number.isSafeInteger(last + count)) throw Error('INVALID_COUNTER');
  const skus = Array.from({length:count}, (_, i) => `MPW${last+i+1}`);
  tx.set(counter, {lastUsed:last+count, updatedAt:Date.now()}, {merge:true});
  tx.create(receipt, {uid, count, skus, createdAt:Date.now()});
  return skus;
 });
}
