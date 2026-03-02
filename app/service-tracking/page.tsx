'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Truck, Search, Filter, Plus, ChevronRight, Calendar, User, Clock, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { getServiceOrders, ServiceOrder, deleteServiceOrder } from '@/lib/service-order-storage';

export default function ServiceTrackingPage() {
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PARTIAL' | 'COMPLETED'>('ALL');
    const [overdueThreshold, setOverdueThreshold] = useState(14); // Days

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setIsLoading(true);
        const data = await getServiceOrders();
        setOrders(data);
        setIsLoading(false);
    };

    const handleDeleteOrder = async (e: React.MouseEvent, id: string, orderNumber: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete Service Order ${orderNumber}?\n\nAny rugs in this order that aren't returned yet will be set back to AVAILABLE.`)) {
            try {
                await deleteServiceOrder(id);
                loadOrders();
            } catch (error) {
                console.error('Error deleting service order:', error);
                alert('Failed to delete service order');
            }
        }
    };

    const getDaysOut = (dateSent: string) => {
        const sent = new Date(dateSent);
        const now = new Date();
        const diffTime = now.getTime() - sent.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.rugs.some(r => r.sku.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Service Tracking</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Monitor rugs currently out for washing or repair.</p>
                </div>
                <Link
                    href="/service-tracking/new"
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
                        textDecoration: 'none',
                        transition: 'opacity 0.2s'
                    }}
                >
                    <Plus size={20} />
                    New Service Order
                </Link>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                    <input
                        type="text"
                        placeholder="Search by Order #, Vendor or SKU..."
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
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        minWidth: '150px'
                    }}
                >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PARTIAL">Partial Return</option>
                    <option value="COMPLETED">Completed</option>
                </select>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Loading tracking data...</div>
            ) : filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No service orders found matching filters.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredOrders.map(order => {
                        const daysOut = getDaysOut(order.dateSent);
                        const isOverdue = daysOut > overdueThreshold && order.status !== 'COMPLETED';
                        const returnCount = order.rugs.filter(r => r.returned).length;

                        return (
                            <Link
                                key={order.id}
                                href={`/service-tracking/view?id=${order.id}`}
                                style={{
                                    backgroundColor: 'var(--bg-card)',
                                    borderRadius: '1rem',
                                    padding: '1.5rem',
                                    border: `1px solid ${isOverdue ? '#ff4444' : 'var(--border)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    transition: 'transform 0.1s, border-color 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em' }}>{order.orderNumber}</span>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{order.vendorName}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            <Calendar size={14} />
                                            <span>Sent: {new Date(order.dateSent).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Rugs</div>
                                        <div style={{ fontWeight: 600 }}>{returnCount} / {order.rugs.length} Returned</div>
                                        <div style={{ width: '100px', height: '6px', backgroundColor: 'var(--bg-void)', borderRadius: '3px', marginTop: '0.5rem', position: 'relative' }}>
                                            <div style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                height: '100%',
                                                borderRadius: '3px',
                                                backgroundColor: order.status === 'COMPLETED' ? '#4CAF50' : 'var(--primary)',
                                                width: `${(returnCount / order.rugs.length) * 100}%`
                                            }} />
                                        </div>
                                    </div>

                                    <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {order.status === 'COMPLETED' ? (
                                                <CheckCircle2 size={18} color="#4CAF50" />
                                            ) : isOverdue ? (
                                                <AlertTriangle size={18} color="#ff4444" />
                                            ) : (
                                                <Clock size={18} color="var(--primary)" />
                                            )}
                                            <span style={{
                                                fontWeight: 700,
                                                color: order.status === 'COMPLETED' ? '#4CAF50' : (isOverdue ? '#ff4444' : 'var(--primary)')
                                            }}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: isOverdue ? '#ff4444' : 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            {daysOut} days out
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <button
                                        onClick={(e) => handleDeleteOrder(e, order.id, order.orderNumber)}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '0.5rem',
                                            border: 'none',
                                            background: 'rgba(255, 68, 68, 0.1)',
                                            color: '#ff4444',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'background 0.2s'
                                        }}
                                        title="Delete Order"
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)'}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    <ChevronRight size={24} color="var(--text-muted)" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
