'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getEmployees, getTimeLogs, getEmployeePayments, Employee, TimeLog, EmployeePayment } from '@/lib/employee-storage';
import { Loader2 } from 'lucide-react';
import { generatePDFBlobUrl, generateReportPDFBlobUrl } from '@/lib/pdf-utils';
import { HistoryReportTemplate } from '@/components/HistoryReportTemplate';

function EmployeePrintContent() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type'); // 'badge' or 'poster'
    const range = searchParams.get('range') || 'ALL';
    const id = searchParams.get('id'); // employee id or empId
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [historyLogs, setHistoryLogs] = useState<TimeLog[]>([]);
    const [historyPayments, setHistoryPayments] = useState<EmployeePayment[]>([]);
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
            } else if (type === 'history' && id) {
                const emps = await getEmployees();
                const emp = emps.find(e => e.id === id || e.empId === id);
                if (emp) {
                    setEmployee(emp);
                    const [allLogs, empPayments] = await Promise.all([
                        getTimeLogs(1000),
                        getEmployeePayments(emp.id)
                    ]);

                    let empLogs = allLogs
                        .filter(l => l.employeeId === emp.id || l.employeeName === emp.name)
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                    if (range !== 'ALL') {
                        const now = new Date();
                        const startDate = new Date();
                        if (range === 'WEEK') startDate.setDate(now.getDate() - 7);
                        else if (range === 'MONTH') startDate.setMonth(now.getMonth() - 1);
                        else if (range === 'YEAR') startDate.setFullYear(now.getFullYear() - 1);
                        empLogs = empLogs.filter(l => new Date(l.timestamp) >= startDate);
                    }
                    setHistoryLogs(empLogs);
                    setHistoryPayments(empPayments);
                    setImageLoaded(true); // No specific large image to wait for other than profile which is usually small
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
                    await new Promise(r => setTimeout(r, 1000));
                    let blobUrl = '';
                    if (type === 'history') {
                        blobUrl = await generateReportPDFBlobUrl(printRef.current!, `History_${employee?.name || 'Report'}`);
                    } else {
                        blobUrl = await generatePDFBlobUrl(printRef.current!, id || 'QR');
                    }
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
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Loader2 className="animate-spin" size={32} color="#6366f1" />
                    <span style={{ marginLeft: 10, fontFamily: 'sans-serif', color: '#64748b' }}>Generating High-Quality PDF...</span>
                </div>
                {/* Fallback Manual Download */}
                <button
                    onClick={() => {
                        if (printRef.current) {
                            generatePDFBlobUrl(printRef.current, id || 'print').then(url => {
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Employee_Print_${id || 'Poster'}.pdf`;
                                a.click();
                            });
                        }
                    }}
                    style={{
                        padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0',
                        background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600
                    }}
                >
                    Download Manually
                </button>
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
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#1e293b', letterSpacing: 8, marginBottom: 10 }}>ARIANA</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>ORIENTAL RUGS INC</div>
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
                                AOR
                            </div>

                            {/* Top Header Section */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', letterSpacing: 0.5 }}>ARIANA</div>
                                    <div style={{ fontSize: 7, fontWeight: 700, color: '#c5a059', textTransform: 'uppercase', letterSpacing: 2 }}>Oriental Rugs</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 6, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Security ID</div>
                                    <div style={{ fontSize: 10, fontWeight: 900, color: '#1e293b' }}>#{employee.empId}</div>
                                </div>
                            </div>

                            {/* Photo & Main Info */}
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{
                                    width: 100, height: 110, borderRadius: 8, background: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                    border: '1.5px solid #e2e8f0', flexShrink: 0
                                }}>
                                    {employee.photo ? (
                                        <img src={employee.photo} alt={employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: 30 }}>👤</span>
                                    )}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', lineHeight: 1.1 }}>
                                        {employee.name}
                                    </h2>
                                    <div style={{
                                        display: 'inline-block', padding: '3px 10px', borderRadius: 4,
                                        background: '#1e293b', color: '#fff', fontSize: 9,
                                        fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1,
                                        marginBottom: 8
                                    }}>
                                        Authorized Personnel
                                    </div>
                                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>
                                        Joined: {new Date(employee.joinedDate).getFullYear()}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{
                                marginTop: 'auto', borderTop: '0.5px solid #f1f5f9', paddingTop: 8,
                                fontSize: 6, color: '#94a3b8', fontWeight: 600
                            }}>
                                +1 (703) 801 1640 • Alexandria, VA
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

            {type === 'history' && employee && (
                <HistoryReportTemplate
                    ref={printRef}
                    employee={employee}
                    logs={historyLogs}
                    payments={historyPayments}
                    range={range as any}
                />
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
