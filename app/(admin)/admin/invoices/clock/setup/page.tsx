'use client';

import React, { useState, useEffect } from 'react';
import { getEmployees, saveEmployee, Employee } from '@/lib/employee-storage';
import { registerBiometric } from '@/lib/webauthn-utils';
import Link from 'next/link';

export default function ClockSetupPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmpId, setSelectedEmpId] = useState<string>('');
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                // Fetch employees (force from DB)
                const data = await getEmployees();
                setEmployees(data);
            } catch (err) {
                console.error("Failed to load employees:", err);
            }
        };
        load();
    }, []);

    const handleRegister = async () => {
        if (!selectedEmpId) return;

        const employee = employees.find(e => e.id === selectedEmpId);
        if (!employee) return;

        setStatus('LOADING');
        setMessage('Follow the browser prompts to register your Face ID, Touch ID, or PIN...');

        try {
            const credentialId = await registerBiometric(employee.id!, employee.name);
            
            // Save to Firebase
            const updatedEmp = { ...employee, passkeyId: credentialId };
            await saveEmployee(updatedEmp);
            
            setStatus('SUCCESS');
            setMessage('Biometric device registered successfully!');
        } catch (error: any) {
            console.error('Biometric Setup Error:', error);
            setStatus('ERROR');
            setMessage(error.message || 'Registration failed or was cancelled.');
            setTimeout(() => setStatus('IDLE'), 5000);
        }
    };

    const selectedEmp = employees.find(e => e.id === selectedEmpId);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif',
            width: '100vw',
            overflowX: 'hidden'
        }}>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />

            <div className="luxury-card" style={{
                width: '100%', maxWidth: '400px', background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(16px)', borderRadius: '24px', padding: '30px 20px',
                border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center',
                boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)',
                margin: 'auto'
            }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>
                    👤
                </div>

                <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Employee Setup</h1>
                <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 30 }}>
                    Register your personal device (Phone/Tablet) for quick Face & Fingerprint clock-ins.
                </p>

                {status === 'SUCCESS' ? (
                    <div className="animate-in fade-in zoom-in duration-500">
                        <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
                        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 10 }}>Device Registered!</h2>
                        <p style={{ fontSize: 16, color: '#94a3b8', marginBottom: 30, lineHeight: 1.5 }}>
                            Your device is now securely linked to your employee profile.
                        </p>
                        <Link href="/admin/invoices/clock" style={{
                            display: 'block', width: '100%', padding: '16px', borderRadius: 12, textDecoration: 'none',
                            background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                            color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer'
                        }}>
                            GO TO CLOCK IN
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ textAlign: 'left' }}>
                            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
                                1. Select Your Name
                            </label>
                            <select
                                value={selectedEmpId}
                                onChange={(e) => setSelectedEmpId(e.target.value)}
                                style={{
                                    width: '100%', padding: '16px 20px', borderRadius: 12,
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: 16, outline: 'none'
                                }}
                            >
                                <option value="" style={{ color: '#000' }}>-- Choose Employee --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id} style={{ color: '#000' }}>
                                        {emp.name} (ID: {emp.empId})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedEmp && (
                            <div style={{ textAlign: 'left', marginTop: 10 }}>
                                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
                                    2. Register This Device
                                </label>
                                <button
                                    type="button"
                                    onClick={handleRegister}
                                    disabled={status === 'LOADING'}
                                    style={{
                                        width: '100%', padding: '16px', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.5)',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        color: '#10b981', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                    }}
                                >
                                    {status === 'LOADING' ? 'WAITING FOR SCAN...' : 'SCAN FACE / FINGERPRINT'}
                                </button>
                            </div>
                        )}

                        {status === 'ERROR' && (
                            <div style={{ color: '#f43f5e', fontSize: 12, marginTop: 10, fontWeight: 500 }}>
                                {message}
                            </div>
                        )}
                        {status === 'LOADING' && (
                            <div style={{ color: '#3b82f6', fontSize: 12, marginTop: 10 }}>
                                ⌛ {message}
                            </div>
                        )}

                        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <Link href="/admin/invoices/clock" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>
                                ← Back to Clock In
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
