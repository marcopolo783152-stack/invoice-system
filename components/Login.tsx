'use client';
import { useEffect } from 'react';
export interface LoginProps { onLogin: () => void; }
export default function Login({onLogin}:LoginProps) {
 useEffect(()=>{window.location.replace('/staff-login?next='+encodeURIComponent(window.location.pathname+window.location.search));},[]);
 return <p>Opening secure staff sign in… <a href="/staff-login">Continue</a></p>;
}
