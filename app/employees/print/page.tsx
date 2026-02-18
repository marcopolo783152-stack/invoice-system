'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getEmployees, Employee } from '@/lib/employee-storage';
import { Loader2 } from 'lucide-react';
import { generatePDFBlobUrl } from '@/lib/pdf-utils';

function EmployeePrintContent() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type'); // 'badge' or 'poster'
    const id = searchParams.get('id'); // employee empId if badge

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [qrUrl, setQrUrl] = useState('');
    const [imageLoaded, setImageLoaded] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

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
        if (!isLoading && imageLoaded && (type === 'poster' || employee) && printRef.current) {
            const generateAndOpen = async () => {
                try {
                    // Give a small moment for styles to settle
                    await new Promise(r => setTimeout(r, 800));
                    const blobUrl = await generatePDFBlobUrl(printRef.current!, id || 'QR');
                    window.location.replace(blobUrl);
                } catch (e) {
                    console.error('PDF generation error, fallback to print:', e);
                    window.print();
                }
            };
            generateAndOpen();
        }
    }, [isLoading, imageLoaded, employee, type, id]);

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="#6366f1" />
                <span style={{ marginLeft: 10, fontFamily: 'sans-serif', color: '#64748b' }}>Generating PDF...</span>
            </div>
        );
    }

    return (
        <div ref={printRef} style={{ background: 'white', minHeight: '100vh' }}>
            {type === 'poster' && (
                <div className="pdf-page" style={{
                    width: '8.5in', height: '11in', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'white', margin: '0 auto'
                }}>
                    <div style={{
                        width: '8.5in', height: '11in', border: '15px double #1e293b',
                        padding: 60, textAlign: 'center', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: '#fff', boxSizing: 'border-box'
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
            )}

            {type === 'badge' && employee && (
                <div className="pdf-page" style={{
                    width: '8.5in', height: '11in', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'white', margin: '0 auto'
                }}>
                    <div style={{
                        width: '3.5in', height: '2in', border: '1px solid #c5a059',
                        borderRadius: 12, overflow: 'hidden', background: '#fff',
                        boxSizing: 'border-box', display: 'flex', position: 'relative',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}>
                        {/* Luxury Sidebar Accent */}
                        <div style={{
                            width: 15, background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                            height: '100%', flexShrink: 0
                        }}></div>

                        {/* Professional ID Content */}
                        <div style={{ flex: 1, padding: 15, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            {/* Logo Watermark */}
                            <div style={{
                                position: 'absolute', right: -20, bottom: -20, opacity: 0.03,
                                fontSize: 100, fontWeight: 900, pointerEvents: 'none', transform: 'rotate(-15deg)'
                            }}>
                                MP
                            </div>

                            {/* Top Header Section */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <div style={{
                                        width: 50, height: 50, borderRadius: 10, background: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                        border: '1.5px solid #e2e8f0', padding: 2
                                    }}>
                                        {employee.photo ? (
                                            <img src={employee.photo} alt={employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                                        ) : (
                                            <span style={{ fontSize: 22 }}>👤</span>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', letterSpacing: 0.5 }}>MARCO POLO</div>
                                        <div style={{ fontSize: 7, fontWeight: 700, color: '#c5a059', textTransform: 'uppercase', letterSpacing: 2 }}>Oriental Rugs</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 6, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Security ID</div>
                                    <div style={{ fontSize: 10, fontWeight: 900, color: '#1e293b' }}>#{employee.empId}</div>
                                </div>
                            </div>

                            {/* Staff Branding Section */}
                            <div style={{ marginTop: 'auto' }}>
                                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 2px 0' }}>{employee.name}</h2>
                                <div style={{
                                    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                                    background: '#1e293b', color: '#fff', fontSize: 8,
                                    fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1
                                }}>
                                    Authorized Personnel
                                </div>
                            </div>

                            {/* Corporate Footer Section */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                                marginTop: 12, borderTop: '0.5px solid #f1f5f9', paddingTop: 6
                            }}>
                                <div style={{ fontSize: 6, color: '#94a3b8', fontWeight: 600 }}>
                                    (703) 461-0207 • Alexandria, VA
                                </div>
                                <div style={{ fontSize: 5, color: '#cbd5e1', fontStyle: 'italic' }}>
                                    Verified Member Since {new Date(employee.joinedDate).getFullYear()}
                                </div>
                            </div>
                        </div>

                        {/* Secure QR Side Section */}
                        <div style={{
                            width: 90, background: '#f8fafc', borderLeft: '1px solid #f1f5f9',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: 10
                        }}>
                            <div style={{
                                background: '#fff', padding: 5, borderRadius: 8,
                                border: '1px solid #e2e8f0', boxShadow: '0 5px 15px rgba(0,0,0,0.05)'
                            }}>
                                <img
                                    src={qrUrl}
                                    alt="QR Code"
                                    style={{ width: 65, height: 65 }}
                                    onLoad={() => setImageLoaded(true)}
                                />
                            </div>
                            <div style={{
                                marginTop: 8, fontSize: 6, fontWeight: 900, color: '#1e293b',
                                textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center'
                            }}>
                                Scan to Access<br />Time Clock
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!isLoading && !employee && type !== 'poster' && (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <h2>Print Error</h2>
                    <p>Invalid print request or data not found.</p>
                </div>
            )}
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
