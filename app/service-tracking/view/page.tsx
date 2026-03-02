'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Save, Edit, User, FileText, CheckCircle, Truck, Calendar, Tag, Info, Printer, Edit2, X } from 'lucide-react';
import { getServiceOrderById, markRugAsReturned, updateServiceOrder, ServiceOrder, ServiceOrderRug } from '@/lib/service-order-storage';

function ServiceOrderDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [order, setOrder] = useState<ServiceOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRug, setSelectedRug] = useState<ServiceOrderRug | null>(null);
    const [returnData, setReturnData] = useState({
        receivedBy: '',
        conditionNotes: '',
        serviceType: 'Wash',
        cost: 0,
        dateReturned: new Date().toISOString().split('T')[0]
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<ServiceOrder>>({});

    useEffect(() => {
        if (id) {
            loadOrder(id);
        } else {
            setIsLoading(false);
        }
    }, [id]);

    const loadOrder = async (orderId: string) => {
        setIsLoading(true);
        const data = await getServiceOrderById(orderId);
        setOrder(data);
        setIsLoading(false);
    };

    const handleMarkReturned = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRug || !order) return;

        try {
            const updatedOrder = await markRugAsReturned(order.id, selectedRug.sku, returnData);
            setOrder(updatedOrder);
            setSelectedRug(null);
            setReturnData({
                receivedBy: '',
                conditionNotes: '',
                serviceType: 'Wash',
                cost: 0,
                dateReturned: new Date().toISOString().split('T')[0]
            });
        } catch (error) {
            console.error('Error marking rug as returned:', error);
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

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
    if (!order) return <div style={{ padding: '3rem', textAlign: 'center' }}>Order not found</div>;

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
                            onClick={handlePrint}
                            className="no-print"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                            <Printer size={16} /> Print Receipt
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
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Rugs in Order</h2>
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
                                            border: `1px solid ${rug.returned ? 'var(--border)' : (selectedRug?.sku === rug.sku ? 'var(--primary)' : 'var(--border)')}`,
                                            backgroundColor: rug.returned ? 'var(--bg-void)' : (selectedRug?.sku === rug.sku ? 'var(--primary-light)' : 'var(--bg-card)'),
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            opacity: rug.returned ? 0.7 : 1,
                                            cursor: rug.returned ? 'default' : 'pointer'
                                        }}
                                        onClick={() => !rug.returned && setSelectedRug(rug)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: rug.returned ? '#E8F5E9' : '#FFF3E0', color: rug.returned ? '#4CAF50' : '#FF9800' }}>
                                                {rug.returned ? <CheckCircle size={20} /> : <Tag size={20} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{rug.sku}</div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{rug.description}</div>
                                            </div>
                                        </div>

                                        {rug.returned ? (
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4CAF50' }}>RETURNED</div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{rug.dateReturned ? new Date(rug.dateReturned).toLocaleDateString() : 'N/A'}</div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setSelectedRug(rug)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid var(--primary)',
                                                    backgroundColor: selectedRug?.sku === rug.sku ? 'var(--primary)' : 'transparent',
                                                    color: selectedRug?.sku === rug.sku ? 'white' : 'var(--primary)',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Mark Return
                                            </button>
                                        )}
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

                {/* Return Form (Overlay or Side panel style) */}
                <div style={{ position: 'sticky', top: '2rem' }}>
                    {selectedRug ? (
                        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--primary)', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Mark Rug Returned</h2>
                                    <p style={{ color: 'var(--primary)', fontWeight: 700 }}>{selectedRug.sku}</p>
                                </div>
                                <button onClick={() => setSelectedRug(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleMarkReturned} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Return Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={returnData.dateReturned}
                                        onChange={e => setReturnData({ ...returnData, dateReturned: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Service Type</label>
                                        <select
                                            value={returnData.serviceType}
                                            onChange={e => setReturnData({ ...returnData, serviceType: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                        >
                                            <option value="Wash">Wash</option>
                                            <option value="Repair">Repair</option>
                                            <option value="Wash & Repair">Both</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Cost</label>
                                        <input
                                            type="number"
                                            value={returnData.cost || ''}
                                            onChange={e => setReturnData({ ...returnData, cost: parseFloat(e.target.value) || 0 })}
                                            placeholder="0.00"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Received By</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Staff member name"
                                        value={returnData.receivedBy}
                                        onChange={e => setReturnData({ ...returnData, receivedBy: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Condition Notes</label>
                                    <textarea
                                        value={returnData.conditionNotes}
                                        onChange={e => setReturnData({ ...returnData, conditionNotes: e.target.value })}
                                        placeholder="Add any notes on return condition..."
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
                                    Confirm Return
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '1rem', border: '1px dashed var(--border)', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Tag size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>Select a rug to mark it as returned from service.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="no-print" style={{
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
                        maxWidth: '500px',
                        padding: '2rem',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Edit Service Order</h3>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Driver Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={editData.driverName || ''}
                                        onChange={e => setEditData({ ...editData, driverName: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Pickup Time</label>
                                    <input
                                        type="time"
                                        value={editData.pickupTime || ''}
                                        onChange={e => setEditData({ ...editData, pickupTime: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Pickup Date</label>
                                <input
                                    type="date"
                                    value={editData.pickupDate || ''}
                                    onChange={e => setEditData({ ...editData, pickupDate: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Notes</label>
                                <textarea
                                    value={editData.notes || ''}
                                    onChange={e => setEditData({ ...editData, notes: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-void)', minHeight: '100px', resize: 'vertical' }}
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
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Save size={20} /> Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Hidden Print Section */}
            <div id="print-section" style={{ display: 'none' }}>
                <div style={{ padding: '2cm', fontFamily: 'serif' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '24pt', fontWeight: 'bold' }}>SERVICE ORDER RECEIPT</h1>
                        <p style={{ fontSize: '12pt' }}>{order.orderNumber}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ borderBottom: '1px solid black' }}>Vendor Info</h3>
                            <p><strong>Company:</strong> {order.vendorName}</p>
                        </div>
                        <div>
                            <h3 style={{ borderBottom: '1px solid black' }}>Order Info</h3>
                            <p><strong>Date Sent:</strong> {new Date(order.dateSent).toLocaleDateString()}</p>
                            <p><strong>Driver:</strong> {order.driverName}</p>
                        </div>
                    </div>

                    <h3 style={{ borderBottom: '1px solid black' }}>Rugs History / List</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid black' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem' }}>SKU</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Description</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.rugs.map(rug => (
                                <tr key={rug.sku} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '0.5rem' }}>{rug.sku}</td>
                                    <td style={{ padding: '0.5rem' }}>{rug.description}</td>
                                    <td style={{ padding: '0.5rem' }}>{rug.returned ? 'Returned' : 'Out for Service'}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{rug.cost ? `$${rug.cost.toFixed(2)}` : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '2px solid black', fontWeight: 'bold' }}>
                                <td colSpan={3} style={{ padding: '0.5rem', textAlign: 'right' }}>Total Investment:</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                    ${order.rugs.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    {order.notes && (
                        <div style={{ marginTop: '2rem' }}>
                            <h3 style={{ borderBottom: '1px solid black' }}>Notes</h3>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{order.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    #print-section { display: block !important; }
                    div[role="main"] { display: none !important; }
                    #__next { overflow: visible !important; }
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
