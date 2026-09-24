'use client';
import {useEffect,useMemo,useState} from 'react';
import {auth} from '@/lib/auth';
import {AlertTriangle,CalendarDays,CircleDollarSign,Clock3,CreditCard,FileText,Mail,Phone,Plus,Printer,RotateCcw,UserRound,WalletCards,X} from 'lucide-react';

type Loan={id:string;borrowerName:string;borrowerEmail?:string;borrowerPhone?:string;principalCents:number;balanceCents:number;issuedDate:string;dueDate?:string|null;notes?:string;status:string};
type Payment={id:string;kind:string;amountCents:number;date:string;method?:string;notes?:string;createdAt:number;reversed?:boolean;reversalReason?:string};

const money=(c:number)=>'$'+(c/100).toFixed(2);
const requestId=()=>crypto.randomUUID().replace(/-/g,'_');
const htmlEntities:Record<string,string>={"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"};
const esc=(v:string)=>v.replace(/[&<>\"']/g,ch=>htmlEntities[ch]||ch);

async function call(path:string,init?:RequestInit){
 const user=auth.currentUser;if(!user)throw new Error('Please sign in again.');
 const token=await user.getIdToken();
 const headers=new Headers(init?.headers);headers.set('Content-Type','application/json');headers.set('Authorization','Bearer '+token);
 const res=await fetch(path,{...init,headers,cache:'no-store'});
 const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(body.error||'Request failed.');return body;
}

const inputClass='w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100/70';
const labelClass='mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500';

export default function LoansAdminTab(){
 const [loans,setLoans]=useState<Loan[]>([]),[selected,setSelected]=useState<Loan|null>(null),[payments,setPayments]=useState<Payment[]>([]);
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const [form,setForm]=useState({borrowerName:'',borrowerEmail:'',borrowerPhone:'',amount:'',issuedDate:new Date().toISOString().slice(0,10),dueDate:'',notes:''});
 const [repay,setRepay]=useState({amount:'',date:new Date().toISOString().slice(0,10),method:'Cash',notes:''});
 const load=async()=>{const d=await call('/api/loans');setLoans(d.loans||[]);};
 const open=async(loan:Loan)=>{setSelected(loan);const d=await call('/api/loans?id='+encodeURIComponent(loan.id));setSelected(d.loan);setPayments(d.payments||[]);};
 useEffect(()=>{load().catch(e=>setStatus(e.message));},[]);
 const totals=useMemo(()=>({principal:loans.reduce((s,l)=>s+l.principalCents,0),balance:loans.reduce((s,l)=>s+l.balanceCents,0),overdue:loans.filter(l=>l.status==='overdue').length}),[loans]);
 const act=async(fn:()=>Promise<void>)=>{setBusy(true);setStatus('');try{await fn();}catch(e){setStatus(e instanceof Error?e.message:'Something went wrong.');}finally{setBusy(false);}};

 const printReceipt=(p:Payment)=>{
  if(!selected)return;
  const html=`<!doctype html><html><head><title>Loan receipt</title><style>body{font-family:Arial;padding:40px;color:#111}h1{margin:0 0 6px}.box{border:1px solid #bbb;padding:22px;margin-top:24px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}.muted{color:#666}.sig{margin-top:70px;display:flex;gap:60px}.sig div{width:45%;border-top:1px solid #777;padding-top:8px}</style></head><body><h1>MARCO POLO ORIENTAL RUGS INC.</h1><div class="muted">Loan repayment receipt</div><div class="box"><div class="row"><b>Borrower</b><span>${esc(selected.borrowerName)}</span></div><div class="row"><b>Receipt</b><span>LN-${selected.id.slice(0,6).toUpperCase()}-${p.id.slice(-8).toUpperCase()}</span></div><div class="row"><b>Date</b><span>${p.date}</span></div><div class="row"><b>Amount paid</b><span>${money(p.amountCents)}</span></div><div class="row"><b>Method</b><span>${esc(p.method||'-')}</span></div><div class="row"><b>Notes</b><span>${esc(p.notes||'-')}</span></div></div><div class="sig"><div>Authorized signature</div><div>Borrower signature</div></div><script>window.onload=()=>window.print()</script></body></html>`;
  const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();}
 };

 const statusClass=(value:string)=>value==='paid'?'bg-emerald-100 text-emerald-700 ring-emerald-200':value==='overdue'?'bg-rose-100 text-rose-700 ring-rose-200':'bg-teal-100 text-teal-700 ring-teal-200';

 return <div className="relative overflow-hidden rounded-[30px] bg-[#fffaf7] p-3 sm:p-5">
  <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-rose-100/60 blur-3xl"/>
  <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl"/>

  <div className="relative space-y-5">
   <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div className="rounded-[26px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm">
     <div className="flex items-center gap-4"><div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><CircleDollarSign size={26}/></div><div><div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700/75">Total loaned</div><div className="mt-1 font-serif text-3xl font-semibold text-slate-900">{money(totals.principal)}</div></div></div>
    </div>
    <div className="rounded-[26px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm">
     <div className="flex items-center gap-4"><div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700"><WalletCards size={26}/></div><div><div className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-700/75">Outstanding</div><div className="mt-1 font-serif text-3xl font-semibold text-slate-900">{money(totals.balance)}</div></div></div>
    </div>
    <div className="rounded-[26px] border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-pink-50 p-5 shadow-sm">
     <div className="flex items-center gap-4"><div className="rounded-2xl bg-rose-100 p-3 text-rose-600"><AlertTriangle size={26}/></div><div><div className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700/75">Overdue loans</div><div className="mt-1 font-serif text-3xl font-semibold text-slate-900">{totals.overdue}</div></div></div>
    </div>
   </div>

   {status&&<div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm">{status}</div>}

   <section className="rounded-[28px] border border-rose-100 bg-white/95 p-5 shadow-[0_18px_60px_rgba(133,79,57,0.08)] sm:p-7">
    <div className="mb-6 flex items-center gap-3"><div className="rounded-2xl bg-gradient-to-br from-rose-200 to-orange-100 p-3 text-rose-600 shadow-sm"><Plus size={24}/></div><div><h2 className="font-serif text-2xl font-semibold text-slate-900">Create interest-free loan</h2><p className="text-sm text-slate-500">Record a new loan and keep the repayment history organized.</p></div></div>
    <form className="grid grid-cols-1 gap-4 md:grid-cols-3" onSubmit={e=>{e.preventDefault();act(async()=>{await call('/api/loans',{method:'POST',body:JSON.stringify({action:'create',requestId:requestId(),...form})});setForm({...form,borrowerName:'',borrowerEmail:'',borrowerPhone:'',amount:'',dueDate:'',notes:''});await load();setStatus('Loan recorded.');});}}>
     <label><span className={labelClass}><UserRound size={14}/>Borrower full name</span><input className={inputClass} required placeholder="Enter borrower name" value={form.borrowerName} onChange={e=>setForm({...form,borrowerName:e.target.value})}/></label>
     <label><span className={labelClass}><Mail size={14}/>Email</span><input className={inputClass} type="email" placeholder="name@example.com" value={form.borrowerEmail} onChange={e=>setForm({...form,borrowerEmail:e.target.value})}/></label>
     <label><span className={labelClass}><Phone size={14}/>Phone</span><input className={inputClass} placeholder="Enter phone number" value={form.borrowerPhone} onChange={e=>setForm({...form,borrowerPhone:e.target.value})}/></label>
     <label><span className={labelClass}><CircleDollarSign size={14}/>Loan amount</span><input className={inputClass} required type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
     <label><span className={labelClass}><CalendarDays size={14}/>Issued date</span><input className={inputClass} type="date" value={form.issuedDate} onChange={e=>setForm({...form,issuedDate:e.target.value})}/></label>
     <label><span className={labelClass}><CalendarDays size={14}/>Due date</span><input className={inputClass} type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></label>
     <label className="md:col-span-2"><span className={labelClass}><FileText size={14}/>Notes / repayment agreement</span><textarea className={inputClass+' min-h-[52px] resize-y'} placeholder="Add notes or repayment agreement..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
     <div className="flex items-end"><button disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"><span className="inline-flex items-center gap-2"><Plus size={17}/>Record loan</span></button></div>
    </form>
   </section>

   <section className="overflow-hidden rounded-[24px] border border-rose-100 bg-white shadow-sm">
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
     <thead className="bg-gradient-to-r from-rose-50 via-pink-50 to-emerald-50 text-[10px] uppercase tracking-[0.18em] text-slate-500"><tr><th className="px-5 py-4 text-left">Borrower</th><th className="px-4 py-4 text-left">Original</th><th className="px-4 py-4 text-left">Balance</th><th className="px-4 py-4 text-left">Due</th><th className="px-4 py-4 text-left">Status</th><th className="px-4 py-4"></th></tr></thead>
     <tbody>{loans.map(l=><tr key={l.id} className="border-t border-slate-100 bg-gradient-to-r from-white to-emerald-50/30 transition hover:from-rose-50/50 hover:to-emerald-50/50"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="rounded-full bg-rose-100 p-2 text-rose-500"><UserRound size={16}/></div><span className="font-semibold text-slate-800">{l.borrowerName}</span></div></td><td className="px-4 py-4 font-medium text-slate-700">{money(l.principalCents)}</td><td className="px-4 py-4 font-semibold text-slate-900">{money(l.balanceCents)}</td><td className="px-4 py-4 text-slate-600">{l.dueDate||'—'}</td><td className="px-4 py-4"><span className={'inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 '+statusClass(l.status)}>{l.status}</span></td><td className="px-4 py-4 text-right"><button className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50" onClick={()=>open(l).catch(e=>setStatus(e.message))}>Open</button></td></tr>)}
     {!loans.length&&<tr><td className="px-5 py-8 text-center text-slate-500" colSpan={6}>No loans recorded yet.</td></tr>}</tbody>
    </table></div>
   </section>

   {selected&&<section className="rounded-[28px] border border-rose-100 bg-white p-5 shadow-[0_18px_60px_rgba(133,79,57,0.08)] sm:p-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 px-4 py-3">
     <div className="flex items-center gap-3"><div className="rounded-full bg-rose-200 p-3 text-rose-600"><UserRound size={20}/></div><div><h2 className="font-serif text-2xl font-semibold text-slate-900">{selected.borrowerName}</h2><p className="text-sm text-slate-500">Outstanding: <b className="text-slate-900">{money(selected.balanceCents)}</b> of {money(selected.principalCents)}</p></div></div>
     <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50" onClick={()=>{setSelected(null);setPayments([]);}}><X size={15}/>Close</button>
    </div>

    {selected.balanceCents>0&&<form className="grid grid-cols-1 gap-4 md:grid-cols-4" onSubmit={e=>{e.preventDefault();act(async()=>{await call('/api/loans',{method:'POST',body:JSON.stringify({action:'repay',loanId:selected.id,requestId:requestId(),...repay})});await open(selected);await load();setRepay({...repay,amount:'',notes:''});setStatus('Repayment recorded.');});}}>
     <label><span className={labelClass}><CircleDollarSign size={14}/>Payment amount</span><input className={inputClass} required type="number" min="0.01" step="0.01" max={(selected.balanceCents/100).toFixed(2)} placeholder="0.00" value={repay.amount} onChange={e=>setRepay({...repay,amount:e.target.value})}/></label>
     <label><span className={labelClass}><CalendarDays size={14}/>Payment date</span><input className={inputClass} type="date" value={repay.date} onChange={e=>setRepay({...repay,date:e.target.value})}/></label>
     <label><span className={labelClass}><CreditCard size={14}/>Payment method</span><select className={inputClass} value={repay.method} onChange={e=>setRepay({...repay,method:e.target.value})}><option>Cash</option><option>Credit Card</option><option>Debit Card</option><option>Check</option><option>Bank Transfer</option><option>Other</option></select></label>
     <label><span className={labelClass}><FileText size={14}/>Notes</span><input className={inputClass} placeholder="Add notes..." value={repay.notes} onChange={e=>setRepay({...repay,notes:e.target.value})}/></label>
     <button disabled={busy} className="md:col-span-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 disabled:opacity-50"><span className="inline-flex items-center gap-2"><CreditCard size={16}/>Record repayment</span></button>
    </form>}

    <div className="mt-7">
     <div className="mb-3 flex items-center gap-2 font-serif text-xl font-semibold text-slate-900"><Clock3 size={19} className="text-rose-500"/>Payment history</div>
     <div className="overflow-hidden rounded-2xl border border-rose-100">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 bg-rose-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700"><div>Amount</div><div>Date</div><div>Method</div><div>Actions</div></div>
      {payments.map(p=><div key={p.id} className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-white px-4 py-4 text-sm md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
       <div className="font-bold text-slate-900">{money(p.amountCents)} {p.reversed&&<span className="ml-2 rounded-full bg-rose-100 px-2 py-1 text-[10px] text-rose-700">REVERSED</span>}</div>
       <div className="text-slate-600">{p.date}</div>
       <div className="text-slate-600">{p.method||'Unspecified'}</div>
       <div className="flex flex-wrap gap-2"><button className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100" onClick={()=>printReceipt(p)}><Printer size={14}/>Print / PDF</button>{!p.reversed&&<button className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100" onClick={()=>{const reason=prompt('Reason for correction/reversal (required):');if(!reason)return;act(async()=>{await call('/api/loans',{method:'POST',body:JSON.stringify({action:'reverse',loanId:selected.id,paymentId:p.id,reason})});await open(selected);await load();setStatus('Repayment reversed with audit trail.');});}}><RotateCcw size={14}/>Reverse</button>}</div>
       {p.notes&&<div className="md:col-span-4 text-xs text-slate-400">{p.notes}</div>}
      </div>)}
      {!payments.length&&<div className="px-4 py-6 text-sm text-slate-500">No repayments recorded yet.</div>}
     </div>
    </div>
   </section>}
  </div>
 </div>;
}
