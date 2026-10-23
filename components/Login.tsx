'use client';
import { useEffect } from 'react';
export interface LoginProps { onLogin: () => void; }
export default function Login({onLogin}:LoginProps) {
 useEffect(()=>{window.location.replace('/sign-in?next='+encodeURIComponent(window.location.pathname+window.location.search));},[]);
 return <p>Opening sign in… <a href="/sign-in">Continue</a></p>;
}
