import React, { useState } from 'react';

interface Charge {
    id: string;
    description: string;
    amount: number;
}

interface AdditionalChargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (charge: Charge) => void;
}

export default function AdditionalChargeModal({ isOpen, onClose, onSave }: AdditionalChargeModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        if (!description.trim()) {
            alert('Please enter a description');
            return;
        }

        const charge: Charge = {
            id: Math.random().toString(36).substr(2, 9),
            description,
            amount: numAmount
        };

        onSave(charge);
        setAmount('');
        setDescription('');
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
                <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Add Additional Charge</h2>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Description</label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g. Shipping, Rush Fee, Delivery"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                            autoFocus
                        />
                    </div>

                    <div style={{ marginBottom: 20 }}>
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
                            Add Charge
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
