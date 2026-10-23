import React, {useState} from "react";
import {estimateTabs,estimateCounts,estimateStatuses,filterEstimates} from "@/lib/estimate-inbox.mjs";
import {estimateRugs} from "@/lib/service-estimate.mjs";
import { useStore } from "@/context/StoreContext";
import { Calendar, Mail, MapPin, Phone, ExternalLink } from "lucide-react";

export function EstimatesAdminTab() {
  const { estimates, updateEstimateStatus, markEstimateRead, deleteEstimate } = useStore();
  const [tab,setTab]=useState('new');
  const [query,setQuery]=useState('');
  const [opened,setOpened]=useState<Set<string>>(new Set());
  const [busy,setBusy]=useState<Set<string>>(new Set());
  const [error,setError]=useState('');
  const counts=estimateCounts(estimates||[]);
  const sortedEstimates=filterEstimates(estimates||[],tab,query);
  async function changeStatus(id:string,status:string){
    setError('');setBusy(previous=>new Set(previous).add(id));
    try{await updateEstimateStatus(id,status);}
    catch{setError('Could not save the status. The request has not been moved. Please try again.');}
    finally{setBusy(previous=>{const next=new Set(previous);next.delete(id);return next;});}
  }
  async function toggleRequest(est:any){
    const opening=!opened.has(est.id);
    setOpened(previous=>{const next=new Set(previous);if(opening)next.add(est.id);else next.delete(est.id);return next;});
    if(opening&&!est.readAt){try{await markEstimateRead(est.id);}catch{setError('Details are open, but the read marker could not be saved. Please try again.');}}
  }

  return (
    <div className="space-y-6">
      <h3 className="font-serif text-2xl text-editorial-text mb-6">Service Estimate Requests</h3>
      
      <div className="flex flex-wrap gap-2" role="group" aria-label="Request sections">
        {estimateTabs.map(item=><button type="button" key={item.id} aria-pressed={tab===item.id} onClick={()=>setTab(item.id)} className={`rounded-xl border px-4 py-3 font-semibold flex items-center gap-2 ${tab===item.id?'bg-[#203e37] text-white border-[#203e37]':'bg-white text-[#203e37] border-neutral-200 hover:bg-emerald-50'}`}>{item.label}<span className={`rounded-full px-2 py-0.5 text-xs ${item.id==='new'&&counts.new>0?'bg-red-600 text-white':'bg-neutral-100 text-neutral-700'}`}>{counts[item.id as keyof typeof counts]}</span></button>)}
      </div>
      <label className="block text-sm font-semibold text-neutral-600">Search requests<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, phone, email, rug or request number" className="mt-2 block w-full rounded-xl border border-neutral-200 p-3 bg-white focus:outline-emerald-700"/></label>
      <p className="text-sm text-neutral-500">New requests stay here until you take action. Open details to review; update the status after contacting the customer or providing an estimate.</p>
      {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
      {!sortedEstimates.length&&<p className="p-8 text-center text-neutral-500 border border-dashed rounded-xl">{query?'No matching requests in this section. Try All to search every request.':tab==='new'?'No new requests waiting for action.':'No requests in this section.'}</p>}
      <div className="grid grid-cols-1 gap-6">
        {sortedEstimates.map((est:any) => (
          <div key={est.id} className="bg-white border border-neutral-200 shadow-sm p-6 flex flex-col md:flex-row gap-6">
            <div className="flex-grow space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg">{est.name}</h4>
                  <p className="text-xs text-neutral-500">{new Date(est.createdAt).toLocaleString()}</p>
                </div>
                <span className="px-3 py-1 bg-neutral-100 text-xs font-bold uppercase tracking-widest text-neutral-700">
                  {est.status||'New'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-light text-neutral-600">
                <p className="flex items-center"><Phone className="w-4 h-4 mr-2" /> {est.phone}</p>
                <p className="flex items-center"><Mail className="w-4 h-4 mr-2" /> {est.email}</p>
                <p className="flex items-center"><MapPin className="w-4 h-4 mr-2" /> Zip: {est.zip}</p>
                <p className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> {est.pickupPreference}</p>
              </div>

              <button type="button" aria-expanded={opened.has(est.id)} onClick={()=>toggleRequest(est)} className="rounded-lg border border-[#b8cec2] bg-[#f3f8f5] px-4 py-2 font-semibold text-[#203e37]">{opened.has(est.id)?'Hide details':'Open request'}{!est.readAt&&!opened.has(est.id)?' · Unread':''}</button>
              {opened.has(est.id)&&<>
              <p className="text-sm font-semibold text-[#203e37]">{estimateRugs(est).length} {estimateRugs(est).length===1?'rug':'rugs'} in this request</p>
              {estimateRugs(est).map((rug:any,index:number)=>(
                <section key={rug.id||index} className="bg-[#fffdf8] p-4 border border-[#e5ddcf] rounded-xl space-y-3 text-sm">
                  <h5 className="font-serif text-lg text-[#203e37]">Rug {index+1}</h5>
                  <p><strong>Service:</strong> {rug.service}</p>
                  <p><strong>Rug Type:</strong> {rug.rugType}</p>
                  <p><strong>Size:</strong> {rug.dimensions||'Size not provided'}</p>
                  {rug.description&&<p className="whitespace-pre-wrap"><strong>Description:</strong> {rug.description}</p>}
                  {rug.images?.length>0&&<div><p className="text-xs font-bold uppercase tracking-widest mb-2">Photos for rug {index+1}</p><div className="flex gap-2 overflow-x-auto pb-2">{rug.images.map((img:string,i:number)=><a key={i} href={img} target="_blank" rel="noopener noreferrer" className="relative group block shrink-0"><img src={img} alt={`Rug ${index+1}, photo ${i+1}`} className="w-20 h-20 object-cover rounded-lg border border-neutral-200"/><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ExternalLink className="text-white w-5 h-5"/></div></a>)}</div></div>}
                </section>
              ))}
              {est.notes&&<p className="text-sm whitespace-pre-wrap"><strong>Notes:</strong> {est.notes}</p>}
              </>}
            </div>
            
            <div className="w-full md:w-48 flex flex-col gap-2 shrink-0 border-l border-neutral-100 pl-0 md:pl-6 pt-4 md:pt-0">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Update Status</label>
              <select 
                value={est.status||'New'} disabled={busy.has(est.id)} 
                onChange={(e) => changeStatus(est.id, e.target.value)}
                className="w-full border border-neutral-200 p-2 text-sm outline-none focus:border-editorial-accent bg-white"
              >
                {!estimateStatuses.includes(est.status||'New')&&<option value={est.status}>{est.status}</option>}
                {estimateStatuses.map(status=><option key={status} value={status}>{status}</option>)}
              </select>
              
              {busy.has(est.id)&&<p role="status" className="text-sm text-neutral-500">Saving…</p>}
              <button type="button" disabled={busy.has(est.id)} onClick={()=>changeStatus(est.id,!est.status||est.status==='New'?'Contacted':'New')} className="rounded-lg bg-[#203e37] text-white px-3 py-2 text-sm font-semibold disabled:opacity-50">{!est.status||est.status==='New'?'Mark contacted':'Move back to New'}</button>
              <button type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this request?")) {
                    deleteEstimate(est.id);
                  }
                }}
                className="mt-auto w-full border border-red-200 text-red-600 font-bold uppercase tracking-widest text-xs py-2 hover:bg-red-50 transition-colors"
              >
                Delete Request
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
