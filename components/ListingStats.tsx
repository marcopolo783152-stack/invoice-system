import {Rug} from '@/types';
import {recentActivity} from '@/lib/listing-stats.mjs';
export default function ListingStats({rug}: {rug: Rug}) {
  const stats = recentActivity(rug.engagementDaily);
  return <div style={{borderTop: '1px solid #e7e5e4', padding: '12px 0', fontSize: 12, lineHeight: 1.7}}>
    <p style={{fontSize: 10, fontWeight: 700, letterSpacing: 1}}>LAST 30 DAYS</p>
    {rug.engagementStartedAt ? <>
      <p>{stats.visits.toLocaleString()} visits | {stats.favorites.toLocaleString()} favorites</p>
      <p style={{fontSize: 10, color: '#78716c'}}>Recorded since {new Date(rug.engagementStartedAt).toLocaleDateString()}</p>
    </> : <p style={{color: '#78716c'}}>Awaiting first tracked activity</p>}
    <p style={{fontSize: 10, fontWeight: 700, letterSpacing: 1, marginTop: 6}}>LIFETIME COUNTERS</p>
    <p>{(rug.views || 0).toLocaleString()} views | {(rug.favorites || 0).toLocaleString()} saved favorites</p>
  </div>;
}
