import React, { useState, useRef } from 'react';
import { Download, Upload, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Rug } from '@/types';
import { downloadCsvTemplate, parseRugCsv } from '@/utils/csvParser';
import { useStore } from '@/context/StoreContext';

export const BulkImport: React.FC = () => {
  const { addRug } = useStore();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  
  const [parsedRugs, setParsedRugs] = useState<Partial<Rug>[]>([]);
  const [mappedRugs, setMappedRugs] = useState<{rug: Partial<Rug>, images: File[]}[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'uploading' | 'done'>('idle');
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setStatus('parsing');
    setError(null);
    
    try {
      const text = await file.text();
      const rugs = parseRugCsv(text);
      setParsedRugs(rugs);
      setStatus('ready');
      mapFilesToRugs(rugs, imageFiles);
    } catch (err: any) {
      setError(err.message || "Failed to parse CSV");
      setStatus('idle');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);
    if (parsedRugs.length > 0) {
      mapFilesToRugs(parsedRugs, files);
    }
  };

  const mapFilesToRugs = (rugs: Partial<Rug>[], images: File[]) => {
    const mapped = rugs.map(rug => {
      // Find all images where the filename starts with the SKU or contains it.
      // Assuming user names files like "M. 32267 (1).jpg" for SKU "M. 32267"
      // Remove symbols from SKU for safe matching, or use exact indexOf.
      const skuBase = rug.sku?.trim().toLowerCase() || "";
      
      const matchedImages = images.filter(img => 
        img.name.toLowerCase().includes(skuBase)
      );

      return {
        rug,
        images: matchedImages
      };
    });
    setMappedRugs(mapped);
  };

  // Very simplified mock of Firebase storage upload since we don't have direct access 
  // to the raw Firebase storage bucket functions in this specific component without passing it.
  // We'll upload images directly using the context or a helper if available.
  // Actually, wait, useStore `addRug` takes an Omit<Rug, "id"> but it expects `images` to be URLs.
  // Since we only have `addRug`, we need to upload the image to Firebase Storage first.
  // Let's import the raw firebase storage from the existing showroom-firebase.
  const handlePublish = async () => {
    setStatus('uploading');
    setProgress(0);
    setError(null);
    
    let totalOperations = mappedRugs.length;
    let completed = 0;

    try {
      // Dynamic import to avoid breaking if not available immediately
      const { storage } = await import('@/lib/firebase');
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

      if (!storage) throw new Error("Firebase storage is not available");

      for (const item of mappedRugs) {
        const imageUrls: string[] = [];
        
        // Upload all images for this rug
        for (const file of item.images) {
          const fileRef = ref(storage, `rugs/${Date.now()}-${file.name}`);
          const snapshot = await uploadBytes(fileRef, file);
          const url = await getDownloadURL(snapshot.ref);
          imageUrls.push(url);
        }

        const finalRug = {
          ...item.rug,
          images: imageUrls
        };

        // Write to firestore
        await addRug(finalRug as Omit<Rug, "id">);
        
        completed++;
        setProgress(Math.round((completed / totalOperations) * 100));
      }

      setStatus('done');
    } catch (err: any) {
      setError("Upload failed: " + err.message);
      setStatus('ready');
    }
  };

  return (
    <div className="bg-white p-6 rounded-none shadow-sm border border-editorial-border space-y-8">
      <div>
        <h2 className="text-xl font-bold uppercase tracking-widest text-neutral-900 mb-2">Bulk Import Collection</h2>
        <p className="text-sm text-gray-500">Upload a spreadsheet of new inventory, and select matching photos from your computer to automatically map and publish them.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Step 1: Download Template */}
        <div className="border border-editorial-border p-6 space-y-4">
          <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-editorial-text text-sm">
            <span className="bg-editorial-accent text-white h-6 w-6 flex items-center justify-center rounded-full text-xs">1</span>
            Prepare Data
          </div>
          <p className="text-xs text-gray-500">Download the standard CSV template and fill in your rug details. Ensure SKUs exactly match your image filenames.</p>
          <button 
            onClick={downloadCsvTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-editorial-aside border border-editorial-border hover:bg-gray-50 text-editorial-text text-xs font-bold uppercase cursor-pointer transition"
          >
            <Download className="h-4 w-4" /> Download Template
          </button>
        </div>

        {/* Step 2: Upload Data & Images */}
        <div className="border border-editorial-border p-6 space-y-4">
          <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-editorial-text text-sm">
            <span className="bg-editorial-accent text-white h-6 w-6 flex items-center justify-center rounded-full text-xs">2</span>
            Select Files
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">CSV Spreadsheet File</label>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleCsvUpload}
                ref={fileInputRef}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:border file:border-editorial-border file:bg-white file:text-editorial-text hover:file:bg-gray-50 file:cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Select All Rug Photos</label>
              <input 
                type="file" 
                accept="image/*" 
                multiple
                onChange={handleImageSelect}
                ref={imageInputRef}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:border file:border-editorial-border file:bg-white file:text-editorial-text hover:file:bg-gray-50 file:cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 mt-1">Select all images at once from your folder. They will be auto-matched by SKU.</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      )}

      {/* Step 3: Review & Publish */}
      {(status === 'ready' || status === 'uploading' || status === 'done') && (
        <div className="border-t border-editorial-border pt-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-editorial-text text-sm">
              <span className="bg-editorial-accent text-white h-6 w-6 flex items-center justify-center rounded-full text-xs">3</span>
              Review & Publish
            </div>
            
            {status === 'ready' && (
              <button 
                onClick={handlePublish}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest text-xs transition shadow-sm cursor-pointer"
              >
                Publish {mappedRugs.length} Rugs
              </button>
            )}
          </div>

          {status === 'uploading' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-500">
                <span>Uploading & Publishing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2">
                <div className="bg-editorial-accent h-2 transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 text-emerald-700 flex items-center gap-2 font-bold text-sm">
              <CheckCircle className="h-5 w-5" /> Successfully published {mappedRugs.length} rugs!
            </div>
          )}

          <div className="overflow-x-auto border border-editorial-border">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs uppercase bg-editorial-aside text-editorial-text font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Matched Photos</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Dimensions</th>
                </tr>
              </thead>
              <tbody>
                {mappedRugs.map((item, idx) => (
                  <tr key={idx} className="border-t border-editorial-border bg-white">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        {item.images.length > 0 ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <ImageIcon className="h-4 w-4" /> {item.images.length} found
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500">
                            <AlertCircle className="h-4 w-4" /> Missing
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-xs">{item.rug.sku}</td>
                    <td className="px-4 py-3 text-xs">{item.rug.name}</td>
                    <td className="px-4 py-3 text-xs">${item.rug.price}</td>
                    <td className="px-4 py-3 text-xs">{item.rug.dimensions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
