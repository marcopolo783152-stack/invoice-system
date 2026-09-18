// Temporary public-listing hold during processor review. Never changes stored inventory.
const reviewIds = new Set(['rug-1783796414468','rug-1783796464917','rug-1783796714385','rug-1783796678943','rug-1783796608166','rug-1783796497538']);
export function isRugOnReviewHold(rug) {
  if (!rug) return true;
  if (reviewIds.has(rug.id)) return true;
  const origin = String(rug.origin || '').normalize('NFKC').trim().toLowerCase();
  return /(^|[^a-z])(iran|iranian|persia|persian)([^a-z]|$)/i.test(origin) || /ایران|ايران/.test(origin);
}
