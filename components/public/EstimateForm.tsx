'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, CheckCircle2, UploadCloud, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { SHOWROOM_ESTIMATES } from '@/lib/showroom-firebase';
import { submitServiceEstimate } from '@/lib/service-estimate.mjs';
import { collection, doc, setDoc } from 'firebase/firestore';
import { calculateSquareFoot, formatSquareFoot } from '@/lib/calculations';
import { db, storage, isFirebaseConfigured } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {auth} from '@/lib/auth';
import {customerEmailEvent} from '@/lib/customer-email-client';


type RugDraft = {id: string; service: string; rugType: string; widthFeet: number; widthInches: number; lengthFeet: number; lengthInches: number; description: string; files: File[]};
const newRug = (): RugDraft => ({id: crypto.randomUUID(),service:'Rug Cleaning',rugType:'Persian / Oriental',widthFeet:0,widthInches:0,lengthFeet:0,lengthInches:0,description:'',files:[]});
const initialRug: RugDraft = {id:'first-rug',service:'Rug Cleaning',rugType:'Persian / Oriental',widthFeet:0,widthInches:0,lengthFeet:0,lengthInches:0,description:'',files:[]};
function PhotoPreview({file}: {file: File}) {
 const [url,setUrl]=useState('');
 useEffect(()=>{const value=URL.createObjectURL(file);setUrl(value);return ()=>URL.revokeObjectURL(value);},[file]);
 return <img src={url||undefined} alt="Selected rug photo" className="w-20 h-20 object-cover rounded-lg border border-neutral-200"/>;
}

export default function EstimateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [rugs,setRugs] = useState<RugDraft[]>([{...initialRug}]);
  const submitting=useRef(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    service: 'Rug Cleaning',
    rugType: 'Persian / Oriental',
    dimensions: '',
    widthFeet: 0,
    widthInches: 0,
    lengthFeet: 0,
    lengthInches: 0,
    description: '',
    pickupPreference: 'Pickup & Delivery',
    appointmentDate: '',
    notes: ''
  });

  const changeRug = (id:string,field:string,value:string|number) => setRugs(prev=>prev.map(rug=>rug.id===id?{...rug,[field]:value}:rug));
  const addPhotos = (id:string,selected:FileList|null) => {
    if(!selected)return;
    const incoming=Array.from(selected),rug=rugs.find(r=>r.id===id);
    if(!rug)return;
    if(rug.files.length+incoming.length>5){setError('Please choose up to five photos for each rug.');return;}
    if(incoming.some(f=>!f.type.startsWith('image/')||f.size>10*1024*1024)){setError('Please choose image files up to 10 MB each.');return;}
    setError('');setRugs(prev=>prev.map(r=>r.id===id?{...r,files:[...r.files,...incoming]}:r));
  };
  const removePhoto = (id:string,index:number) => setRugs(prev=>prev.map(r=>r.id===id?{...r,files:r.files.filter((_,i)=>i!==index)}:r));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    if (target.type === 'number') {
      setFormData(prev => ({ ...prev, [target.name]: Number(target.value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [target.name]: target.value }));
    }
  };

  const uploadImages = async (selected: File[]) => {
    if (!storage) throw new Error("Photo uploads are temporarily unavailable. Please try again, or remove the photos to submit your request.");
    const urls: string[] = [];
    for (const file of selected) {
      const fileRef = ref(storage, `estimates/${crypto.randomUUID()}-${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      urls.push(url);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current=true;
    setIsSubmitting(true);
    setError('');

    try {
      if (!db || !isFirebaseConfigured()) throw new Error("The request form is temporarily unavailable. Please call (703) 461-0207.");
      await auth.authStateReady();
      const requestId = await submitServiceEstimate({
        formData,
        files: [],
        rugs,
        createReference: () => doc(collection(db!, SHOWROOM_ESTIMATES)),
        uploadImages,
        write: (reference: any, data: any) => setDoc(reference, {...data,...(auth.currentUser?{ownerUid:auth.currentUser.uid}:{})}),
      });
      await customerEmailEvent(SHOWROOM_ESTIMATES,requestId);
      setIsSuccess(true);

    } catch (err: any) {
      setError(err.code === 'permission-denied'
        ? "We couldn’t save your request. Your details are still here—please try again or call (703) 461-0207."
        : err.message || "We couldn’t submit your request. Please try again.");
    } finally {
      submitting.current=false;
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-12 text-center rounded-sm">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
        <h3 className="text-2xl font-serif text-emerald-900 mb-4">Request Received</h3>
        <p className="text-emerald-700 font-light max-w-md mx-auto">
          Thank you, {formData.name}. Our master artisans are reviewing your {rugs.length === 1 ? 'rug' : `${rugs.length} rugs`} and will contact you shortly regarding your estimate.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-neutral-100 p-8 shadow-sm rounded-sm max-w-3xl mx-auto space-y-6">
      {error && (
        <div role="alert" className="bg-red-50 text-red-700 p-4 text-sm font-medium border border-red-200">
          {error}
        </div>
      )}

      <fieldset disabled={isSubmitting} className="space-y-6 disabled:opacity-70">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Full Name</label>
          <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Email Address</label>
          <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Phone Number</label>
          <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">ZIP Code</label>
          <input required type="text" name="zip" value={formData.zip} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
        </div>
      </div>

      <div>
        <label htmlFor="pickup-preference" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Logistics Preference</label>
        <select id="pickup-preference" name="pickupPreference" value={formData.pickupPreference} onChange={handleChange} className="w-full border border-neutral-200 p-3 rounded-lg outline-none focus:border-editorial-accent text-sm">
          <option>Pickup &amp; Delivery</option><option>Drop-off at Alexandria Showroom</option>
        </select>
      </div>
      <div className="flex justify-between items-center gap-4"><h3 className="font-serif text-2xl text-[#203e37]">Your rugs</h3><span className="bg-[#f7f4ed] text-[#203e37] rounded-full px-3 py-1 text-sm">{rugs.length} {rugs.length===1?'rug':'rugs'}</span></div>
      <p className="text-sm text-neutral-500">Add each rug below. Your contact details apply to the entire request.</p>
      {rugs.map((rug,index)=>{
        const area=calculateSquareFoot(rug.widthFeet,rug.widthInches,rug.lengthFeet,rug.lengthInches,'rectangle');
        return <section key={rug.id} aria-label={`Rug ${index+1}`} className="border border-[#e5ddcf] rounded-2xl p-4 sm:p-6 bg-[#fffdf8] space-y-5">
          <div className="flex justify-between items-center"><h4 className="font-serif text-xl text-[#203e37]">Rug {index+1}</h4>{rugs.length>1&&<button type="button" onClick={()=>setRugs(prev=>prev.filter(r=>r.id!==rug.id))} className="inline-flex items-center gap-2 text-sm text-red-700 rounded-lg px-3 py-2 hover:bg-red-50" aria-label={`Remove rug ${index+1}`}><Trash2 size={16}/>Remove rug</button>}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label htmlFor={`${rug.id}-service`} className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Service Requested</label><select id={`${rug.id}-service`} value={rug.service} onChange={e=>changeRug(rug.id,'service',e.target.value)} className="w-full border border-neutral-200 rounded-lg p-3 text-sm bg-white">{['Rug Cleaning','Rug Repair','Pet Stain & Odor Removal','Fringe & Binding Repair','Appraisal','Other'].map(v=><option key={v}>{v}</option>)}</select></div>
            <div><label htmlFor={`${rug.id}-type`} className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Rug Type</label><select id={`${rug.id}-type`} value={rug.rugType} onChange={e=>changeRug(rug.id,'rugType',e.target.value)} className="w-full border border-neutral-200 rounded-lg p-3 text-sm bg-white">{['Persian / Oriental','Silk','Wool','Antique','Machine Made','Unsure'].map(v=><option key={v}>{v}</option>)}</select></div>
          </div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Approximate size (optional)</p><div className="grid grid-cols-2 gap-4">{(['width','length'] as const).map(side=><div key={side}><span className="block text-sm capitalize mb-2">{side}</span><div className="grid grid-cols-2 gap-2">{(['Feet','Inches'] as const).map(unit=>{const field=`${side}${unit}` as 'widthFeet'|'widthInches'|'lengthFeet'|'lengthInches';return <label key={unit} className="text-xs text-neutral-500">{unit==='Feet'?'Feet':'Inches'}<input type="number" min="0" max={unit==='Inches'?11:100} step="1" value={rug[field]||''} onChange={e=>changeRug(rug.id,field,Number(e.target.value)||0)} className="w-full mt-1 bg-white border border-neutral-200 rounded-lg p-2 text-sm text-neutral-800"/></label>;})}</div></div>)}</div>{area>0&&<p className="text-sm text-[#927951] font-semibold mt-3">Rug {index+1}: {formatSquareFoot(area)} sq. ft.</p>}</div>
          <div><label htmlFor={`${rug.id}-description`} className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Stains, damage or special instructions</label><textarea id={`${rug.id}-description`} rows={3} maxLength={4000} value={rug.description} onChange={e=>changeRug(rug.id,'description',e.target.value)} className="w-full bg-white border border-neutral-200 rounded-lg p-3 text-sm"/></div>
          <div><label htmlFor={`${rug.id}-photos`} className="flex items-center justify-center gap-2 border-2 border-dashed border-[#e5ddcf] rounded-xl p-5 text-sm text-[#203e37] cursor-pointer hover:bg-[#f7f4ed]"><UploadCloud size={22}/>Add photos for rug {index+1} (up to 5)</label><input id={`${rug.id}-photos`} type="file" multiple accept="image/*" disabled={isSubmitting} className="sr-only" onChange={e=>{addPhotos(rug.id,e.target.files);e.target.value='';}}/><p className="text-xs text-neutral-500 mt-2">Optional · Up to 10 MB per photo</p>{rug.files.length>0&&<div className="flex gap-3 mt-3 overflow-x-auto pb-2">{rug.files.map((file,i)=><div key={i} className="relative shrink-0"><PhotoPreview file={file}/><button type="button" aria-label={`Remove photo ${i+1} from rug ${index+1}`} onClick={()=>removePhoto(rug.id,i)} className="absolute top-0 right-0 rounded-full bg-white shadow p-1 text-red-700"><X size={14}/></button></div>)}</div>}</div>
        </section>;
      })}
      <button type="button" disabled={rugs.length>=20} onClick={()=>setRugs(prev=>[...prev,newRug()])} className="w-full inline-flex justify-center items-center gap-2 rounded-xl border border-[#927951] text-[#203e37] font-semibold py-3 hover:bg-[#f7f4ed] disabled:opacity-50"><Plus size={18}/>Add another rug</button>
      {rugs.length>=20&&<p className="text-sm text-neutral-500">For more than 20 rugs, please call (703) 461-0207.</p>}
      </fieldset>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-editorial-accent text-white font-bold uppercase tracking-widest text-sm py-4 flex items-center justify-center hover:bg-neutral-800 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Request</>
        ) : (
          <><Send className="w-4 h-4 mr-2" /> Request Estimate for {rugs.length} {rugs.length===1?'Rug':'Rugs'}</>
        )}
      </button>
      <p className="text-xs text-center text-neutral-400 mt-4">
        * Pickup and delivery may be available based on location.
      </p>
    </form>
  );
}
