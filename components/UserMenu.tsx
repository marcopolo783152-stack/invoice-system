import React from 'react';
import { logout } from '@/lib/firebase-auth';

export default function UserMenu({ user, onLogout }: { user: any, onLogout: () => void }) {
  return (
    <div style={{ position: 'absolute', top: 16, right: 16, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0002', padding: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <strong>{user?.email}</strong>
      </div>
      <button onClick={async () => { await logout(); onLogout(); }} style={{ width: '100%', padding: 8 }}>Logout</button>
    </div>
  );
}
