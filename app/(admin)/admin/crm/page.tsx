'use client';

import React, { useState, useEffect } from 'react';
import { getAllInvoices, SavedInvoice, getCustomers } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import { Users, Search, DollarSign, Mail, Phone, MapPin, ChevronRight, BarChart } from 'lucide-react';
import { Customer } from '@/lib/customer-storage';

export default function CRMPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadCRM() {
      const invoices = await getAllInvoices();
      const crmData: Record<string, any> = {};

      invoices.forEach(inv => {
        const docType = inv.data.documentType || 'INVOICE';
        if (docType === 'INVOICE') {
          const soldTo = inv.data.soldTo;
          const calc = calculateInvoice(inv.data as any);
          const key = `${soldTo.name}|${soldTo.phone}`.toLowerCase();

          if (!crmData[key]) {
            crmData[key] = {
              ...soldTo,
              id: key,
              totalSpent: 0,
              invoiceCount: 0,
              lastPurchase: inv.createdAt,
              notes: []
            };
          }

          crmData[key].totalSpent += calc.subtotal;
          crmData[key].invoiceCount += 1;
          
          if (new Date(inv.createdAt) > new Date(crmData[key].lastPurchase)) {
            crmData[key].lastPurchase = inv.createdAt;
          }
        }
      });

      setCustomers(Object.values(crmData).sort((a, b) => b.totalSpent - a.totalSpent));
      setLoading(false);
    }
    loadCRM();
  }, []);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="p-8 text-neutral-500">Loading CRM...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b pb-4 border-neutral-200">
        <h1 className="text-3xl font-serif text-neutral-800">Client Relationship Management</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
        <input 
          type="text" 
          placeholder="Search clients by name, email, or phone..." 
          className="w-full pl-10 pr-4 py-3 border border-neutral-300 shadow-sm rounded-none focus:border-neutral-800 focus:ring-1 focus:ring-neutral-800 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border border-neutral-200 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500 font-mono uppercase tracking-widest text-xs border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Client Name</th>
              <th className="px-6 py-4 font-semibold">Contact</th>
              <th className="px-6 py-4 font-semibold">Lifetime Value</th>
              <th className="px-6 py-4 font-semibold">Orders</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map(client => (
              <tr key={client.id} className="hover:bg-neutral-50 transition">
                <td className="px-6 py-4">
                  <div className="font-bold text-neutral-800">{client.name}</div>
                  <div className="text-xs text-neutral-500">Last order: {new Date(client.lastPurchase).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4 space-y-1 text-neutral-600">
                  {client.email && <div className="flex items-center gap-2"><Mail size={14}/> {client.email}</div>}
                  {client.phone && <div className="flex items-center gap-2"><Phone size={14}/> {client.phone}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono font-bold text-green-700">
                    ${client.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-bold">
                    {client.invoiceCount}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-editorial-accent hover:underline font-bold uppercase tracking-wider text-xs">View Profile</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No clients found matching your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
