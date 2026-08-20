import React from "react";
import { useStore } from "@/context/StoreContext";
import { Calendar, Mail, MapPin, Phone, ExternalLink } from "lucide-react";

export function EstimatesAdminTab() {
  const { estimates, updateEstimateStatus, deleteEstimate } = useStore();

  if (!estimates || estimates.length === 0) {
    return (
      <div className="p-8 text-center text-neutral-500 font-light">
        <p>No service estimates requested yet.</p>
      </div>
    );
  }

  const sortedEstimates = [...estimates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <h3 className="font-serif text-2xl text-editorial-text mb-6">Service Estimate Requests</h3>
      
      <div className="grid grid-cols-1 gap-6">
        {sortedEstimates.map(est => (
          <div key={est.id} className="bg-white border border-neutral-200 shadow-sm p-6 flex flex-col md:flex-row gap-6">
            <div className="flex-grow space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg">{est.name}</h4>
                  <p className="text-xs text-neutral-500">{new Date(est.createdAt).toLocaleString()}</p>
                </div>
                <span className="px-3 py-1 bg-neutral-100 text-xs font-bold uppercase tracking-widest text-neutral-700">
                  {est.status}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-light text-neutral-600">
                <p className="flex items-center"><Phone className="w-4 h-4 mr-2" /> {est.phone}</p>
                <p className="flex items-center"><Mail className="w-4 h-4 mr-2" /> {est.email}</p>
                <p className="flex items-center"><MapPin className="w-4 h-4 mr-2" /> Zip: {est.zip}</p>
                <p className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> {est.pickupPreference}</p>
              </div>

              <div className="bg-neutral-50 p-4 border border-neutral-100 rounded-sm space-y-2 text-sm">
                <p><strong>Service:</strong> {est.service}</p>
                <p><strong>Rug Type:</strong> {est.rugType} ({est.dimensions || "Size not provided"})</p>
                {est.description && <p><strong>Description:</strong> {est.description}</p>}
                {est.notes && <p><strong>Notes:</strong> {est.notes}</p>}
              </div>
              
              {est.images && est.images.length > 0 && (
                <div className="pt-2 border-t border-neutral-100">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2">Attached Photos</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {est.images.map((img: string, i: number) => (
                      <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="relative group block shrink-0">
                        <img src={img} alt="Estimate photo" className="w-20 h-20 object-cover rounded-sm border border-neutral-200" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ExternalLink className="text-white w-5 h-5" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-48 flex flex-col gap-2 shrink-0 border-l border-neutral-100 pl-0 md:pl-6 pt-4 md:pt-0">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Update Status</label>
              <select 
                value={est.status} 
                onChange={(e) => updateEstimateStatus(est.id, e.target.value)}
                className="w-full border border-neutral-200 p-2 text-sm outline-none focus:border-editorial-accent bg-white"
              >
                <option>New</option>
                <option>Contacted</option>
                <option>Estimate Provided</option>
                <option>Pickup Scheduled</option>
                <option>In Service</option>
                <option>Ready</option>
                <option>Delivered</option>
                <option>Cancelled</option>
              </select>
              
              <button 
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
