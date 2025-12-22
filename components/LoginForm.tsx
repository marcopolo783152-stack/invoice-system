import React, { useState } from 'react';
import { login, signup } from '@/lib/firebase-auth';

export default function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto', padding: 24 }}>
      <h2>{isSignup ? 'Sign Up' : 'Login'}</h2>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{ width: '100%', marginBottom: 12 }} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ width: '100%', marginBottom: 12 }} />
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <button type="submit" style={{ width: '100%', padding: 10 }}>{isSignup ? 'Sign Up' : 'Login'}</button>
      <button type="button" onClick={() => setIsSignup(s => !s)} style={{ width: '100%', marginTop: 8 }}>
        {isSignup ? 'Already have an account? Login' : 'No account? Sign Up'}
      </button>
    </form>
  );
}
