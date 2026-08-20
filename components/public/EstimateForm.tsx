'use client';

import React, { useState, useRef } from 'react';
import { Camera, Send, CheckCircle2, UploadCloud, X, Loader2 } from 'lucide-react';
import { addShowroomDoc, SHOWROOM_ESTIMATES } from '@/lib/showroom-firebase';
import { ServiceEstimate } from '@/types';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function EstimateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [files, setFiles] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    zip: '',
    service: 'Rug Cleaning',
    rugType: 'Persian / Oriental',
    dimensions: '',
    description: '',
    pickupPreference: 'Pickup & Delivery',
    appointmentDate: '',
    notes: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files as FileList)].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const uploadImages = async () => {
    if (!storage) throw new Error("Firebase storage not initialized");
    const urls: string[] = [];
    for (const file of files) {
      const fileRef = ref(storage, `estimates/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      urls.push(url);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      let imageUrls: string[] = [];
      if (files.length > 0) {
        try {
          imageUrls = await uploadImages();
        } catch (imgError) {
          console.error("Image upload failed:", imgError);
          // If storage unauthorized, proceed without images but warn
        }
      }

      const estimateData: Omit<ServiceEstimate, 'id'> = {
        ...formData,
        status: 'New',
        createdAt: new Date().toISOString(),
        images: imageUrls,
      };

      await addShowroomDoc(SHOWROOM_ESTIMATES, estimateData);
      
      // We assume email is handled via Firebase Functions or similar, 
      // or we can just show success to the user.
      setIsSuccess(true);

    } catch (err: any) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-12 text-center rounded-sm">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
        <h3 className="text-2xl font-serif text-emerald-900 mb-4">Request Received</h3>
        <p className="text-emerald-700 font-light max-w-md mx-auto">
          Thank you, {formData.name}. Our master artisans are reviewing your request and will contact you shortly regarding your estimate.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-neutral-100 p-8 shadow-sm rounded-sm max-w-3xl mx-auto space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 text-sm font-medium border border-red-200">
          {error}
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Service Requested</label>
          <select name="service" value={formData.service} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm">
            <option>Rug Cleaning</option>
            <option>Rug Repair</option>
            <option>Pet Stain & Odor Removal</option>
            <option>Fringe & Binding Repair</option>
            <option>Appraisal</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Rug Type</label>
          <select name="rugType" value={formData.rugType} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm">
            <option>Persian / Oriental</option>
            <option>Silk</option>
            <option>Wool</option>
            <option>Antique</option>
            <option>Machine Made</option>
            <option>Unsure</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Approx. Dimensions</label>
          <input type="text" name="dimensions" placeholder="e.g. 8x10" value={formData.dimensions} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Logistics Preference</label>
          <select name="pickupPreference" value={formData.pickupPreference} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm">
            <option>Pickup & Delivery</option>
            <option>Drop-off at Alexandria Showroom</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Describe Stains or Damage</label>
        <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Upload Photographs (Up to 5)</label>
        <div className="border-2 border-dashed border-neutral-200 p-6 text-center hover:border-editorial-accent/50 transition-colors">
          <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex flex-col items-center justify-center text-neutral-500 hover:text-editorial-accent">
            <UploadCloud className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Click to select photos</span>
          </button>
        </div>
        
        {files.length > 0 && (
          <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
            {files.map((file, i) => (
              <div key={i} className="relative shrink-0">
                <img src={URL.createObjectURL(file)} alt="preview" className="w-20 h-20 object-cover rounded-sm border border-neutral-200" />
                <button type="button" onClick={() => removeFile(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-editorial-accent text-white font-bold uppercase tracking-widest text-sm py-4 flex items-center justify-center hover:bg-neutral-800 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Request</>
        ) : (
          <><Send className="w-4 h-4 mr-2" /> Request Estimate</>
        )}
      </button>
      <p className="text-xs text-center text-neutral-400 mt-4">
        * Pickup and delivery may be available based on location.
      </p>
    </form>
  );
}
