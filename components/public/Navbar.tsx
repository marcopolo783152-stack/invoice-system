'use client';
import React,{useEffect,useRef,useState} from 'react';
import {ShoppingBag,Menu,X,Landmark,User,Phone,ChevronDown} from 'lucide-react';
import {useStore} from '@/context/StoreContext';
import {AuthModal} from './AuthModal';
import RugCalculatorModal from '../RugCalculatorModal';
import s from './Navigation.module.css';
import {signedInDestination} from '@/lib/login-routing';
export const Navbar=({currentTab,setCurrentTab}:{currentTab:string;setCurrentTab:(tab:string)=>void})=>{
 const {cart,setCartOpen,currentUser,logoUrl,activeView,setActiveView}=useStore();
 const [menu,setMenu]=useState(false),[more,setMore]=useState(false),[auth,setAuth]=useState(false),[calculator,setCalculator]=useState(false);
 const moreRef=useRef<HTMLDivElement>(null),menuButton=useRef<HTMLButtonElement>(null);
 const count=cart.reduce((n,i)=>n+i.quantity,0);
 const go=(tab:string)=>{setCurrentTab(tab);setMenu(false);setMore(false);if(activeView==='admin')setActiveView('customer');window.scrollTo({top:0,behavior:'auto'});};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMore(false);if(menu){setMenu(false);menuButton.current?.focus();}}};const outside=(e:PointerEvent)=>{if(!moreRef.current?.contains(e.target as Node))setMore(false);};document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside);};},[menu]);
 const items=[['home','Home'],['shop','Shop rugs'],['book','Visit the showroom']],extra=[['track','Track your order'],['blog','Stories & rug care'],['auction','Auctions · Coming soon']];
 const account=async()=>{setMenu(false);if(!currentUser){setAuth(true);return;}try{window.location.assign(await signedInDestination());}catch{window.location.assign('/sign-in');}};
 return <><div className={s.utility}><span>Alexandria, Virginia · Since 1988</span><a href="tel:+17034610207"><Phone size={13}/> (703) 461-0207</a><span className={s.shipping}>Free shipping & complimentary padding</span></div>
 <nav className={s.nav} aria-label="Main navigation"><div className={s.inner}>
 <a href="/" className={s.brand} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();go('home');}}>{logoUrl?<img src={logoUrl} alt="Marco Polo Rugs"/>:<><span className={s.emblem}><Landmark size={23}/></span><span>Marco Polo<small>Oriental Rugs · Since 1988</small></span></>}</a>
 <div className={s.desktop}>{items.map(([id,label])=><button key={id} aria-current={currentTab===id?'page':undefined} onClick={()=>go(id)}>{label}</button>)}<div className={s.more} ref={moreRef}><button aria-expanded={more} aria-controls="showroom-more" onClick={()=>setMore(v=>!v)}>More <ChevronDown size={15}/></button>{more&&<div id="showroom-more" className={s.dropdown}>{extra.map(([id,label])=><button key={id} onClick={()=>go(id)}>{label}</button>)}<a href="/services/rug-cleaning-alexandria-va">Cleaning & restoration</a><button onClick={()=>{setMore(false);setCalculator(true);}}>Rug calculator</button></div>}</div></div>
 <div className={s.actions}><button className={s.account} onClick={account}><User size={19}/><span>{currentUser?'My account':'Sign in'}</span></button><button className={s.cart} aria-label={`Open shopping cart${count?', '+count+' items':''}`} onClick={()=>setCartOpen(true)}><ShoppingBag size={21}/>{count>0&&<span>{count}</span>}</button><button ref={menuButton} className={s.menuToggle} aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} aria-controls="showroom-mobile-menu" onClick={()=>setMenu(v=>!v)}>{menu?<X size={22}/>:<Menu size={22}/>}</button></div>
 </div>{menu&&<div id="showroom-mobile-menu" className={s.mobile}>{[...items,...extra].map(([id,label])=><button key={id} aria-current={currentTab===id?'page':undefined} onClick={()=>go(id)}>{label}</button>)}<a href="/services/rug-cleaning-alexandria-va">Cleaning & restoration</a><button onClick={()=>{setMenu(false);setCalculator(true);}}>Rug calculator</button><button onClick={account}>{currentUser?'Open my account':'Sign in / Create account'}</button><a href="tel:+17034610207">Talk to our showroom · (703) 461-0207</a></div>}</nav>
 <AuthModal isOpen={auth} onClose={()=>setAuth(false)}/><RugCalculatorModal isOpen={calculator} onClose={()=>setCalculator(false)}/></>;
};
