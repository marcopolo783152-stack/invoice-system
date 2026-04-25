'use client';

import React, { useState } from 'react';
import { X, HelpCircle, Phone, Mail, ShieldAlert } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SUPPORT_INFO = {
    name: 'M.Nazif.S',
    contact: '5714194012 (WhatsApp)',
    emails: [
        'mnsaifycounsel@worker.com',
        'mohammadnazifsaify20@gmail.com'
    ]
};

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
    const [showAdminContact, setShowAdminContact] = useState(false);

    if (!isOpen) return null;

    const handleRevealContact = () => {
        const key = prompt('Please enter Admin Key to view support contacts:');
        if (key === 'Ariana$') {
            setShowAdminContact(true);
        } else {
            alert('Incorrect Admin Key');
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '12px', color: '#2563eb' }}>
                            <HelpCircle size={24} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>Help & Support</h2>
                    </div>
                    <button onClick={onClose} style={{ padding: '8px', cursor: 'pointer', background: 'transparent', border: 'none', color: '#6b7280' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>

                    {/* General System Info (Visible to All) */}
                    <section style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></span>
                            System Overview
                        </h3>
                        <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#4b5563', lineHeight: '1.6' }}>
                                <li><strong>Invoices:</strong> Create, manage, and print invoices for Sales, Consignments, and Services.</li>
                                <li><strong>Drafts:</strong> Save work-in-progress invoices to finish later (Access via "Draft Box").</li>
                                <li><strong>Recycle Bin:</strong> Deleted invoices are safely stored in the Recycle Bin on the main page.</li>
                                <li><strong>Inventory:</strong> Track stock levels automatically as you create invoices.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Admin Support Section */}
                    <section>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldAlert size={18} color="#ef4444" />
                            Technical Support (Admin Only)
                        </h3>

                        {!showAdminContact ? (
                            <div style={{ textAlign: 'center', padding: '30px', background: '#fff1f2', borderRadius: '12px', border: '1px dashed #fecaca' }}>
                                <p style={{ color: '#991b1b', marginBottom: '16px', fontWeight: 500 }}>
                                    Support contact details are restricted to Administrators.
                                </p>
                                <button
                                    onClick={handleRevealContact}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    Reveal Contact Info
                                </button>
                            </div>
                        ) : (
                            <div style={{ background: '#f0fdf4', padding: '24px', borderRadius: '12px', border: '1px solid #bbf7d0', animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#166534' }}>{SUPPORT_INFO.name}</h4>
                                    <span style={{ fontSize: '13px', color: '#15803d', background: '#dcfce7', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>System Developer & Support</span>
                                </div>

                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {/* WhatsApp */}
                                    <a href={`https://wa.me/1${SUPPORT_INFO.contact.split(' ')[0]}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                            <div style={{ padding: '10px', background: '#dcfce7', borderRadius: '50%', color: '#16a34a' }}>
                                                <Phone size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>WhatsApp / Phone</div>
                                                <div style={{ color: '#1f2937', fontWeight: 500 }}>{SUPPORT_INFO.contact}</div>
                                            </div>
                                        </div>
                                    </a>

                                    {/* Emails */}
                                    {SUPPORT_INFO.emails.map((email, idx) => (
                                        <a key={idx} href={`mailto:${email}`} style={{ textDecoration: 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '50%', color: '#2563eb' }}>
                                                    <Mail size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Email Support {idx + 1}</div>
                                                    <div style={{ color: '#1f2937', fontWeight: 500 }}>{email}</div>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
