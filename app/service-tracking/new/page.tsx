'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Search, CheckSquare, Square, Truck, Calendar, Clock, User, X, Laptop } from 'lucide-react';
import { getServiceVendors, ServiceVendor } from '@/lib/service-vendor-storage';
import { createServiceOrder, generateOrderNumber, getServiceOrders, ServiceOrder } from '@/lib/service-order-storage';
import { getInventoryItems, InventoryItem } from '@/lib/inventory-storage';
import { getAllInvoices, SavedInvoice } from '@/lib/invoice-storage';

interface ServiceRugItem {
    sku: string;
    description: string;
    size?: string;
    customerName: string;
    source: 'inventory' | 'invoice' | 'unlisted';
    invoiceId?: string;
    defaultServiceType?: 'Wash' | 'Repair' | 'Both';
    isAlreadyAtService?: boolean;
}

const formatSize = (item: any) => {
    if (!item) return '';
    if (item.shape === 'round') {
        return `Dia: ${item.widthFeet || 0}'${item.widthInches || 0}"`;
    }
    return `${item.widthFeet || 0}'${item.widthInches || 0}" x ${item.lengthFeet || 0}'${item.lengthInches || 0}"`;
};

export default function NewServiceOrderPage() {
    const router = useRouter();
    const [vendors, setVendors] = useState<ServiceVendor[]>([]);
    const [inventory, setInventory] = useState<ServiceRugItem[]>([]);
    const [invoiceRugs, setInvoiceRugs] = useState<ServiceRugItem[]>([]);
    const [atServiceRugs, setAtServiceRugs] = useState<ServiceRugItem[]>([]);
    const [completedRugs, setCompletedRugs] = useState<ServiceRugItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRugsMap, setSelectedRugsMap] = useState<Record<string, 'Wash' | 'Repair' | 'Both'>>({});
    const [unlistedRugs, setUnlistedRugs] = useState<ServiceRugItem[]>([]);
    const [isUnlistedModalOpen, setIsUnlistedModalOpen] = useState(false);
    const [newUnlistedRug, setNewUnlistedRug] = useState({ sku: '', description: '', size: '' });
    const [orderNumber, setOrderNumber] = useState('');
    const [activeTab, setActiveTab] = useState<'invoices' | 'inventory' | 'atService' | 'completed'>('invoices');
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            const [vData, iData, invData, nextNum, orders] = await Promise.all([
                getServiceVendors(),
                getInventoryItems(),
                getAllInvoices(),
                generateOrderNumber(),
                getServiceOrders()
            ]);

            setVendors(vData || []);

            // Get all SKUs currently in active service orders or previously serviced
            const currentlyAtServiceSkus = new Set<string>();
            const alreadyServicedByInvoice = new Set<string>(); // "sku-invoiceId"
            const serviceRugDetails: ServiceRugItem[] = [];
            const completedRugDetails: ServiceRugItem[] = [];

            (orders || []).forEach(order => {
                order.rugs.forEach(rug => {
                    if (rug.invoiceId) {
                        alreadyServicedByInvoice.add(`${rug.sku}-${String(rug.invoiceId)}`);
                    }

                    if (!rug.returned && order.status !== 'COMPLETED') {
                        currentlyAtServiceSkus.add(rug.sku);
                        serviceRugDetails.push({
                            sku: rug.sku,
                            description: rug.description,
                            size: rug.size,
                            customerName: rug.customerName,
                            source: 'inventory',
                            invoiceId: rug.invoiceId
                        });
                    } else if (rug.returned) {
                        completedRugDetails.push({
                            sku: rug.sku,
                            description: rug.description,
                            size: rug.size,
                            customerName: rug.customerName,
                            source: 'inventory',
                            invoiceId: rug.invoiceId
                        });
                    }
                });
            });

            setAtServiceRugs(serviceRugDetails);
            setCompletedRugs(completedRugDetails);


            // Extract rugs from all invoices where items are marked for wash/repair
            // IMPORTANT: Invoice rugs take priority — even if a rug also exists in inventory,
            // it should show here because it's tied to a customer order.
            const initialWashRugs: ServiceRugItem[] = [];
            (invData || []).forEach(inv => {
                if (!inv || !inv.data || !Array.isArray(inv.data.items)) return;

                const items = inv.data.items;
                items.forEach(item => {
                    if (!item || !item.sku) return;

                    const status = inv.data.status || '';
                    const isPickedUp = status.toUpperCase() === 'PICKED_UP';

                    // Only skip if already serviced for THIS specific invoice
                    const isAlreadyServicedForThisInvoice = alreadyServicedByInvoice.has(`${item.sku}-${String(inv.id)}`);

                    const needsService = !isPickedUp && !isAlreadyServicedForThisInvoice && item.serviceType &&
                        typeof item.serviceType === 'object' &&
                        (item.serviceType.wash || item.serviceType.repair);

                    if (needsService) {
                        const wash = item.serviceType?.wash;
                        const repair = item.serviceType?.repair;
                        const defaultService: 'Wash' | 'Repair' | 'Both' = (wash && repair) ? 'Both' : (repair ? 'Repair' : 'Wash');

                        initialWashRugs.push({
                            sku: item.sku,
                            description: item.description || '',
                            size: formatSize(item),
                            customerName: inv.data.soldTo?.name || 'Marco Polo',
                            source: 'invoice' as const,
                            invoiceId: inv.id,
                            defaultServiceType: defaultService,
                            isAlreadyAtService: currentlyAtServiceSkus.has(item.sku)
                        });
                    }
                });
            });

            setInvoiceRugs(initialWashRugs);

            // Filter inventory: show AVAILABLE rugs NOT already showing in the invoice list
            // This prevents double-listing a rug that appears in both inventory and an invoice
            const invoiceRugSkus = new Set(initialWashRugs.map(r => r.sku));
            setInventory((iData || []).filter(item =>
                item && item.status === 'AVAILABLE' && !invoiceRugSkus.has(item.sku)
            ).map(item => ({
                sku: item.sku,
                description: item.description || '',
                size: formatSize(item),
                customerName: 'Marco Polo',
                source: 'inventory' as const,
                isAlreadyAtService: currentlyAtServiceSkus.has(item.sku)
            })));

            setOrderNumber(nextNum || `MP-${new Date().getFullYear()}-001`);

            if (initialWashRugs.length === 0 && (iData || []).length > 0) {
                setActiveTab('inventory');
            }
        } catch (error) {
            console.error('Error loading data for service order:', error);
            setFetchError('Failed to load inventory or invoices. Please refresh.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleRug = (sku: string, defaultType: 'Wash' | 'Repair' | 'Both' = 'Wash') => {
        const newMap = { ...selectedRugsMap };
        if (newMap[sku]) {
            delete newMap[sku];
        } else {
            newMap[sku] = defaultType;
        }
        setSelectedRugsMap(newMap);
    };

    const handleServiceTypeChange = (sku: string, type: 'Wash' | 'Repair' | 'Both') => {
        if (selectedRugsMap[sku]) {
            setSelectedRugsMap({ ...selectedRugsMap, [sku]: type });
        }
    };

    const handleSelectAllGroup = (rugs: ServiceRugItem[]) => {
        const newMap = { ...selectedRugsMap };
        const allInGroupSelected = rugs.every(r => !!newMap[r.sku]);

        if (allInGroupSelected) {
            // Deselect all in group
            rugs.forEach(r => delete newMap[r.sku]);
        } else {
            // Select all in group
            rugs.forEach(r => {
                if (!newMap[r.sku]) {
                    newMap[r.sku] = r.defaultServiceType || 'Wash';
                }
            });
        }
        setSelectedRugsMap(newMap);
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
            size: newUnlistedRug.size,
            customerName: 'Marco Polo',
            source: 'unlisted',
            defaultServiceType: 'Wash'
        };

        setUnlistedRugs([...unlistedRugs, rug]);
        setSelectedRugsMap({ ...selectedRugsMap, [rug.sku]: 'Wash' });
        setNewUnlistedRug({ sku: '', description: '', size: '' });
        setIsUnlistedModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!orderData.vendorId) {
            alert('Please select a service company');
            return;
        }

        if (!orderData.driverName.trim()) {
            alert('Please enter the driver name');
            return;
        }

        // Combine all rug sources
        const allAvailableRugs: ServiceRugItem[] = [
            ...inventory,
            ...invoiceRugs,
            ...unlistedRugs
        ];

        const selectedRugSkus = Object.keys(selectedRugsMap);
        if (selectedRugSkus.length === 0) {
            alert('Please select at least one rug');
            return;
        }

        const selectedRugs = allAvailableRugs
            .filter(item => selectedRugSkus.includes(item.sku))
            .map(item => ({
                sku: item.sku,
                description: item.description,
                size: item.size,
                customerName: item.customerName,
                invoiceId: item.invoiceId,
                serviceType: selectedRugsMap[item.sku],
                returned: false
            }));

        if (selectedRugs.length === 0) {
            alert('Error: Could not match selected rugs. Please try again.');
            return;
        }

        const vendor = vendors.find(v => v.id === orderData.vendorId);

        setIsSubmitting(true);
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
            alert('Failed to create service order. Please check all fields and try again.');
            setIsSubmitting(false);
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
                                    <input type="text" placeholder="Who picked up?" value={orderData.driverName} onChange={e => setOrderData({ ...orderData, driverName: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
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
                        disabled={Object.keys(selectedRugsMap).length === 0 || isSubmitting}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--primary)', color: 'white', padding: '1rem', borderRadius: '0.5rem', border: 'none', cursor: (Object.keys(selectedRugsMap).length === 0 || isSubmitting) ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '1.125rem', opacity: (Object.keys(selectedRugsMap).length === 0 || isSubmitting) ? 0.5 : 1 }}
                    >
                        <CheckSquare size={20} />
                        {isSubmitting ? 'Saving...' : `Confirm & Send ${Object.keys(selectedRugsMap).length > 0 ? `(${Object.keys(selectedRugsMap).length} Rugs)` : ''}`}
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

                            <button type="button" onClick={() => setActiveTab('atService')} style={{ background: 'none', border: 'none', padding: '0.5rem 0.25rem', fontWeight: 700, fontSize: '0.9rem', color: activeTab === 'atService' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'atService' ? '2px solid var(--primary)' : 'none', cursor: 'pointer' }}>
                                Already Out ({atServiceRugs.length})
                            </button>
                            <button type="button" onClick={() => setActiveTab('completed')} style={{ background: 'none', border: 'none', padding: '0.5rem 0.25rem', fontWeight: 700, fontSize: '0.9rem', color: activeTab === 'completed' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'completed' ? '2px solid var(--primary)' : 'none', cursor: 'pointer' }}>
                                Completed ({completedRugs.length})
                            </button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input type="text" placeholder={activeTab === 'atService' ? "Search rugs currently out..." : (activeTab === 'invoices' ? "Search customer or SKU..." : "Search SKU or description...")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
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
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <User size={14} />
                                                        {customer.toUpperCase()}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectAllGroup(rugs)}
                                                        style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'var(--primary-light)', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 700 }}
                                                    >
                                                        {rugs.every(r => !!selectedRugsMap[r.sku]) ? 'Deselect All' : 'Select All'}
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {rugs.map(rug => (
                                                        <RugSelectionItem
                                                            key={rug.sku}
                                                            sku={rug.sku}
                                                            description={rug.description}
                                                            size={rug.size}
                                                            isSelected={!!selectedRugsMap[rug.sku]}
                                                            onToggle={() => handleToggleRug(rug.sku, rug.defaultServiceType)}
                                                            source="invoice"
                                                            serviceType={selectedRugsMap[rug.sku]}
                                                            onServiceTypeChange={(type) => handleServiceTypeChange(rug.sku, type)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : activeTab === 'atService' ? (
                                atServiceRugs.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No rugs currently at service.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {atServiceRugs.filter(r =>
                                            String(r.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            String(r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            String(r.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map(rug => (
                                            <div key={rug.sku} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)', opacity: 0.6 }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rug.sku}</div>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '0.25rem', backgroundColor: '#e0f2fe', color: '#0369a1' }}>AT SERVICE</div>
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rug.description}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{rug.customerName}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                completedRugs.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No recently completed rugs.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {completedRugs.filter(r =>
                                            String(r.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            String(r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            String(r.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map(rug => (
                                            <div key={`${rug.sku}-${rug.invoiceId || 'idx'}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #4CAF50', backgroundColor: 'rgba(76, 175, 80, 0.05)' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rug.sku}</div>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '0.25rem', backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9' }}>COMPLETED</div>
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rug.description}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                                        {rug.size && <div style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 600 }}>Size: {rug.size}</div>}
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rug.customerName}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                            {unlistedRugs.length > 0 && (
                                <div style={{ marginTop: '2rem', borderTop: '2px dashed var(--border)', paddingTop: '1.5rem' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>UNLISTED ITEMS</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {unlistedRugs.map(rug => (
                                            <RugSelectionItem
                                                key={rug.sku}
                                                sku={rug.sku}
                                                description={rug.description}
                                                size={rug.size}
                                                isSelected={!!selectedRugsMap[rug.sku]}
                                                onToggle={() => handleToggleRug(rug.sku)}
                                                source="unlisted"
                                                serviceType={selectedRugsMap[rug.sku]}
                                                onServiceTypeChange={(type) => handleServiceTypeChange(rug.sku, type)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{Object.keys(selectedRugsMap).length} rugs selected</span>
                            <button type="button" onClick={() => setSelectedRugsMap({})} style={{ fontSize: '0.875rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear Selection</button>
                        </div>
                    </div>
                </div>
            </form>

            <UnlistedRugModal isOpen={isUnlistedModalOpen} onClose={() => setIsUnlistedModalOpen(false)} onSubmit={handleAddUnlistedRug} newRug={newUnlistedRug} setNewRug={setNewUnlistedRug} />
        </div>
    );
}

function RugSelectionItem({
    sku,
    description,
    size,
    isSelected,
    onToggle,
    source,
    serviceType,
    onServiceTypeChange
}: {
    sku: string,
    description: string,
    size?: string,
    isSelected: boolean,
    onToggle: () => void,
    source: string,
    serviceType?: 'Wash' | 'Repair' | 'Both',
    onServiceTypeChange: (type: 'Wash' | 'Repair' | 'Both') => void
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-void)', transition: 'all 0.2s' }}>
            <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                {isSelected ? <CheckSquare size={20} color="var(--primary)" /> : <Square size={20} color="var(--text-muted)" />}
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sku}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '0.25rem', backgroundColor: source === 'invoice' ? 'var(--primary-light)' : 'var(--bg-void)', color: source === 'invoice' ? 'var(--primary)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>{source.toUpperCase()}</div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{description}</div>
                    {size && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Size: {size}</div>}
                </div>
            </div>

            {isSelected && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', paddingLeft: '2.25rem' }}>
                    {(['Wash', 'Repair', 'Both'] as const).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onServiceTypeChange(type)}
                            style={{
                                flex: 1,
                                padding: '0.3rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                borderRadius: '0.25rem',
                                border: `1px solid ${serviceType === type ? 'var(--primary)' : 'var(--border)'}`,
                                backgroundColor: serviceType === type ? 'var(--primary)' : 'white',
                                color: serviceType === type ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            )}
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
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Size</label>
                        <input type="text" placeholder="e.g. 8' x 10'" value={newRug.size} onChange={e => setNewRug({ ...newRug, size: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                    </div>
                    <button type="submit" style={{ marginTop: '1rem', backgroundColor: 'var(--primary)', color: 'white', padding: '1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Add to Selection</button>
                </form>
            </div>
        </div>
    );
}
