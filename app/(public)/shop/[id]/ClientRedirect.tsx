'use client';

import { useEffect } from 'react';

export function ClientRedirect({ rugId }: { rugId: string }) {
  useEffect(() => {
    // If the user lands here directly (e.g. from Google or a shared link), 
    // seamlessly transport them into the immersive SPA experience with the modal open.
    // Googlebot typically doesn't run this immediately or cares more about the HTML.
    window.location.replace(`/?item=${rugId}`);
  }, [rugId]);

  return null;
}
