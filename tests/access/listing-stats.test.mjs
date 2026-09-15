import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recentActivity, recordActivity} from '../../lib/listing-stats.mjs';
const now = new Date('2026-09-15T12:00:00Z');
test('30 calendar days include the boundary and exclude older/future data', () => {
  const result = recentActivity({'2026-08-16': {visits: 100}, '2026-08-17': {visits: 2, favorites: 1}, '2026-09-15': {visits: 3, favorites: 2}, '2026-09-16': {visits: 100}}, now);
  assert.equal(result.visits, 5); assert.equal(result.favorites, 3);
});
test('repeat page loads are counted once per browser and UTC day', () => {
  const first = recordActivity({views: 10}, {}, 'visit', now);
  const twice = recordActivity(first.rug, first.visitor, 'visit', now);
  assert.equal(twice.rug.views, 11);
  assert.equal(recentActivity(twice.rug.engagementDaily, now).visits, 1);
  const tomorrow = recordActivity(twice.rug, twice.visitor, 'visit', new Date('2026-09-16T00:00:00Z'));
  assert.equal(tomorrow.rug.views, 12);
});
test('favorite toggles do not inflate daily additions and unfavorite does not go negative', () => {
  const first = recordActivity({}, {}, 'favorite', now);
  const repeated = recordActivity(first.rug, first.visitor, 'favorite', now);
  assert.equal(repeated.rug.favorites, 1);
  const removed = recordActivity(repeated.rug, repeated.visitor, 'unfavorite', now);
  assert.equal(removed.rug.favorites, 0);
  const again = recordActivity(removed.rug, removed.visitor, 'favorite', now);
  assert.equal(again.rug.favorites, 1);
  assert.equal(recentActivity(again.rug.engagementDaily, now).favorites, 1);
});
test('legacy totals are preserved, never used to invent 30-day history', () => {
  const next = recordActivity({views: 900, favorites: 12}, {}, 'visit', now);
  assert.equal(next.rug.views, 901); assert.equal(next.rug.favorites, 12);
  assert.equal(recentActivity(next.rug.engagementDaily, now).visits, 1);
  assert.equal(next.rug.engagementStartedAt, now.toISOString());
});
