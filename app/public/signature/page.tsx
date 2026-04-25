'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { validateSignatureToken, useSignatureToken, getInvoiceByIdAsync, saveInvoice } from '@/lib/invoice-storage';
import { calculateInvoice } from '@/lib/calculations';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import SignaturePad from '@/components/SignaturePad';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function PublicSignaturePage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>}>
            <SignatureContent />
        </Suspense>
    );
}

function SignatureContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        async function loadToken() {
            if (!token) {
                setError('Invalid or missing signature link.');
                setLoading(false);
                return;
            }
            try {
                const tokenData = await validateSignatureToken(token);
                if (!tokenData) {
                    setError('This signature link is invalid or has already been used.');
                    setLoading(false);
                    return;
                }

                const invoiceData = await getInvoiceByIdAsync(tokenData.invoiceId);
                if (!invoiceData) {
                    setError('Invoice not found.');
                } else {
                    setInvoice(invoiceData);
                }
            } catch (err) {
                console.error('Error loading signature page:', err);
                setError('Failed to load the signature page. Please try again later.');
            } finally {
                setLoading(false);
            }
        }

        loadToken();
    }, [token]);

    const handleSaveSignature = async (signatureData: string) => {
        if (!token) return;
        setIsSaving(true);
        try {
            const updatedInvoiceData = {
                ...invoice.data,
                signature: signatureData,
                signatureDate: new Date().toISOString()
            };

            await saveInvoice(updatedInvoiceData, invoice.id);
            await useSignatureToken(token);

            setSuccess(true);
            setShowSignaturePad(false);
        } catch (err) {
            console.error('Error saving signature:', err);
            alert('Failed to save signature. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ color: '#64748b', fontWeight: 500 }}>Loading invoice...</p>
                </div>
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', padding: 20 }}>
                <div style={{ maxWidth: 400, width: '100%', background: 'white', padding: 32, borderRadius: 16, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, background: '#fef2f2', color: '#ef4444', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px' }}>
                        <AlertTriangle size={32} />
                    </div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Link Invalid</h1>
                    <p style={{ color: '#64748b', lineHeight: 1.5, marginBottom: 24 }}>{error}</p>
                    <button onClick={() => window.close()} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                        Close Window
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', padding: 20 }}>
                <div style={{ maxWidth: 400, width: '100%', background: 'white', padding: 32, borderRadius: 16, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, background: '#f0fdf4', color: '#22c55e', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px' }}>
                        <CheckCircle size={32} />
                    </div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Signature Received</h1>
                    <p style={{ color: '#64748b', lineHeight: 1.5, marginBottom: 24 }}>Thank you! Your signature has been successfully added to the invoice. You can now close this window.</p>
                    <button onClick={() => window.close()} style={{ width: '100%', padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                        Done
                    </button>
                </div>
            </div>
        );
    }

    const calculations = calculateInvoice(invoice.data);

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '40px 0', width: 1280, margin: '0 auto' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                {/* One-time use alert */}
                <div style={{
                    background: '#fff7ed',
                    border: '1px solid #ffedd5',
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 24,
                    display: 'flex',
                    gap: 16,
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ color: '#f97316' }}><AlertTriangle size={24} /></div>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#9a3412', marginBottom: 2 }}>One-Time Use Link</h3>
                        <p style={{ fontSize: 14, color: '#c2410c' }}>This link allows for a single signature submission and will expire once the process is complete.</p>
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '20px 0' }}>
                    <div style={{ padding: '0 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Invoice Detail</h2>
                        <button
                            onClick={() => setShowSignaturePad(true)}
                            style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            Sign Document
                        </button>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9' }}>
                        <InvoiceTemplate
                            data={invoice.data}
                            calculations={calculations}
                        />
                    </div>
                </div>

                <div style={{ marginTop: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    <p>&copy; {new Date().getFullYear()} Ariana Oriental Rugs. All rights reserved.</p>
                </div>
            </div>

            {showSignaturePad && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: 600, borderRadius: 16, padding: 24, position: 'relative' }}>
                        {isSaving && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 16 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                                    <p style={{ fontWeight: 600, color: '#1e293b' }}>Saving signature...</p>
                                </div>
                            </div>
                        )}
                        <SignaturePad
                            onSave={handleSaveSignature}
                            onCancel={() => setShowSignaturePad(false)}
                            variant="inline"
                        />
                    </div>
                </div>
            )}

            <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
