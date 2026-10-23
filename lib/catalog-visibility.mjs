// Temporary public-listing hold during processor review. Never changes stored inventory.
const reviewIds = new Set(['rug-1783796414468','rug-1783796464917','rug-1783796714385','rug-1783796678943','rug-1783796608166','rug-1783796497538','rug-1783796651385','rug-1783796624127','rug-1783796404975']);
export function isRugOnReviewHold(rug) {
  if (!rug) return true;
  if (reviewIds.has(rug.id) || ['9224261','197919','2812574'].includes(String(rug.sku || '').trim())) return true;
  const origin = String(rug.origin || '').normalize('NFKC').trim().toLowerCase();
  return /(^|[^a-z])(iran|iranian|persia|persian|persin|cuba|cuban|north\s+korea|dprk|syria|syrian|crimea|crimean|donetsk|donetska|luhansk|lugansk)([^a-z]|$)/i.test(origin) || /ایران|ايران/.test(origin);
}
