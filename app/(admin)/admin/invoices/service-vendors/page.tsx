'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, Search, X, Save, User, FileText, CheckCircle2 } from 'lucide-react';
import { getServiceVendors, saveServiceVendor, deleteServiceVendor, ServiceVendor } from '@/lib/service-vendor-storage';

export default function ServiceVendorsPage() {
    const [vendors, setVendors] = useState<ServiceVendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Partial<ServiceVendor> | null>(null);

    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        setIsLoading(true);
        const data = await getServiceVendors();
        setVendors(data);
        setIsLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVendor) return;

        try {
            await saveServiceVendor(editingVendor);
            setIsModalOpen(false);
            setEditingVendor(null);
            loadVendors();
        } catch (error) {
            console.error('Error saving vendor:', error);
            alert('Failed to save vendor');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this vendor?')) {
            await deleteServiceVendor(id);
            loadVendors();
        }
    };

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Service Vendors</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage external companies for rug washing and repair.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingVendor({ name: '', contactPerson: '', phone: '', email: '', address: '', serviceType: 'Both', notes: '' });
                        setIsModalOpen(true);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'opacity 0.2s'
                    }}
                >
                    <Plus size={20} />
                    Add Vendor
                </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '2rem' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                <input
                    type="text"
                    placeholder="Search vendors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 3rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '1rem'
                    }}
                />
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Loading vendors...</div>
            ) : filteredVendors.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '1rem',
                    border: '1px dashed var(--border)'
                }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No vendors found.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{ color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        Click to add your first vendor
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {filteredVendors.map(vendor => (
                        <div
                            key={vendor.id}
                            style={{
                                backgroundColor: 'var(--bg-card)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>{vendor.name}</h3>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '1rem',
                                        backgroundColor: 'var(--primary-light)',
                                        color: 'var(--primary)',
                                        fontWeight: 700,
                                        textTransform: 'uppercase'
                                    }}>
                                        {vendor.serviceType}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => {
                                            setEditingVendor(vendor);
                                            setIsModalOpen(true);
                                        }}
                                        style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'var(--bg-void)', cursor: 'pointer', color: 'var(--text-muted)' }}
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(vendor.id)}
                                        style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'var(--bg-void)', cursor: 'pointer', color: '#ff4444' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                                    <User size={18} />
                                    <span>{vendor.contactPerson}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                                    <Phone size={18} />
                                    <span>{vendor.phone}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                                    <Mail size={18} />
                                    <span>{vendor.email}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                                    <MapPin size={18} />
                                    <span>{vendor.address}</span>
                                </div>
                            </div>

                            {vendor.notes && (
                                <div style={{
                                    marginTop: '0.5rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid var(--border)',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-muted)',
                                    fontStyle: 'italic'
                                }}>
                                    {vendor.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && editingVendor && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '1rem',
                        width: '100%',
                        maxWidth: '500px',
                        padding: '2rem',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                                {editingVendor.id ? 'Edit Vendor' : 'Add New Vendor'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Company Name</label>
                                <input
                                    required
                                    type="text"
                                    value={editingVendor.name}
                                    onChange={e => setEditingVendor({ ...editingVendor, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Contact Person</label>
                                    <input
                                        required
                                        type="text"
                                        value={editingVendor.contactPerson}
                                        onChange={e => setEditingVendor({ ...editingVendor, contactPerson: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Service Type</label>
                                    <select
                                        value={editingVendor.serviceType}
                                        onChange={e => setEditingVendor({ ...editingVendor, serviceType: e.target.value as any })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                    >
                                        <option value="Wash">Wash</option>
                                        <option value="Repair">Repair</option>
                                        <option value="Both">Both</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Phone</label>
                                <input
                                    required
                                    type="tel"
                                    value={editingVendor.phone}
                                    onChange={e => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Email</label>
                                <input
                                    required
                                    type="email"
                                    value={editingVendor.email}
                                    onChange={e => setEditingVendor({ ...editingVendor, email: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Address</label>
                                <textarea
                                    required
                                    value={editingVendor.address}
                                    onChange={e => setEditingVendor({ ...editingVendor, address: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)', minHeight: '80px', resize: 'vertical' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Notes</label>
                                <textarea
                                    value={editingVendor.notes}
                                    onChange={e => setEditingVendor({ ...editingVendor, notes: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)', minHeight: '80px', resize: 'vertical' }}
                                />
                            </div>

                            <button
                                type="submit"
                                style={{
                                    marginTop: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                <Save size={20} />
                                {editingVendor.id ? 'Update Vendor' : 'Create Vendor'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
