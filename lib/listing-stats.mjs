export function recentActivity(days = {}, now = new Date()) {
  const end = now.toISOString().slice(0, 10);
  const startDate = new Date(now); startDate.setUTCDate(startDate.getUTCDate() - 29);
  const start = startDate.toISOString().slice(0, 10);
  const kept = {};
  let visits = 0, favorites = 0;
  for (const [day, counts] of Object.entries(days)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day >= start && day <= end) {
      const v = Number.isSafeInteger(counts?.visits) && counts.visits >= 0 ? counts.visits : 0;
      const f = Number.isSafeInteger(counts?.favorites) && counts.favorites >= 0 ? counts.favorites : 0;
      kept[day] = {visits: v, favorites: f}; visits += v; favorites += f;
    }
  }
  return {days: kept, visits, favorites};
}
export function recordActivity(rug, visitor, kind, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const days = recentActivity(rug.engagementDaily, now).days;
  const counts = days[day] || {visits: 0, favorites: 0};
  const next = {...visitor};
  let views = Math.max(0, Number(rug.views) || 0), favorites = Math.max(0, Number(rug.favorites) || 0);
  if (kind === 'visit' && visitor.lastVisitDay !== day) { counts.visits++; views++; next.lastVisitDay = day; }
  if (kind === 'favorite') {
    if (!visitor.favorite) favorites++;
    if (visitor.lastFavoriteDay !== day) { counts.favorites++; next.lastFavoriteDay = day; }
    next.favorite = true;
  }
  if (kind === 'unfavorite') { if (visitor.favorite) favorites = Math.max(0, favorites - 1); next.favorite = false; }
  days[day] = counts;
  return {rug: {engagementDaily: days, engagementStartedAt: rug.engagementStartedAt || now.toISOString(), views, favorites}, visitor: next};
}
