'use client';

import React, { useState, useEffect } from 'react';
import { clockInOut, Employee, checkAutoClockOut } from '@/lib/employee-storage';
import Link from 'next/link';

export default function ClockPage() {
    const [identifier, setIdentifier] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');
    const [lastAction, setLastAction] = useState<{ type: string, name: string } | null>(null);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

    // Geofencing coordinates (Precision Shop Location)
    const SHOP_LAT = 38.808028;
    const SHOP_LNG = -77.087056;
    const MAX_DISTANCE_FT = 700;

    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        // Start Camera
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(stream => {
                    if (videoRef.current) videoRef.current.srcObject = stream;
                })
                .catch(err => console.error('Camera access denied:', err));
        }

        // Handle scannable QR parameter
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
            setIdentifier(id);
        }

        // Auto-cleanup if visiting after hours
        checkAutoClockOut();

        // Continuous Audit (Check every 5 minutes)
        const auditInterval = setInterval(() => {
            checkAutoClockOut();
        }, 5 * 60 * 1000);

        return () => clearInterval(auditInterval);
    }, []);

    // Haversine formula for distance in feet
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 20902231; // Radius of Earth in feet
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleClock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim()) return;

        setStatus('LOADING');
        setMessage('Verifying location and capturing photo...');

        try {
            // 1. Get Location
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
            });

            const distance = calculateDistance(
                position.coords.latitude,
                position.coords.longitude,
                SHOP_LAT,
                SHOP_LNG
            );

            if (distance > MAX_DISTANCE_FT) {
                throw new Error(`Location Restricted: You are too far from the shop (${Math.round(distance)}ft away). Please clock in at the authorized shop location.`);
            }

            // 2. Capture Photo
            let facePhoto = '';
            if (videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                
                // SCALE IMAGE DOWN to prevent Firestore 1MB payload limits
                const MAX_SIZE = 600;
                let width = video.videoWidth;
                let height = video.videoHeight;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d')?.drawImage(video, 0, 0, width, height);
                facePhoto = canvas.toDataURL('image/jpeg', 0.5);
            }

            // 3. Submit
            const { employee, log } = await clockInOut(
                identifier.trim(),
                undefined,
                facePhoto,
                { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }
            );

            setCapturedPhoto(facePhoto);
            setLastAction({ type: log.type, name: employee.name });
            setStatus('SUCCESS');
            setIdentifier('');

            setTimeout(() => {
                setStatus('IDLE');
                setLastAction(null);
                setCapturedPhoto(null);
            }, 5000);

        } catch (error: any) {
            console.error(error);
            setStatus('ERROR');
            setMessage(error.message || 'Identity verification failed. Please check ID/GPS/Camera.');
            setTimeout(() => setStatus('IDLE'), 5000);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '10px', fontFamily: 'system-ui, -apple-system, sans-serif',
            width: '100vw', // Ensure full width
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
                {status === 'SUCCESS' ? (
                    <div className="animate-in fade-in zoom-in duration-500">
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                            <div style={{ position: 'relative' }}>
                                <img src={capturedPhoto || ''} alt="Verified" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #10b981' }} />
                                <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#10b981', color: '#fff', borderRadius: '50%', padding: '4px' }}>✅</div>
                            </div>
                        </div>
                        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 10 }}>
                            {lastAction?.type === 'IN' ? 'Welcome!' : 'Goodbye!'}
                        </h2>
                        <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.5 }}>
                            <strong style={{ color: '#fff' }}>{lastAction?.name}</strong>,<br />
                            Clock {lastAction?.type} verified at shop.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Camera Preview */}
                        <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px', border: '3px solid rgba(255,255,255,0.1)', background: '#000' }}>
                            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>

                        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Identity Verification</h1>
                        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 30 }}>
                            Scan QR / Enter your 4-digit ID number
                        </p>

                        <form onSubmit={handleClock} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={e => setIdentifier(e.target.value)}
                                    placeholder="Enter ID Number (e.g. 1001)"
                                    autoFocus
                                    style={{
                                        width: '100%', padding: '16px 20px', borderRadius: 12,
                                        background: 'rgba(255,255,255,0.05)', border: status === 'ERROR' ? '1px solid #f43f5e' : '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff', fontSize: 16, textAlign: 'center', outline: 'none'
                                    }}
                                />
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
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'LOADING'}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: 12, border: 'none',
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                                    color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer'
                                }}
                            >
                                {status === 'LOADING' ? 'VERIFYING...' : 'VERIFY & CLOCK'}
                            </button>
                        </form>
                    </>
                )}
            </div>

            {/* Admin Bypass Link - Top Right */}
            <div style={{ position: 'absolute', top: 20, right: 20 }}>
                <Link href="/employees" style={{
                    color: 'rgba(255,255,255,0.2)', fontSize: 12, textDecoration: 'none',
                    padding: '8px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    Admin Login
                </Link>
            </div>
        </div>
    );
}
