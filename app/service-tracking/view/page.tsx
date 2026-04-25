'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Save, Edit, User, FileText, CheckCircle, Truck, Calendar, Tag, Info, Printer, Edit2, X, Square, CheckSquare } from 'lucide-react';
import { getServiceOrderById, markMultipleRugsAsReturned, updateServiceOrder, ServiceOrder, ServiceOrderRug } from '@/lib/service-order-storage';
import { getServiceVendors, ServiceVendor } from '@/lib/service-vendor-storage';
import { openPDFInNewTab } from '@/lib/pdf-utils';

function ServiceOrderDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [order, setOrder] = useState<ServiceOrder | null>(null);
    const [vendor, setVendor] = useState<ServiceVendor | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRugSkus, setSelectedRugSkus] = useState<string[]>([]);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [returnData, setReturnData] = useState({
        receivedBy: '',
        conditionNotes: '',
        serviceType: 'Wash',
        cost: 0,
        dateReturned: new Date().toISOString().split('T')[0]
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<ServiceOrder>>({});
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            loadOrder(id);
        } else {
            setIsLoading(false);
        }
    }, [id]);

    const loadOrder = async (orderId: string) => {
        setIsLoading(true);
        try {
            const data = await getServiceOrderById(orderId);
            setOrder(data);
            if (data?.vendorId) {
                const vendors = await getServiceVendors();
                const v = vendors.find(v => v.id === data.vendorId);
                setVendor(v || null);
            }
        } catch (error) {
            console.error('Error loading order:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleRugSelection = (sku: string) => {
        const rug = order?.rugs.find(r => r.sku === sku);
        if (rug?.returned) return;

        if (selectedRugSkus.includes(sku)) {
            setSelectedRugSkus(selectedRugSkus.filter(s => s !== sku));
        } else {
            setSelectedRugSkus([...selectedRugSkus, sku]);
        }
    };

    const handleMarkReturnedBulk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order || selectedRugSkus.length === 0) return;

        try {
            const updatedOrder = await markMultipleRugsAsReturned(order.id, selectedRugSkus, returnData);
            setOrder(updatedOrder);
            setSelectedRugSkus([]);
            setIsReturnModalOpen(false);
            setReturnData({
                receivedBy: '',
                conditionNotes: '',
                serviceType: 'Wash',
                cost: 0,
                dateReturned: new Date().toISOString().split('T')[0]
            });
        } catch (error) {
            console.error('Error marking rugs as returned:', error);
            alert('Failed to update rug status');
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;
        try {
            const updatedOrder = await updateServiceOrder(order.id, editData);
            setOrder(updatedOrder);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Failed to update order details');
        }
    };

    const handlePrintPDF = async () => {
        if (printRef.current && order) {
            try {
                await openPDFInNewTab(printRef.current, order.orderNumber);
            } catch (error) {
                console.error('PDF generation failed:', error);
                alert('Failed to generate PDF. Falling back to browser print.');
                window.print();
            }
        }
    };

    if (isLoading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
    if (!order) return <div style={{ padding: '3rem', textAlign: 'center' }}>Order not found</div>;

    const availableRugsCount = order.rugs.filter(r => !r.returned).length;

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <button
                        onClick={() => router.back()}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1rem' }}
                    >
                        <ArrowLeft size={18} />
                        Back to Tracking
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{order.orderNumber}</h1>
                        <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '1rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: order.status === 'COMPLETED' ? '#4CAF50' : 'var(--primary)',
                            color: 'white'
                        }}>
                            {order.status}
                        </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '0.25rem' }}>Sent to <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{order.vendorName}</span></p>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => {
                                setEditData({
                                    driverName: order.driverName,
                                    pickupDate: order.pickupDate,
                                    pickupTime: order.pickupTime,
                                    notes: order.notes
                                });
                                setIsEditing(true);
                            }}
                            className="no-print"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                            <Edit2 size={16} /> Edit
                        </button>
                        <button
                            onClick={handlePrintPDF}
                            className="no-print"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                            <Printer size={16} /> Print Receipt (PDF)
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', justifyContent: 'flex-end' }}>
                        <Calendar size={18} />
                        <span>Date Sent: {order.dateSent ? new Date(order.dateSent).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', justifyContent: 'flex-end' }}>
                        <Truck size={18} />
                        <span>Pickup: {order.driverName} on {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString() : 'N/A'} at {order.pickupTime}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Rugs in Order</h2>
                                {availableRugsCount > 0 && selectedRugSkus.length > 0 && (
                                    <button
                                        onClick={() => setIsReturnModalOpen(true)}
                                        style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Mark {selectedRugSkus.length} as Returned
                                    </button>
                                )}
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{order.rugs.length} total rugs</span>
                        </div>

                        <div style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {order.rugs.map(rug => (
                                    <div
                                        key={rug.sku}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '0.75rem',
                                            border: `1px solid ${rug.returned ? 'var(--border)' : (selectedRugSkus.includes(rug.sku) ? 'var(--primary)' : 'var(--border)')}`,
                                            backgroundColor: rug.returned ? 'var(--bg-void)' : (selectedRugSkus.includes(rug.sku) ? 'var(--primary-light)' : 'var(--bg-card)'),
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            opacity: rug.returned ? 0.7 : 1,
                                            cursor: rug.returned ? 'default' : 'pointer'
                                        }}
                                        onClick={() => handleToggleRugSelection(rug.sku)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {!rug.returned && (
                                                <div
                                                    style={{ color: selectedRugSkus.includes(rug.sku) ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleRugSelection(rug.sku);
                                                    }}
                                                >
                                                    {selectedRugSkus.includes(rug.sku) ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </div>
                                            )}
                                            <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: rug.returned ? '#E8F5E9' : '#FFF3E0', color: rug.returned ? '#4CAF50' : '#FF9800' }}>
                                                {rug.returned ? <CheckCircle size={20} /> : <Tag size={20} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{rug.sku}</div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{rug.description}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                                                    {rug.size && <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>Size: {rug.size}</div>}
                                                    <div style={{ fontSize: '0.75rem', color: (rug.customerName || 'Ariana') === 'Ariana' ? 'var(--text-muted)' : 'var(--primary)', fontWeight: 600 }}>{rug.customerName || 'Ariana'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {rug.serviceType && <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.1rem 0.4rem', borderRadius: '0.2rem' }}>{rug.serviceType.toUpperCase()}</span>}
                                                {rug.returned ? (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4CAF50', backgroundColor: '#E8F5E9', padding: '0.1rem 0.5rem', borderRadius: '0.25rem' }}>RETURNED</span>
                                                ) : (
                                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Out for Service</span>
                                                )}
                                            </div>
                                            {rug.returned && rug.dateReturned && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(rug.dateReturned).toLocaleDateString()}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {order.notes && (
                        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border)', padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Info size={18} />
                                Order Notes
                            </h3>
                            <p style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{order.notes}</p>
                        </div>
                    )}
                </div>

                <div style={{ position: 'sticky', top: '2rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Quick Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                onClick={() => router.push('/service-tracking')}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-void)', fontWeight: 600, cursor: 'pointer' }}
                            >
                                View All Orders
                            </button>
                            {availableRugsCount > 0 && selectedRugSkus.length === 0 && (
                                <button
                                    onClick={() => setSelectedRugSkus(order.rugs.filter(r => !r.returned).map(r => r.sku))}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'var(--primary-light)', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Select All for Return
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Return Modal (Bulk) */}
            {isReturnModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '1rem', width: '100%', maxWidth: '450px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Mark Returns</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedRugSkus.length} rugs selected</p>
                            </div>
                            <button onClick={() => setIsReturnModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleMarkReturnedBulk} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Return Date</label>
                                <input required type="date" value={returnData.dateReturned} onChange={e => setReturnData({ ...returnData, dateReturned: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Service Type</label>
                                    <select value={returnData.serviceType} onChange={e => setReturnData({ ...returnData, serviceType: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}>
                                        <option value="Wash">Wash</option>
                                        <option value="Repair">Repair</option>
                                        <option value="Wash & Repair">Both</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Total Cost (Optional)</label>
                                    <input type="number" placeholder="Total for all" onChange={e => setReturnData({ ...returnData, cost: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Received By</label>
                                <input required type="text" placeholder="Staff member name" value={returnData.receivedBy} onChange={e => setReturnData({ ...returnData, receivedBy: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Condition Notes</label>
                                <textarea value={returnData.conditionNotes} onChange={e => setReturnData({ ...returnData, conditionNotes: e.target.value })} placeholder="Add any notes on return condition..." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)', minHeight: '80px', resize: 'vertical' }} />
                            </div>

                            <button type="submit" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--primary)', color: 'white', padding: '1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                <CheckCircle size={20} /> Mark {selectedRugSkus.length} Rugs Returned
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditing && (
                <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '1rem', width: '100%', maxWidth: '500px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Edit Service Order</h3>
                            <button type="button" onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Driver Name</label>
                                    <input required type="text" value={editData.driverName || ''} onChange={e => setEditData({ ...editData, driverName: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Pickup Time</label>
                                    <input type="time" value={editData.pickupTime || ''} onChange={e => setEditData({ ...editData, pickupTime: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Pickup Date</label>
                                <input type="date" value={editData.pickupDate || ''} onChange={e => setEditData({ ...editData, pickupDate: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Notes</label>
                                <textarea value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)', minHeight: '100px', resize: 'vertical' }} />
                            </div>
                            <button type="submit" style={{ marginTop: '1rem', backgroundColor: 'var(--primary)', color: 'white', padding: '1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Save size={20} /> Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Hidden PDF Generation Section */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '850px' }}>
                <div ref={printRef}>
                    <div className="pdf-page" style={{
                        padding: '40px',
                        color: 'black',
                        background: 'white',
                        fontFamily: "'Inter', sans-serif",
                        minHeight: '1050px',
                        width: '800px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Professional Header - Matches Invoice Style */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
                            <div style={{ flex: 1 }}>
                                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#000' }}>ARIANA ORIENTAL RUGS INC</h1>
                                <p style={{ margin: '2px 0', fontSize: '13px' }}>3210 DUKE ST</p>
                                <p style={{ margin: '2px 0', fontSize: '13px' }}>ALEXANDRIA, VA 22314</p>
                                <p style={{ margin: '2px 0', fontSize: '13px' }}>Phone: +1 (703) 801 1640</p>
                                <p style={{ margin: '2px 0', fontSize: '13px' }}>Email: arianaorientalrugs@gmail.com</p>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <img
                                    src="/LOGO.png"
                                    alt="Logo"
                                    style={{ height: '80px', marginBottom: '10px', objectFit: 'contain' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div style={{ textAlign: 'right' }}>
                                    <h2 style={{ fontSize: '20px', margin: 0, color: '#333' }}>SERVICE ORDER</h2>
                                    <p style={{ margin: '5px 0', fontWeight: 'bold', fontSize: '14px' }}>#{order.orderNumber}</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}>
                            <div>
                                <h3 style={{ textTransform: 'uppercase', fontSize: '11px', color: '#666', marginBottom: '8px', fontWeight: 600 }}>Service Provider</h3>
                                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{order.vendorName}</p>
                                {vendor && (
                                    <>
                                        <p style={{ margin: '2px 0', fontSize: '13px' }}>{vendor.address}</p>
                                        <p style={{ margin: '2px 0', fontSize: '13px' }}>Phone: {vendor.phone}</p>
                                        <p style={{ margin: '2px 0', fontSize: '13px' }}>Email: {vendor.email}</p>
                                        {vendor.contactPerson && <p style={{ margin: '2px 0', fontSize: '13px' }}>Attn: {vendor.contactPerson}</p>}
                                    </>
                                )}
                                {!vendor && <p style={{ margin: 0, fontSize: '13px' }}>ID: {order.vendorId}</p>}
                            </div>
                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ textTransform: 'uppercase', fontSize: '11px', color: '#666', marginBottom: '8px', fontWeight: 600 }}>Order Information</h3>
                                <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}><strong>Date Sent:</strong> {new Date(order.dateSent).toLocaleDateString()}</p>
                                <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}><strong>Driver:</strong> {order.driverName}</p>
                                <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>Pickup:</strong> {order.pickupDate} {order.pickupTime}</p>
                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Total Items: {order.rugs.length}</p>
                                </div>
                            </div>
                        </div>

                        <h3 style={{ textTransform: 'uppercase', fontSize: '11px', color: '#666', marginBottom: '10px', fontWeight: 600 }}>Rug List ({order.rugs.length} items)</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #333' }}>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: '11px' }}>SKU</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: '11px' }}>DESCRIPTION</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: '11px' }}>SIZE</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: '11px' }}>SERVICE</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: '11px' }}>CUSTOMER</th>
                                    <th style={{ textAlign: 'right', padding: '12px 10px', fontSize: '11px' }}>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.rugs.map(rug => (
                                    <tr key={rug.sku} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '10px', fontWeight: 'bold', fontSize: '12px' }}>{rug.sku}</td>
                                        <td style={{ padding: '10px', fontSize: '12px' }}>{rug.description}</td>
                                        <td style={{ padding: '10px', fontSize: '12px' }}>{rug.size || 'N/A'}</td>
                                        <td style={{ padding: '10px', fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>{rug.serviceType?.toUpperCase() || 'SERVICE'}</td>
                                        <td style={{ padding: '10px', fontSize: '12px' }}>{rug.customerName || 'Ariana'}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', fontSize: '11px' }}>
                                            <span style={{
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: rug.returned ? '#dcfce7' : '#fef9c3',
                                                color: rug.returned ? '#166534' : '#854d0e',
                                                fontWeight: 800,
                                                fontSize: '10px'
                                            }}>
                                                {rug.returned ? 'RETURNED' : 'IN SERVICE'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {order.notes && (
                            <div style={{ marginTop: 'auto', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ textTransform: 'uppercase', fontSize: '11px', color: '#666', marginBottom: '5px', fontWeight: 600 }}>Additional Notes</h3>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '13px' }}>{order.notes}</p>
                            </div>
                        )}

                        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                            This is an official tracking document generated by Ariana Rugs Tracking System on {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
}

export default function ServiceOrderDetailPage() {
    return (
        <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>}>
            <ServiceOrderDetailContent />
        </Suspense>
    );
}
