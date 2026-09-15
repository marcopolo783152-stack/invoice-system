// Anonymous, first-party browser ID; no name, email or IP is recorded.
export async function recordListingActivity(rugId: string, kind: 'visit' | 'favorite' | 'unfavorite') {
  try {
    let visitor = localStorage.getItem('mp_listing_visitor');
    if (!visitor) { visitor = crypto.randomUUID(); localStorage.setItem('mp_listing_visitor', visitor); }
    const response = await fetch('/api/listing-activity', {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({rugId, kind, visitor})});
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}
