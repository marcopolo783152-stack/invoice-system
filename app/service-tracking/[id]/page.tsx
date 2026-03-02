'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Save, Edit, User, FileText, CheckCircle, Truck, Calendar, Tag, Info } from 'lucide-react';
import { getServiceOrderById, markRugAsReturned, ServiceOrder, ServiceOrderRug } from '@/lib/service-order-storage';

export default function ServiceOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
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

    useEffect(() => {
        loadOrder();
    }, [id]);

    const loadOrder = async () => {
        setIsLoading(true);
        const data = await getServiceOrderById(id);
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

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <Calendar size={18} />
                        <span>Date Sent: {order.dateSent ? new Date(order.dateSent).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
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
        </div>
    );
}
