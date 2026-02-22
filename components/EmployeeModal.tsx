import React, { useState, useEffect } from 'react';
import { Employee, saveEmployee } from '../lib/employee-storage';

interface EmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    initialData?: Employee | null;
}

export default function EmployeeModal({ isOpen, onClose, onSave, initialData }: EmployeeModalProps) {
    const [formData, setFormData] = useState<Partial<Employee>>({
        name: '',
        phone: '',
        email: '',
        empId: '',
        pin: '',
        photo: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                name: '',
                phone: '',
                email: '',
                empId: '',
                pin: '',
                photo: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await saveEmployee(formData);
            onSave();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to save employee');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: 20
        }} onClick={onClose}>
            <div className="modal-content luxury-card" style={{
                width: '100%', maxWidth: 450, background: '#fff', borderRadius: 20,
                padding: 30, position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ marginBottom: 25, textAlign: 'center' }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
                        {initialData ? 'Edit Employee' : 'Register Staff'}
                    </h2>
                    <p style={{ fontSize: 13, color: '#64748b' }}>
                        Fill in the details to manage your team access.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Photo Upload Section */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                        <div style={{ position: 'relative', width: 120, height: 120 }}>
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                                border: '3px solid #e2e8f0', background: '#f8fafc',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {formData.photo ? (
                                    <img src={formData.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: 32 }}>👤</span>
                                )}
                            </div>
                            <label style={{
                                position: 'absolute', bottom: 0, right: 0,
                                background: '#3b82f6', color: '#fff', borderRadius: '50%',
                                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}>
                                <span style={{ fontSize: 16, fontWeight: 'bold' }}>+</span>
                                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Full Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Mohammad Nazif Saify"
                            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Phone *</label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="571-000-0000"
                                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Employee ID</label>
                            <input
                                type="text"
                                value={formData.empId}
                                placeholder="Auto-gen if empty"
                                onChange={e => setFormData({ ...formData, empId: e.target.value })}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="staff@example.com"
                            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Daily Salary ($)</label>
                            <input
                                type="number"
                                value={formData.dailyRate}
                                onChange={e => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) })}
                                placeholder="e.g. 100"
                                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>Security PIN</label>
                            <input
                                type="password"
                                maxLength={4}
                                value={formData.pin}
                                onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                placeholder="4 digits"
                                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0',
                                background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{
                                flex: 2, padding: '14px', borderRadius: 12, border: 'none',
                                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                                color: '#fff', fontWeight: 700, cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)'
                            }}
                        >
                            {isSaving ? 'Saving...' : initialData ? 'Update Staff' : 'Add Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
