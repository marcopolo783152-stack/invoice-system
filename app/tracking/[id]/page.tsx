'use client';

import React, { useState, useEffect } from 'react';
import { getInvoiceByIdAsync } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import { CheckCircle2, Circle, Loader2, Package, Truck, Droplets, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { SavedInvoice } from '@/lib/firebase-storage';

export default function TrackingPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getInvoiceByIdAsync(params.id);
        if (data) {
          setInvoice(data);
        } else {
          setError('Tracking number not found.');
        }
      } catch (err) {
        setError('Error loading tracking details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-editorial-accent" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 text-center">
        <Search className="w-12 h-12 text-neutral-300 mb-4" />
        <h1 className="text-2xl font-serif text-neutral-800 mb-2">Tracking Not Found</h1>
        <p className="text-neutral-500 mb-8 max-w-md">We couldn't find an order with this tracking number. Please check the link and try again.</p>
        <Link href="/" className="px-6 py-3 bg-neutral-900 text-white font-bold uppercase tracking-widest text-xs hover:bg-black transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  const { data } = invoice;
  const isService = data.mode === 'wash' || data.mode === 'repair';
  const calc = calculateInvoice(data as any);
  
  // Determine current step index
  const statusList = ['received', 'washing', 'repairing', 'ready', 'picked_up'];
  // If retail, we just use a simplified tracker (Received -> Delivered)
  const isRetail = data.mode === 'retail';
  
  // Normalize status. Default to received.
  const currentStatus = data.status || 'received';
  
  let steps = [];
  let currentStepIndex = 0;

  if (isService) {
    steps = [
      { id: 'received', label: 'Received', icon: Package },
      { id: 'washing', label: 'In Washing/Repair', icon: Droplets },
      { id: 'ready', label: 'Ready for Pickup', icon: CheckCircle2 },
      { id: 'picked_up', label: 'Picked Up', icon: Truck },
    ];
    if (currentStatus === 'received') currentStepIndex = 0;
    else if (currentStatus === 'washing' || currentStatus === 'repairing') currentStepIndex = 1;
    else if (currentStatus === 'ready') currentStepIndex = 2;
    else if (currentStatus === 'picked_up') currentStepIndex = 3;
  } else {
    steps = [
      { id: 'received', label: 'Order Confirmed', icon: Package },
      { id: 'picked_up', label: 'Delivered', icon: Truck },
    ];
    currentStepIndex = currentStatus === 'picked_up' ? 1 : 0;
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif text-neutral-900 mb-4">Order Tracking</h1>
          <p className="text-neutral-500 font-mono">Invoice #{data.invoiceNumber}</p>
        </div>

        {/* Tracking Timeline */}
        <div className="bg-white border border-neutral-200 p-8 md:p-12 shadow-sm">
          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-neutral-100 hidden md:block" />
            <div 
              className="absolute top-6 left-0 h-0.5 bg-editorial-accent hidden md:block transition-all duration-1000" 
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            />

            <div className="flex flex-col md:flex-row justify-between relative z-10 gap-8 md:gap-0">
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex flex-row md:flex-col items-center md:items-center text-left md:text-center group flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-0 md:mb-4 shrink-0 transition-colors duration-500
                      ${isCompleted ? 'bg-editorial-accent text-white shadow-md' : 'bg-white border-2 border-neutral-200 text-neutral-300'}`}>
                      <Icon size={20} />
                    </div>
                    <div className="ml-4 md:ml-0 flex-1">
                      <p className={`font-bold uppercase tracking-wider text-xs md:text-sm mb-1 ${isCompleted ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-editorial-accent font-medium uppercase tracking-widest hidden md:block">Current Status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white border border-neutral-200 p-8 shadow-sm">
          <h2 className="text-xl font-serif text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Order Summary</h2>
          
          <div className="space-y-4 mb-8">
            {data.items.map((item, idx) => (
              <div key={item.id} className="flex justify-between items-start border-b border-neutral-50 pb-4">
                <div>
                  <p className="font-bold text-neutral-800">{item.description || 'Custom Service'}</p>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">{item.shape} • {item.widthFeet}'{item.widthInches}" x {item.lengthFeet}'{item.lengthInches}"</p>
                </div>
                {item.images && item.images.length > 0 && (
                  <img src={item.images[0]} alt="Rug" className="w-16 h-16 object-cover border border-neutral-200" />
                )}
              </div>
            ))}
          </div>

          <div className="bg-neutral-50 p-6 border border-neutral-100 rounded-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-600 font-medium">Total Balance</span>
              <span className="font-mono text-lg">${calc.totalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500">Amount Paid</span>
              <span className="font-mono text-green-700">${calc.totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-neutral-200 font-bold">
              <span className="text-neutral-900">Remaining Balance</span>
              <span className="font-mono text-xl">${calc.balanceDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
