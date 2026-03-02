'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Search, CheckSquare, Square, Truck, Calendar, Clock, User, X } from 'lucide-react';
import { getServiceVendors, ServiceVendor } from '@/lib/service-vendor-storage';
import { createServiceOrder, generateOrderNumber } from '@/lib/service-order-storage';
import { getInventoryItems, InventoryItem } from '@/lib/inventory-storage';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';

interface ServiceRugItem {
    sku: string;
    description: string;
    customerName: string;
    source: 'inventory' | 'invoice';
}

export default function NewServiceOrderPage() {
    const router = useRouter();
    const [vendors, setVendors] = useState<ServiceVendor[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [invoiceRugs, setInvoiceRugs] = useState<ServiceRugItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRugSkus, setSelectedRugSkus] = useState<string[]>([]);
    const [unlistedRugs, setUnlistedRugs] = useState<{ sku: string, description: string }[]>([]);
    const [isUnlistedModalOpen, setIsUnlistedModalOpen] = useState(false);
    const [newUnlistedRug, setNewUnlistedRug] = useState({ sku: '', description: '' });
    const [orderNumber, setOrderNumber] = useState('');

    const [orderData, setOrderData] = useState({
        vendorId: '',
        vendorName: '',
        dateSent: new Date().toISOString().split('T')[0],
        driverName: '',
        pickupDate: new Date().toISOString().split('T')[0],
        pickupTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [vData, iData, invData, nextNum] = await Promise.all([
            getServiceVendors(),
            getInventoryItems(),
            getAllInvoices(),
            generateOrderNumber()
        ]);
        setVendors(vData);
        // Only show AVAILABLE rugs from inventory
        setInventory(iData.filter(item => item.status === 'AVAILABLE'));

        // Extract rugs from WASH invoices
        const washRugs: ServiceRugItem[] = [];
        invData.forEach(inv => {
            if (inv.documentType === 'WASH' || inv.data.documentType === 'WASH') {
                inv.data.items.forEach(item => {
                    if (item.serviceType?.wash || item.serviceType?.repair) {
                        washRugs.push({
                            sku: item.sku,
                            description: item.description,
                            customerName: inv.data.soldTo?.name || 'Marco Polo',
                            source: 'invoice'
                        });
                    }
                });
            }
        });
        setInvoiceRugs(washRugs);

        setOrderNumber(nextNum);
        setIsLoading(false);
    };

    const handleToggleRug = (sku: string) => {
        if (selectedRugSkus.includes(sku)) {
            setSelectedRugSkus(selectedRugSkus.filter(s => s !== sku));
        } else {
            setSelectedRugSkus([...selectedRugSkus, sku]);
        }
    };

    const handleAddUnlistedRug = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnlistedRug.sku) return;

        // Check if SKU already exists in inventory or unlisted
        if (inventory.some(i => i.sku === newUnlistedRug.sku) || unlistedRugs.some(r => r.sku === newUnlistedRug.sku)) {
            alert('This SKU already exists in the list.');
            return;
        }

        setUnlistedRugs([...unlistedRugs, newUnlistedRug]);
        setSelectedRugSkus([...selectedRugSkus, newUnlistedRug.sku]);
        setNewUnlistedRug({ sku: '', description: '' });
        setIsUnlistedModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderData.vendorId) {
            alert('Please select a service company');
            return;
        }
        if (selectedRugSkus.length === 0) {
            alert('Please select at least one rug');
            return;
        }

        const selectedRugs = [
            ...inventory
                .filter(item => selectedRugSkus.includes(item.sku))
                .map(item => ({
                    sku: item.sku,
                    description: item.description,
                    customerName: 'Marco Polo',
                    returned: false
                })),
            ...invoiceRugs
                .filter(item => selectedRugSkus.includes(item.sku))
                .map(item => ({
                    sku: item.sku,
                    description: item.description,
                    customerName: item.customerName,
                    returned: false
                })),
            ...unlistedRugs
                .filter(item => selectedRugSkus.includes(item.sku))
                .map(item => ({
                    sku: item.sku,
                    description: item.description,
                    customerName: 'Marco Polo',
                    returned: false
                }))
        ];

        const vendor = vendors.find(v => v.id === orderData.vendorId);

        try {
            await createServiceOrder({
                ...orderData,
                vendorName: vendor?.name || '',
                orderNumber,
                rugs: selectedRugs
            });
            router.push('/service-tracking');
        } catch (error) {
            console.error('Error creating service order:', error);
            alert('Failed to create service order');
        }
    };

    const allRugItems = [
        ...inventory.map(i => ({ sku: i.sku, description: i.description, customerName: 'Marco Polo', source: 'inventory' as const })),
        ...invoiceRugs,
        ...unlistedRugs.map(r => ({ sku: r.sku, description: r.description, customerName: 'Marco Polo', source: 'unlisted' as const }))
    ];

    // Deduplicate by SKU, prioritizing invoice rugs if they have the same SKU
    const uniqueRugItems = allRugItems.reduce((acc, current) => {
        const x = acc.find(item => item.sku === current.sku);
        if (!x) {
            return acc.concat([current]);
        } else if (current.source === 'invoice') {
            // Priority to invoice rug if it has customer info
            return acc.filter(item => item.sku !== current.sku).concat([current]);
        } else {
            return acc;
        }
    }, [] as any[]);

    const filteredInventory = uniqueRugItems.filter(item =>
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1rem' }}
                >
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>Send Rugs to Service</h1>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Side: Order Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Truck size={20} />
                            Service Order Details
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Order Number</label>
                                <input
                                    readOnly
                                    type="text"
                                    value={orderNumber}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)', opacity: 0.8 }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Service Company</label>
                                <select
                                    required
                                    value={orderData.vendorId}
                                    onChange={e => setOrderData({ ...orderData, vendorId: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                >
                                    <option value="">Select a company...</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name} ({v.serviceType})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Date Sent</label>
                                    <input
                                        type="date"
                                        value={orderData.dateSent}
                                        onChange={e => setOrderData({ ...orderData, dateSent: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Driver Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Who picked up?"
                                        value={orderData.driverName}
                                        onChange={e => setOrderData({ ...orderData, driverName: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Pickup Date</label>
                                    <input
                                        type="date"
                                        value={orderData.pickupDate}
                                        onChange={e => setOrderData({ ...orderData, pickupDate: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Pickup Time</label>
                                    <input
                                        type="time"
                                        value={orderData.pickupTime}
                                        onChange={e => setOrderData({ ...orderData, pickupTime: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Notes (Optional)</label>
                                <textarea
                                    value={orderData.notes}
                                    onChange={e => setOrderData({ ...orderData, notes: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)', minHeight: '100px', resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={selectedRugSkus.length === 0}
                        style={{
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
                            fontWeight: 600,
                            fontSize: '1.125rem',
                            opacity: selectedRugSkus.length === 0 ? 0.5 : 1
                        }}
                    >
                        <CheckSquare size={20} />
                        Confirm & Send {selectedRugSkus.length > 0 ? `(${selectedRugSkus.length} Rugs)` : ''}
                    </button>
                </div>

                {/* Right Side: Rug Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Select Rugs from Inventory</h2>
                            <button
                                type="button"
                                onClick={() => setIsUnlistedModalOpen(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)',
                                    background: 'var(--primary-light)',
                                    border: 'none',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '0.4rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <Plus size={14} />
                                Add Unlisted
                            </button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                            />
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px', paddingRight: '0.5rem' }}>
                            {isLoading ? (
                                <p>Loading inventory...</p>
                            ) : filteredInventory.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No available rugs found.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {filteredInventory.map(item => (
                                        <div
                                            key={item.sku}
                                            onClick={() => handleToggleRug(item.sku)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: `1px solid ${selectedRugSkus.includes(item.sku) ? 'var(--primary)' : 'var(--border)'}`,
                                                backgroundColor: selectedRugSkus.includes(item.sku) ? 'var(--primary-light)' : 'var(--bg-void)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {selectedRugSkus.includes(item.sku) ? <CheckSquare size={20} color="var(--primary)" /> : <Square size={20} color="var(--text-muted)" />}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.sku}</div>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '0.25rem', backgroundColor: item.source === 'invoice' ? 'var(--primary-light)' : 'var(--bg-void)', color: item.source === 'invoice' ? 'var(--primary)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                                        {item.source.toUpperCase()}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</div>
                                                <div style={{ fontSize: '0.75rem', color: item.customerName === 'Marco Polo' ? 'var(--text-muted)' : 'var(--primary)', fontWeight: item.customerName === 'Marco Polo' ? 400 : 600 }}>
                                                    {item.customerName}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{selectedRugSkus.length} rugs selected</span>
                            <button
                                type="button"
                                onClick={() => setSelectedRugSkus([])}
                                style={{ fontSize: '0.875rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Clear Selection
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Unlisted Rug Modal */}
            {isUnlistedModalOpen && (
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
                    zIndex: 2000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '1rem',
                        width: '100%',
                        maxWidth: '400px',
                        padding: '2rem',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Add Unlisted Rug</h3>
                            <button
                                type="button"
                                onClick={() => setIsUnlistedModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddUnlistedRug} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>SKU / ID</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Enter Rug SKU"
                                    value={newUnlistedRug.sku}
                                    onChange={e => setNewUnlistedRug({ ...newUnlistedRug, sku: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Description</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. 8x10 Persian Red"
                                    value={newUnlistedRug.description}
                                    onChange={e => setNewUnlistedRug({ ...newUnlistedRug, description: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                />
                            </div>
                            <button
                                type="submit"
                                style={{
                                    marginTop: '1rem',
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Add to Selection
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
