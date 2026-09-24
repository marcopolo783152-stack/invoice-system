'use client';
import {useEffect,useMemo,useState} from 'react';
import {auth} from '@/lib/auth';

type Loan={id:string;borrowerName:string;borrowerEmail?:string;borrowerPhone?:string;principalCents:number;balanceCents:number;issuedDate:string;dueDate?:string|null;notes?:string;status:string};
type Payment={id:string;kind:string;amountCents:number;date:string;method?:string;notes?:string;createdAt:number;reversed?:boolean;reversalReason?:string};

const money=(c:number)=>'$'+(c/100).toFixed(2);
const requestId=()=>crypto.randomUUID().replace(/-/g,'_');
const esc=(v:string)=>v.replace(/[&<>\"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]||ch));

async function call(path:string,init?:RequestInit){
 const user=auth.currentUser;if(!user)throw new Error('Please sign in again.');
 const token=await user.getIdToken();
 const res=await fetch(path,{...init,headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,...(init?.headers||{})},cache:'no-store'});
 const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(body.error||'Request failed.');return body;
}

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

 return <div className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
   <div className="border p-4"><div className="text-xs uppercase text-gray-500">Total loaned</div><div className="text-2xl font-bold">{money(totals.principal)}</div></div>
   <div className="border p-4"><div className="text-xs uppercase text-gray-500">Outstanding</div><div className="text-2xl font-bold">{money(totals.balance)}</div></div>
   <div className="border p-4"><div className="text-xs uppercase text-gray-500">Overdue loans</div><div className="text-2xl font-bold">{totals.overdue}</div></div>
  </div>
  {status&&<p role="status" className="p-3 border border-amber-300 bg-amber-50">{status}</p>}
  <section className="border p-5">
   <h2 className="text-xl font-bold mb-4">Create interest-free loan</h2>
   <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={e=>{e.preventDefault();act(async()=>{await call('/api/loans',{method:'POST',body:JSON.stringify({action:'create',requestId:requestId(),...form})});setForm({...form,borrowerName:'',borrowerEmail:'',borrowerPhone:'',amount:'',dueDate:'',notes:''});await load();setStatus('Loan recorded.');});}}>
    <input required placeholder="Borrower full name" value={form.borrowerName} onChange={e=>setForm({...form,borrowerName:e.target.value})}/>
    <input type="email" placeholder="Email" value={form.borrowerEmail} onChange={e=>setForm({...form,borrowerEmail:e.target.value})}/>
    <input placeholder="Phone" value={form.borrowerPhone} onChange={e=>setForm({...form,borrowerPhone:e.target.value})}/>
    <input required type="number" min="0.01" step="0.01" placeholder="Loan amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
    <label>Issued date<input type="date" value={form.issuedDate} onChange={e=>setForm({...form,issuedDate:e.target.value})}/></label>
    <label>Due date<input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></label>
    <textarea className="md:col-span-2" placeholder="Notes / repayment agreement" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
    <button disabled={busy} className="bg-neutral-900 text-white px-4 py-2">Record loan</button>
   </form>
  </section>

  <section className="border overflow-x-auto">
   <table className="w-full text-sm"><thead><tr><th className="p-3 text-left">Borrower</th><th>Original</th><th>Balance</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>
   {loans.map(l=><tr key={l.id} className="border-t"><td className="p-3 font-semibold">{l.borrowerName}</td><td>{money(l.principalCents)}</td><td>{money(l.balanceCents)}</td><td>{l.dueDate||'-'}</td><td>{l.status}</td><td><button className="underline" onClick={()=>open(l).catch(e=>setStatus(e.message))}>Open</button></td></tr>)}
   {!loans.length&&<tr><td className="p-4" colSpan={6}>No loans recorded yet.</td></tr>}
   </tbody></table>
  </section>

  {selected&&<section className="border p-5 space-y-4">
   <div className="flex justify-between gap-4 flex-wrap"><div><h2 className="text-xl font-bold">{selected.borrowerName}</h2><div>Outstanding: <b>{money(selected.balanceCents)}</b> of {money(selected.principalCents)}</div></div><button onClick={()=>{setSelected(null);setPayments([]);}}>Close</button></div>
   {selected.balanceCents>0&&<form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={e=>{e.preventDefault();act(async()=>{await call('/api/loans',{method:'POST',body:JSON.stringify({action:'repay',loanId:selected.id,requestId:requestId(),...repay})});await open(selected);await load();setRepay({...repay,amount:'',notes:''});setStatus('Repayment recorded.');});}}>
    <input required type="number" min="0.01" step="0.01" max={(selected.balanceCents/100).toFixed(2)} placeholder="Payment amount" value={repay.amount} onChange={e=>setRepay({...repay,amount:e.target.value})}/>
    <input type="date" value={repay.date} onChange={e=>setRepay({...repay,date:e.target.value})}/>
    <input placeholder="Method" value={repay.method} onChange={e=>setRepay({...repay,method:e.target.value})}/>
    <input placeholder="Notes" value={repay.notes} onChange={e=>setRepay({...repay,notes:e.target.value})}/>
    <button disabled={busy} className="bg-emerald-700 text-white px-4 py-2">Record repayment</button>
   </form>}
   <h3 className="font-bold">Payment history</h3>
   <div className="space-y-2">{payments.map(p=><div key={p.id} className="border p-3 flex justify-between gap-3 flex-wrap"><div><b>{money(p.amountCents)}</b> · {p.date} · {p.method||'Unspecified'} {p.reversed&&<span className="text-red-700"> · REVERSED</span>}<div className="text-xs text-gray-500">{p.notes}</div></div><div className="flex gap-3"><button className="underline" onClick={()=>printReceipt(p)}>Print / PDF</button>{!p.reversed&&<button className="underline text-red-700" onClick={()=>{const reason=prompt('Reason for correction/reversal (required):');if(!reason)return;act(async()=>{await call('/api/loans',{method:'POST',body:JSON.stringify({action:'reverse',loanId:selected.id,paymentId:p.id,reason})});await open(selected);await load();setStatus('Repayment reversed with audit trail.');});}}>Reverse</button>}</div></div>)}</div>
  </section>}
 </div>;
}
