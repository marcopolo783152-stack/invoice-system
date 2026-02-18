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
                        width: '3.5in', height: '2in', border: '1px solid #1e293b',
                        borderRadius: 8, padding: 12, textAlign: 'left', display: 'flex',
                        gap: 12, alignItems: 'center', background: '#fff', boxSizing: 'border-box',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        {/* Left Side: Photo & Info */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{
                                    width: 45, height: 45, borderRadius: '50%', background: '#f1f5f9',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    {employee.photo ? (
                                        <img src={employee.photo} alt={employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: 18 }}>👤</span>
                                    )}
                                </div>
                                <div style={{ lineHeight: 1.1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 900, color: '#1e293b' }}>MARCO POLO</div>
                                    <div style={{ fontSize: 8, color: '#64748b', letterSpacing: 1 }}>STAFF ID</div>
                                </div>
                            </div>

                            <div style={{ marginTop: 2 }}>
                                <h2 style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', margin: 0 }}>{employee.name}</h2>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5' }}>ID: {employee.empId}</div>
                            </div>

                            <div style={{
                                fontSize: 6, color: '#cbd5e1', marginTop: 'auto',
                                borderTop: '0.5px solid #f1f5f9', paddingTop: 4
                            }}>
                                Alexandria, VA • (703) 461-0207
                            </div>
                        </div>

                        {/* Right Side: QR */}
                        <div style={{ textAlign: 'center', width: 80 }}>
                            <img
                                src={qrUrl}
                                alt="QR Code"
                                style={{ width: 70, height: 70 }}
                                onLoad={() => setImageLoaded(true)}
                            />
                            <div style={{ fontSize: 7, color: '#94a3b8', marginTop: 4, fontWeight: 700 }}>SCAN TO CLOCK</div>
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
