'use client';

import { useEffect } from 'react';

export function ClientRedirect({ rugId }: { rugId: string }) {
  useEffect(() => {
    window.location.replace(`/?item=${encodeURIComponent(rugId)}`);
  }, [rugId]);

  return null;
}
