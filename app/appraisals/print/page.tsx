'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAppraisalById, Appraisal } from '@/lib/appraisals-storage';
import AppraisalTemplate from '@/components/AppraisalTemplate';

function PrintContent() {
    const searchParams = useSearchParams();
    const [appraisal, setAppraisal] = useState<Appraisal | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const id = searchParams.get('id');
        if (id) {
            getAppraisalById(id).then(data => {
                setAppraisal(data);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [searchParams]);

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Loading Certificate...</div>;
    }

    if (!appraisal) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>Appraisal not found.</div>;
    }

    return (
        <div style={{ background: '#525659', minHeight: '100vh', padding: '20px 0' }}>
            {/* Top Toolbar for Printing */}
            <div className="print-hide" style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button 
                    onClick={() => window.print()}
                    style={{ 
                        padding: '12px 24px', 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        background: '#3b82f6', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}
                >
                    🖨️ Print Certificate
                </button>
            </div>

            {/* The A4/Letter Sized Document Container */}
            <div style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5)', width: 'max-content', margin: '0 auto' }}>
                <AppraisalTemplate appraisal={appraisal} />
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    .print-hide { display: none !important; }
                    body { background: white !important; }
                }
            `}} />
        </div>
    );
}

export default function AppraisalPrintPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Certificate...</div>}>
            <PrintContent />
        </Suspense>
    );
}
