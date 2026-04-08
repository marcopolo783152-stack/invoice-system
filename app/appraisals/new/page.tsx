'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Upload, Search, Edit } from 'lucide-react';
import { Appraisal, saveAppraisal, getAppraisalById } from '@/lib/appraisals-storage';
import { Customer, searchCustomers } from '@/lib/customer-storage';

function AppraisalFormContent() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    
    const [appraisal, setAppraisal] = useState<Partial<Appraisal>>({
        date: new Date().toISOString().split('T')[0],
        customerName: '',
        customerAddress: '',
        rugNumber: '',
        type: '',
        size: '',
        composition: 'Wool',
        origin: '',
        condition: 'Good',
        value: 0,
        rugImage: ''
    });

    const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    // Support Edit Mode
    const searchParams = useSearchParams();
    const editId = searchParams?.get('edit');

    useEffect(() => {
        if (editId) {
            getAppraisalById(editId).then(data => {
                if (data) setAppraisal(data);
            });
        }
    }, [editId]);

    const handleCustomerNameChange = async (value: string) => {
        setAppraisal(prev => ({ ...prev, customerName: value }));
        if (value.length > 1) {
            const matches = await searchCustomers(value);
            setCustomerSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectCustomer = (customer: Customer) => {
        setAppraisal(prev => ({
            ...prev,
            customerName: customer.name,
            customerAddress: `${customer.address} ${customer.city} ${customer.state} ${customer.zip}`.trim().replace(/\s+/g, ' ')
        }));
        setShowSuggestions(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                // Extremely aggressive scaling down to 600px to guarantee the detailed rug image 
                // base64 footprint fits well underneath the 1MB Firestore document payload limit
                const MAX_WIDTH = 600;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Use 0.6 quality for aggressive WebP or JPEG compression to crush payload size
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                setAppraisal(prev => ({ ...prev, rugImage: compressedBase64 }));
            } catch (err) {
                // If canvas fails (e.g. strict HEIC on some browsers), fallback to raw file
                const reader = new FileReader();
                reader.onload = (ev) => setAppraisal(prev => ({ ...prev, rugImage: ev.target?.result as string }));
                reader.readAsDataURL(file);
            }
        };
        img.onerror = () => {
            // If image fails to load entirely, use raw FileReader fallback
            const reader = new FileReader();
            reader.onload = (ev) => setAppraisal(prev => ({ ...prev, rugImage: ev.target?.result as string }));
            reader.readAsDataURL(file);
        };
        
        img.src = URL.createObjectURL(file);
        
        // Clear input so the user can select the same file again if they remove it
        e.target.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appraisal.customerName || !appraisal.rugNumber) {
            alert('Customer Name and Rug Number are required.');
            return;
        }

        setSaving(true);
        try {
            console.log("Submitting payload...", appraisal.rugImage?.length);
            const id = await saveAppraisal({
                ...appraisal,
                id: editId || `APP-${Date.now()}`,
                createdAt: appraisal.createdAt || new Date().toISOString()
            } as Appraisal);
            
            router.push(`/appraisals/print?id=${id}`);
            // Let the UI clean up state visually if the router takes a few seconds to redirect
            setTimeout(() => setSaving(false), 3000);
        } catch (error) {
            console.error(error);
            alert('Failed to save appraisal locally or remotely. Please try again.');
            setSaving(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '15px',
        outline: 'none',
        transition: 'border-color 0.2s',
        marginBottom: '16px'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#475569',
        marginBottom: '6px'
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <Link href="/appraisals" style={{ color: '#6366f1', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
                <ArrowLeft size={16} /> Back to Appraisals
            </Link>
            
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '24px 30px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Create New Certificate of Appraisal</h1>
                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Fill out the details below to generate a printable Certificate of Authenticity.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
                    
                    <div style={{ display: 'flex', gap: '30px' }}>
                        
                        {/* LEFT COLUMN: Data Fields */}
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                                Client Information
                            </h3>
                            <label style={labelStyle}>Date</label>
                            <input 
                                type="date" 
                                style={inputStyle} 
                                value={appraisal.date} 
                                onChange={e => setAppraisal({...appraisal, date: e.target.value})} 
                            />
                            
                            <label style={labelStyle}>Customer Name</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="text" 
                                    placeholder="e.g. John Doe"
                                    style={inputStyle} 
                                    value={appraisal.customerName} 
                                    onChange={e => handleCustomerNameChange(e.target.value)} 
                                    required
                                />
                                {showSuggestions && customerSuggestions.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        background: 'white', border: '1px solid #e2e8f0',
                                        borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                        zIndex: 50, maxHeight: '200px', overflowY: 'auto', marginTop: '-12px'
                                    }}>
                                        {customerSuggestions.map(cust => (
                                            <div 
                                                key={cust.id} 
                                                onClick={() => selectCustomer(cust)}
                                                style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '14px' }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                            >
                                                <div style={{ fontWeight: 'bold' }}>{cust.name}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{cust.address} {cust.city}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <label style={labelStyle}>Address / Location</label>
                            <input 
                                type="text" 
                                placeholder="e.g. 3260 Duke St Alexandria VA 22314"
                                style={inputStyle} 
                                value={appraisal.customerAddress} 
                                onChange={e => setAppraisal({...appraisal, customerAddress: e.target.value})} 
                            />

                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginTop: '30px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                                Rug Details
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                                <div>
                                    <label style={labelStyle}>Rug Number</label>
                                    <input type="text" style={inputStyle} value={appraisal.rugNumber} onChange={e => setAppraisal({...appraisal, rugNumber: e.target.value})} required />
                                </div>
                                <div>
                                    <label style={labelStyle}>Type / Style</label>
                                    <input type="text" style={inputStyle} placeholder="e.g. Persian Tabriz" value={appraisal.type} onChange={e => setAppraisal({...appraisal, type: e.target.value})} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Size</label>
                                    <input type="text" style={inputStyle} placeholder="e.g. 8' x 10'" value={appraisal.size} onChange={e => setAppraisal({...appraisal, size: e.target.value})} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Composition</label>
                                    <input type="text" style={inputStyle} value={appraisal.composition} onChange={e => setAppraisal({...appraisal, composition: e.target.value})} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Origin</label>
                                    <input type="text" style={inputStyle} placeholder="e.g. Iran" value={appraisal.origin} onChange={e => setAppraisal({...appraisal, origin: e.target.value})} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Condition</label>
                                    <input type="text" style={inputStyle} value={appraisal.condition} onChange={e => setAppraisal({...appraisal, condition: e.target.value})} />
                                </div>
                            </div>
                            
                            <label style={labelStyle}>Estimated Retail Value ($)</label>
                            <input 
                                type="number" 
                                style={{...inputStyle, fontSize: '20px', fontWeight: 'bold', color: '#10b981'}} 
                                placeholder="0.00"
                                value={appraisal.value || ''} 
                                onChange={e => setAppraisal({...appraisal, value: parseFloat(e.target.value) || 0})} 
                                min="0" step="0.01"
                            />
                        </div>

                        {/* RIGHT COLUMN: Image Upload */}
                        <div style={{ width: '400px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                                Rug Photo
                            </h3>
                            
                            <div style={{ 
                                border: '2px dashed #cbd5e1', 
                                borderRadius: '12px', 
                                padding: '2px',
                                background: '#f8fafc',
                                height: '500px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {appraisal.rugImage ? (
                                    <>
                                        <img src={appraisal.rugImage} alt="Rug" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        <button 
                                            type="button"
                                            onClick={() => setAppraisal({...appraisal, rugImage: ''})}
                                            style={{
                                                position: 'absolute', top: '10px', right: '10px',
                                                background: 'rgba(255,255,255,0.9)', border: '1px solid #ef4444',
                                                color: '#ef4444', padding: '6px 12px', borderRadius: '6px',
                                                fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            Remove ✕
                                        </button>
                                    </>
                                ) : (
                                    <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
                                        <Upload size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
                                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Upload Rug Image</span>
                                        <span style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>Click to browse or drag and drop a photo of the rug here.</span>
                                        <input type="file" accept="image/jpeg, image/jpg, image/png, .jpeg, .jpg, .png" style={{ display: 'none' }} onChange={handleImageUpload} />
                                    </label>
                                )}
                            </div>
                        </div>

                    </div>

                    <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                        <Link 
                            href="/appraisals"
                            style={{ padding: '14px 24px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', textDecoration: 'none' }}
                        >
                            Cancel
                        </Link>
                        <button 
                            type="submit" 
                            disabled={saving}
                            style={{ 
                                padding: '14px 32px', borderRadius: '10px', border: 'none', 
                                background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', 
                                fontWeight: 'bold', fontSize: '16px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            <Save size={20} />
                            {saving ? 'Generating...' : 'Save & Generate Certificate'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default function NewAppraisalPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}>
            <AppraisalFormContent />
        </Suspense>
    );
}
