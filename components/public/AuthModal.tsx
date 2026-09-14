'use client';
import {useEffect,useRef} from 'react';
import AccountAccess from '@/components/AccountAccess';
import styles from '@/components/Portal.module.css';
export function AuthModal({isOpen,onClose}:{isOpen:boolean;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=dialog.current;if(!el)return;if(isOpen&&!el.open)el.showModal();else if(!isOpen&&el.open)el.close();},[isOpen]);
 return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-label="Account sign in" className={styles.page+' '+styles.loginDialog}>
 <button onClick={onClose} aria-label="Close sign in" style={{float:'right'}}>Close</button>
 {isOpen&&<AccountAccess/>}
 </dialog>;
}
