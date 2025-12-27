'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Calendar, Download } from 'lucide-react';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import { generateSalesReportPDF } from '@/lib/pdf-reports';

export default function ReportsPage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportType, setReportType] = useState<'SALES' | 'CUSTOMER'>('SALES');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const data = await getAllInvoices();
        setInvoices(data);
        setLoading(false);
    }

    const getFilteredInvoices = () => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return invoices.filter(inv => {
            const d = new Date(inv.data.date);
            return d >= start && d <= end;
        }).sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());
    };

    const handleGenerateReport = async () => {
        const filtered = getFilteredInvoices();
        if (filtered.length === 0) {
            alert('No data found for the selected date range.');
            return;
        }

        try {
            await generateSalesReportPDF(filtered, startDate, endDate);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report.');
        }
    };

    const filteredData = getFilteredInvoices();
    const totalSales = filteredData.reduce((sum, inv) => sum + calculateInvoice(inv.data).totalDue, 0);

    return (
        <div style={{ padding: 'var(--dashboard-padding, 40px)', maxWidth: 1000, margin: '0 auto', fontFamily: 'var(--font-inter, sans-serif)' }}>
            <header style={{ marginBottom: 32 }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'none', border: 'none', color: '#64748b',
                        cursor: 'pointer', marginBottom: 16, fontSize: 14, fontWeight: 500
                    }}
                >
                    <ArrowLeft size={18} /> Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 10, background: '#e0e7ff', borderRadius: 12, color: '#4f46e5' }}>
                        <FileText size={24} />
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1f3c', margin: 0 }}>Reports</h1>
                </div>
                <p style={{ color: '#64748b', marginTop: 8 }}>Generate and download sales summaries.</p>
            </header>

            <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                {/* Controls */}
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid #f1f5f9' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value as any)}
                            style={{
                                padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0',
                                fontSize: 14, minWidth: 200, outline: 'none', background: 'white'
                            }}
                        >
                            <option value="SALES">Sales Summary</option>
                            {/* Future: <option value="CUSTOMER">Sales by Customer</option> */}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0',
                                fontSize: 14, outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{
                                padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0',
                                fontSize: 14, outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        onClick={handleGenerateReport}
                        disabled={loading || filteredData.length === 0}
                        style={{
                            padding: '12px 24px', borderRadius: 12, background: '#4f46e5', color: 'white',
                            border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8, height: 45,
                            opacity: (loading || filteredData.length === 0) ? 0.5 : 1
                        }}
                    >
                        <Download size={18} /> Download PDF
                    </button>
                </div>

                {/* Preview */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1f3c', margin: 0 }}>Preview</h2>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#4f46e5' }}>
                            Total Sales: ${totalSales.toLocaleString()}
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Date</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Invoice #</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Customer</th>
                                    <th style={{ textAlign: 'right', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((inv) => (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', color: '#334155' }}>{inv.data.date}</td>
                                        <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>{inv.data.invoiceNumber}</td>
                                        <td style={{ padding: '12px 16px', color: '#334155' }}>{inv.data.soldTo.name}</td>
                                        <td style={{ padding: '12px 16px', color: '#334155', textAlign: 'right', fontWeight: 600 }}>
                                            ${calculateInvoice(inv.data).totalDue.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {filteredData.length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                                            No data found for selected period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
