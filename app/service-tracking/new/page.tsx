'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Search, CheckSquare, Square, Truck, Calendar, Clock, User, X, Laptop } from 'lucide-react';
import { getServiceVendors, ServiceVendor } from '@/lib/service-vendor-storage';
import { createServiceOrder, generateOrderNumber } from '@/lib/service-order-storage';
import { getInventoryItems, InventoryItem } from '@/lib/inventory-storage';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';

interface ServiceRugItem {
    sku: string;
    description: string;
    customerName: string;
    source: 'inventory' | 'invoice' | 'unlisted';
    invoiceId?: string;
}

export default function NewServiceOrderPage() {
    const router = useRouter();
    const [vendors, setVendors] = useState<ServiceVendor[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [invoiceRugs, setInvoiceRugs] = useState<ServiceRugItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRugSkus, setSelectedRugSkus] = useState<string[]>([]);
    const [unlistedRugs, setUnlistedRugs] = useState<ServiceRugItem[]>([]);
    const [isUnlistedModalOpen, setIsUnlistedModalOpen] = useState(false);
    const [newUnlistedRug, setNewUnlistedRug] = useState({ sku: '', description: '' });
    const [orderNumber, setOrderNumber] = useState('');
    const [activeTab, setActiveTab] = useState<'invoices' | 'inventory'>('invoices');
    const [fetchError, setFetchError] = useState<string | null>(null);

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
        setFetchError(null);
        try {
            const [vData, iData, invData, nextNum] = await Promise.all([
                getServiceVendors(),
                getInventoryItems(),
                getAllInvoices(),
                generateOrderNumber()
            ]);

            setVendors(vData || []);
            setInventory((iData || []).filter(item => item && item.status === 'AVAILABLE'));

            // Extract rugs from all invoices where items are marked for wash/repair
            const washRugs: ServiceRugItem[] = [];
            (invData || []).forEach(inv => {
                if (!inv || !inv.data || !Array.isArray(inv.data.items)) return;

                const items = inv.data.items;
                items.forEach(item => {
                    if (!item || !item.sku) return;

                    const status = inv.data.status || '';
                    const isPickedUp = status.toUpperCase() === 'PICKED_UP';

                    const needsService = !isPickedUp && item.serviceType &&
                        typeof item.serviceType === 'object' &&
                        (item.serviceType.wash || item.serviceType.repair);

                    if (needsService) {
                        washRugs.push({
                            sku: item.sku,
                            description: item.description || '',
                            customerName: inv.data.soldTo?.name || 'Marco Polo',
                            source: 'invoice',
                            invoiceId: inv.id
                        });
                    }
                });
            });

            setInvoiceRugs(washRugs);
            setOrderNumber(nextNum || `MP-${new Date().getFullYear()}-001`);

            if (washRugs.length === 0 && (iData || []).length > 0) {
                setActiveTab('inventory');
            }
        } catch (error) {
            console.error('Error loading data for service order:', error);
            setFetchError('Failed to load inventory or invoices. Please refresh.');
        } finally {
            setIsLoading(false);
        }
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

        const allCurrentRugs = [...inventory, ...invoiceRugs, ...unlistedRugs];
        if (allCurrentRugs.some(r => r.sku === newUnlistedRug.sku)) {
            alert('This SKU already exists in the list.');
            return;
        }

        const rug: ServiceRugItem = {
            sku: newUnlistedRug.sku,
            description: newUnlistedRug.description,
            customerName: 'Marco Polo',
            source: 'unlisted'
        };

        setUnlistedRugs([...unlistedRugs, rug]);
        setSelectedRugSkus([...selectedRugSkus, rug.sku]);
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

        const allAvailableRugs: ServiceRugItem[] = [
            ...inventory.map(i => ({ sku: i.sku, description: i.description || '', customerName: 'Marco Polo', source: 'inventory' as const })),
            ...invoiceRugs,
            ...unlistedRugs
        ];

        const selectedRugs = allAvailableRugs
            .filter(item => selectedRugSkus.includes(item.sku))
            .map(item => ({
                sku: item.sku,
                description: item.description,
                customerName: item.customerName,
                returned: false
            }));

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

    const filteredInvoiceRugs = (invoiceRugs || []).filter(item => {
        if (!item) return false;
        const query = searchTerm.toLowerCase();
        return String(item.sku || '').toLowerCase().includes(query) ||
            String(item.description || '').toLowerCase().includes(query) ||
            String(item.customerName || '').toLowerCase().includes(query);
    });

    const filteredInventory = (inventory || []).filter(item => {
        if (!item) return false;
        const query = searchTerm.toLowerCase();
        return String(item.sku || '').toLowerCase().includes(query) ||
            String(item.description || '').toLowerCase().includes(query);
    });

    const groupedInvoiceRugs = filteredInvoiceRugs.reduce((acc, current) => {
        const customer = current.customerName || 'Other';
        if (!acc[customer]) acc[customer] = [];
        acc[customer].push(current);
        return acc;
    }, {} as Record<string, ServiceRugItem[]>);

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Truck size={20} />
                            Service Order Details
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Order Number</label>
                                <input readOnly type="text" value={orderNumber} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)', opacity: 0.8 }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Service Company</label>
                                <select required value={orderData.vendorId} onChange={e => setOrderData({ ...orderData, vendorId: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}>
                                    <option value="">Select a company...</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name} ({v.serviceType})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Date Sent</label>
                                    <input type="date" value={orderData.dateSent} onChange={e => setOrderData({ ...orderData, dateSent: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Driver Name</label>
                                    <input required type="text" placeholder="Who picked up?" value={orderData.driverName} onChange={e => setOrderData({ ...orderData, driverName: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Pickup Date</label>
                                    <input type="date" value={orderData.pickupDate} onChange={e => setOrderData({ ...orderData, pickupDate: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Pickup Time</label>
                                    <input type="time" value={orderData.pickupTime} onChange={e => setOrderData({ ...orderData, pickupTime: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Notes (Optional)</label>
                                <textarea value={orderData.notes} onChange={e => setOrderData({ ...orderData, notes: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)', minHeight: '100px', resize: 'vertical' }} />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={selectedRugSkus.length === 0}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--primary)', color: 'white', padding: '1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '1.125rem', opacity: selectedRugSkus.length === 0 ? 0.5 : 1 }}
                    >
                        <CheckSquare size={20} />
                        Confirm & Send {selectedRugSkus.length > 0 ? `(${selectedRugSkus.length} Rugs)` : ''}
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Rugs to Send</h2>
                            <button type="button" onClick={() => setIsUnlistedModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', cursor: 'pointer' }}>
                                <Plus size={14} /> Add Unlisted
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <button type="button" onClick={() => setActiveTab('invoices')} style={{ background: 'none', border: 'none', padding: '0.5rem 0.25rem', fontWeight: 700, fontSize: '0.9rem', color: activeTab === 'invoices' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'invoices' ? '2px solid var(--primary)' : 'none', cursor: 'pointer' }}>
                                Service Invoices ({invoiceRugs.length})
                            </button>
                            <button type="button" onClick={() => setActiveTab('inventory')} style={{ background: 'none', border: 'none', padding: '0.5rem 0.25rem', fontWeight: 700, fontSize: '0.9rem', color: activeTab === 'inventory' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'inventory' ? '2px solid var(--primary)' : 'none', cursor: 'pointer' }}>
                                Stock Inventory ({inventory.length})
                            </button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input type="text" placeholder={activeTab === 'invoices' ? "Search customer or SKU..." : "Search SKU or description..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px', paddingRight: '0.5rem' }}>
                            {isLoading ? (
                                <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
                            ) : fetchError ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
                                    <p>{fetchError}</p>
                                    <button onClick={loadData} style={{ marginTop: '0.5rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Try Again</button>
                                </div>
                            ) : activeTab === 'invoices' ? (
                                Object.keys(groupedInvoiceRugs).length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No invoice items found for service.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {Object.entries(groupedInvoiceRugs).map(([customer, rugs]) => (
                                            <div key={customer}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <User size={14} />
                                                    {customer.toUpperCase()}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {rugs.map(rug => (
                                                        <RugSelectionItem key={rug.sku} sku={rug.sku} description={rug.description} isSelected={selectedRugSkus.includes(rug.sku)} onToggle={() => handleToggleRug(rug.sku)} source="invoice" />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                filteredInventory.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No matching inventory found.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {filteredInventory.map(item => (
                                            <RugSelectionItem key={item.sku} sku={item.sku} description={item.description || ''} isSelected={selectedRugSkus.includes(item.sku)} onToggle={() => handleToggleRug(item.sku)} source="inventory" />
                                        ))}
                                    </div>
                                )
                            )}

                            {unlistedRugs.length > 0 && (
                                <div style={{ marginTop: '2rem', borderTop: '2px dashed var(--border)', paddingTop: '1.5rem' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>UNLISTED ITEMS</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {unlistedRugs.map(rug => (
                                            <RugSelectionItem key={rug.sku} sku={rug.sku} description={rug.description} isSelected={selectedRugSkus.includes(rug.sku)} onToggle={() => handleToggleRug(rug.sku)} source="unlisted" />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{selectedRugSkus.length} rugs selected</span>
                            <button type="button" onClick={() => setSelectedRugSkus([])} style={{ fontSize: '0.875rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear Selection</button>
                        </div>
                    </div>
                </div>
            </form>

            <UnlistedRugModal isOpen={isUnlistedModalOpen} onClose={() => setIsUnlistedModalOpen(false)} onSubmit={handleAddUnlistedRug} newRug={newUnlistedRug} setNewRug={setNewUnlistedRug} />
        </div>
    );
}

function RugSelectionItem({ sku, description, isSelected, onToggle, source }: { sku: string, description: string, isSelected: boolean, onToggle: () => void, source: string }) {
    return (
        <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-void)', cursor: 'pointer', transition: 'all 0.2s' }}>
            {isSelected ? <CheckSquare size={20} color="var(--primary)" /> : <Square size={20} color="var(--text-muted)" />}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sku}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '0.25rem', backgroundColor: source === 'invoice' ? 'var(--primary-light)' : 'var(--bg-void)', color: source === 'invoice' ? 'var(--primary)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>{source.toUpperCase()}</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{description}</div>
            </div>
        </div>
    );
}

function UnlistedRugModal({ isOpen, onClose, onSubmit, newRug, setNewRug }: any) {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '1rem', width: '100%', maxWidth: '400px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Add Unlisted Rug</h3>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>
                <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>SKU / ID</label>
                        <input required type="text" placeholder="Enter Rug SKU" value={newRug.sku} onChange={e => setNewRug({ ...newRug, sku: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Description</label>
                        <input required type="text" placeholder="e.g. 8x10 Persian Red" value={newRug.description} onChange={e => setNewRug({ ...newRug, description: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                    </div>
                    <button type="submit" style={{ marginTop: '1rem', backgroundColor: 'var(--primary)', color: 'white', padding: '1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Add to Selection</button>
                </form>
            </div>
        </div>
    );
}
