import React, { useState, useEffect } from 'react';
import { getAllInvoices } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import { Users, Search, Mail, Phone } from 'lucide-react';

export default function CRMAdminTab() {
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
    <div className="bg-white p-6 rounded-none border border-editorial-border shadow-xs text-left space-y-6">
      <div className="flex justify-between items-center border-b pb-4 border-editorial-border">
        <div>
          <h2 className="font-serif text-xl text-editorial-text uppercase tracking-widest">Client Relationship Management</h2>
          <p className="text-xs text-neutral-400 mt-1">Aggregated lifetimes values and purchase histories from all local invoices.</p>
        </div>
      </div>
      
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
        <input 
          type="text" 
          placeholder="Search clients by name, email, or phone..." 
          className="w-full pl-10 pr-4 py-3 border border-editorial-border shadow-xs rounded-none focus:border-editorial-text focus:ring-1 focus:ring-editorial-text outline-none text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border border-editorial-border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-editorial-aside text-editorial-text font-serif font-bold uppercase tracking-widest text-[10px] border-b border-editorial-border">
            <tr>
              <th className="px-6 py-4">Client Name</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Lifetime Value</th>
              <th className="px-6 py-4">Orders</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-editorial-border">
            {filtered.map(client => (
              <tr key={client.id} className="hover:bg-neutral-50 transition">
                <td className="px-6 py-4">
                  <div className="font-bold text-editorial-text text-xs uppercase tracking-wider">{client.name}</div>
                  <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-widest">Last order: {new Date(client.lastPurchase).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4 space-y-2 text-neutral-600 text-[11px]">
                  {client.email && <div className="flex items-center gap-2"><Mail size={12} className="text-editorial-accent"/> {client.email}</div>}
                  {client.phone && <div className="flex items-center gap-2"><Phone size={12} className="text-editorial-accent"/> {client.phone}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className="font-serif font-light text-green-700 text-lg">
                    ${client.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-none text-xs font-bold border border-neutral-200">
                    {client.invoiceCount}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-editorial-accent hover:text-editorial-text font-bold uppercase tracking-widest text-[10px] transition-colors">View Profile</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500 font-serif italic">No clients found matching your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
