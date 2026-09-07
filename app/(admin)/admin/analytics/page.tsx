'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, DollarSign, Package } from 'lucide-react';

export default function AnalyticsDashboard() {
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getAllInvoices();
      setInvoices(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const analytics = useMemo(() => {
    if (!invoices.length) return null;

    let totalRevenue = 0;
    let totalTax = 0;
    const monthlyData: Record<string, number> = {};
    const topStyles: Record<string, number> = {};

    invoices.forEach(inv => {
      const calc = calculateInvoice(inv.data as any);
      const date = new Date(inv.createdAt);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      // Only count actual sales (not quotes)
      if (inv.data.documentType === 'INVOICE') {
        totalRevenue += calc.subtotal; // Pre-tax revenue
        totalTax += calc.salesTax;
        
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + calc.subtotal;

        inv.data.items.forEach(item => {
          if (item.style && item.style.trim()) {
            topStyles[item.style] = (topStyles[item.style] || 0) + 1;
          }
        });
      }
    });

    const chartData = Object.entries(monthlyData).map(([name, Total]) => ({ name, Total })).reverse();
    const styleData = Object.entries(topStyles)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return { totalRevenue, totalTax, chartData, styleData, invoiceCount: invoices.length };
  }, [invoices]);

  if (loading) return <div className="p-8 text-neutral-500">Loading Analytics...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b pb-4 border-neutral-200">
        <h1 className="text-3xl font-serif text-neutral-800">Business Analytics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 shadow-sm border border-neutral-100 flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-700 rounded-full"><DollarSign size={24} /></div>
          <div>
            <p className="text-sm text-neutral-500 uppercase tracking-widest font-bold">Total Revenue</p>
            <p className="text-2xl font-bold font-mono">${(analytics?.totalRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
        </div>
        <div className="bg-white p-6 shadow-sm border border-neutral-100 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-700 rounded-full"><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm text-neutral-500 uppercase tracking-widest font-bold">Invoices Logged</p>
            <p className="text-2xl font-bold font-mono">{analytics?.invoiceCount || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white p-6 shadow-sm border border-neutral-100">
          <h2 className="text-lg font-serif font-bold mb-6 text-neutral-800">Monthly Revenue Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fontSize: 12, fill: '#888'}} />
                <YAxis tickFormatter={(val) => '$'+val} tickLine={false} axisLine={false} tick={{fontSize: 12, fill: '#888'}} />
                <RechartsTooltip formatter={(value: number) => ['$' + value.toLocaleString(), 'Revenue']} />
                <Area type="monotone" dataKey="Total" stroke="#171717" fill="#f5f5f5" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 shadow-sm border border-neutral-100">
          <h2 className="text-lg font-serif font-bold mb-6 text-neutral-800">Top Selling Styles</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.styleData || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} tick={{fontSize: 12, fill: '#555'}} />
                <RechartsTooltip cursor={{fill: '#f9f9f9'}} />
                <Bar dataKey="count" fill="#171717" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
