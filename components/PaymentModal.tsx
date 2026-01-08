import React, { useState } from 'react';
import { Payment } from '@/lib/calculations';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payment: Payment) => void;
    totalDue: number; // To suggest amount?
    balanceDue: number;
}

export default function PaymentModal({ isOpen, onClose, onSave, totalDue, balanceDue }: PaymentModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState<Payment['method']>('Check');
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const payment: Payment = {
            id: Math.random().toString(36).substr(2, 9),
            date,
            amount: numAmount,
            method,
            reference,
            note
        };

        onSave(payment);
        // Reset form? Or just close happens parent side?
        // Let's reset for next time if component stays mounted
        setAmount('');
        setReference('');
        setNote('');
        setMethod('Check');
        setDate(new Date().toISOString().split('T')[0]);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', zIndex: 1100,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{
                background: 'white', padding: 24, borderRadius: 12,
                width: '100%', maxWidth: 450,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Record Payment</h2>

                <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span style={{ color: '#64748b' }}>Balance Due:</span>
                        <span style={{ fontWeight: 'bold' }}>${balanceDue.toFixed(2)}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Amount ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                            placeholder="0.00"
                        />
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Date</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Payment Method</label>
                        <select
                            value={method}
                            onChange={e => setMethod(e.target.value as any)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        >
                            <option value="Check">Check</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="Trade">Trade</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                            {method === 'Check' ? 'Check Number' : 'Reference / Transaction ID'}
                        </label>
                        <input
                            type="text"
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                            placeholder={method === 'Check' ? 'e.g. 1045' : 'Optional'}
                        />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Note</label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', minHeight: 60 }}
                            placeholder="Optional notes..."
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1',
                                background: 'white', color: '#475569', fontWeight: 500, cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '8px 16px', borderRadius: 6, border: 'none',
                                background: '#0f172a', color: 'white', fontWeight: 500, cursor: 'pointer'
                            }}
                        >
                            Save Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
