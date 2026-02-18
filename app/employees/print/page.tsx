'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getEmployees, Employee } from '@/lib/employee-storage';
import { Loader2 } from 'lucide-react';

function EmployeePrintContent() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type'); // 'badge' or 'poster'
    const id = searchParams.get('id'); // employee empId if badge

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [qrUrl, setQrUrl] = useState('');
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        const load = async () => {
            const baseUrl = window.location.origin;
            if (type === 'poster') {
                const clockUrl = `${baseUrl}/clock`;
                setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(clockUrl)}`);
                setIsLoading(false);
            } else if (type === 'badge' && id) {
                const emps = await getEmployees();
                const emp = emps.find(e => e.empId === id);
                if (emp) {
                    setEmployee(emp);
                    const clockUrl = `${baseUrl}/clock?id=${emp.empId}`;
                    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(clockUrl)}`);
                }
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        };
        load();
    }, [type, id]);

    useEffect(() => {
        if (!isLoading && imageLoaded && (type === 'poster' || employee)) {
            // Extra brief delay to ensure layout stabilizer
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading, imageLoaded, employee, type]);

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="#6366f1" />
                <span style={{ marginLeft: 10, fontFamily: 'sans-serif', color: '#64748b' }}>Generating PDF...</span>
            </div>
        );
    }

    if (type === 'poster') {
        return (
            <div style={{
                width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'white', padding: '1in'
            }}>
                <div style={{
                    width: '7.5in', height: '10in', border: '15px double #1e293b',
                    borderRadius: 4, padding: 60, textAlign: 'center', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: '#fff'
                }}>
                    <div style={{ marginBottom: 40 }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#1e293b', letterSpacing: 8, marginBottom: 10 }}>MARCO POLO</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>ORIENTAL RUGS INC.</div>
                    </div>

                    <div style={{ height: 2, width: 100, background: '#e2e8f0', marginBottom: 40 }}></div>

                    <h1 style={{ fontSize: 48, fontWeight: 900, color: '#0f172a', marginBottom: 10, letterSpacing: -1 }}>
                        TIME CLOCK STATION
                    </h1>
                    <p style={{ fontSize: 18, color: '#475569', fontWeight: 700, marginBottom: 50, maxWidth: 400 }}>
                        Employees must clock in and out by scanning this QR code with their mobile device.
                    </p>

                    <div style={{
                        padding: 40, border: '4px solid #f1f5f9', borderRadius: 40,
                        background: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                        marginBottom: 40
                    }}>
                        <img
                            src={qrUrl}
                            alt="QR Code"
                            style={{ width: 400, height: 400 }}
                            onLoad={() => setImageLoaded(true)}
                        />
                    </div>

                    <div style={{ fontSize: 20, fontWeight: 800, color: '#4f46e5', marginBottom: 60 }}>
                        📍 3260 Duke St, Alexandria, VA
                    </div>

                    <div style={{ color: '#94a3b8', fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 20, width: '100%' }}>
                        PLEASE ENABLE CAMERA AND GPS ACCESS WHEN PROMPTED
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'badge' && employee) {
        return (
            <div style={{
                width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'white'
            }}>
                <div style={{
                    width: '3.5in', height: '5in', border: '2px solid #1e293b',
                    borderRadius: 20, padding: 30, textAlign: 'center', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#1e293b', marginBottom: 4 }}>MARCO POLO</div>
                        <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 2 }}>EMPLOYEE ID</div>
                    </div>

                    <div style={{
                        width: 120, height: 120, borderRadius: '50%', background: '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50,
                        margin: '20px 0', border: '4px solid #f1f5f9'
                    }}>
                        👤
                    </div>

                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>{employee.name}</h2>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>ID: {employee.empId}</div>
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <img
                            src={qrUrl}
                            alt="QR Code"
                            style={{ width: 160, height: 160 }}
                            onLoad={() => setImageLoaded(true)}
                        />
                        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 8 }}>SCAN TO CLOCK IN / OUT</div>
                    </div>

                    <div style={{ fontSize: 8, color: '#cbd5e1', marginTop: 10 }}>
                        AUTHORIZED ACCESS ONLY • (703) 461-0207
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: 40, textAlign: 'center' }}>
            <h2>Print Error</h2>
            <p>Invalid print request or data not found.</p>
        </div>
    );
}

export default function EmployeePrintPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EmployeePrintContent />
        </Suspense>
    );
}
