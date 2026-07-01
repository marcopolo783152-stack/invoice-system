'use client';

import React, { useState, useEffect, useRef } from 'react';
import { clockInOut, Employee, checkAutoClockOut, getTimeLogs, getEmployees } from '@/lib/employee-storage';
import Link from 'next/link';
import * as faceapi from 'face-api.js';

export default function ClockPage() {
    const [identifier, setIdentifier] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR' | 'SCANNING'>('IDLE');
    const [message, setMessage] = useState('');
    const [lastAction, setLastAction] = useState<{ type: string, name: string } | null>(null);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);

    // Geofencing coordinates (Precision Shop Location)
    const SHOP_LAT = 38.808028;
    const SHOP_LNG = -77.087056;
    const MAX_DISTANCE_FT = 1500;

    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scanInterval = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isClockingInRef = useRef(false);

    const checkPendingSyncs = () => {
        if (typeof window === 'undefined') return;
        const localLogs = JSON.parse(localStorage.getItem('mns_timelogs_local') || '[]');
        const orphans = localLogs.filter((l: any) => l.id && l.id.length < 15);
        setPendingSyncCount(orphans.length);
    };

    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    };

    useEffect(() => {
        // Load face-api models
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                setIsModelsLoaded(true);
            } catch (error) {
                console.error("Failed to load models:", error);
            }
        };
        loadModels();

        // Handle storeId and employee id from URL
        const params = new URLSearchParams(window.location.search);
        const storeId = params.get('storeId');
        const empId = params.get('id');
        
        if (storeId) {
            localStorage.setItem('currentStoreId', storeId);
            console.log('Switching to store:', storeId);
        }

        if (empId) {
            setIdentifier(empId);
        }

        checkAutoClockOut();

        const runSync = async () => {
            setIsSyncing(true);
            try {
                await getTimeLogs(1);
                checkPendingSyncs();
            } catch (e) {
                console.error("Auto-sync failed", e);
            } finally {
                setIsSyncing(false);
            }
        };
        runSync();

        const auditInterval = setInterval(() => {
            checkAutoClockOut();
            runSync();
        }, 2 * 60 * 1000);

        return () => {
            clearInterval(auditInterval);
            stopCamera();
        };
    }, []);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 20902231; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Camera access denied:', err);
            setMessage('Failed to access camera.');
            setStatus('ERROR');
            setTimeout(() => setStatus('IDLE'), 3000);
        }
    };

    const stopCamera = () => {
        if (scanInterval.current) clearInterval(scanInterval.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const handleStartScan = async () => {
        if (!isModelsLoaded) {
            setMessage('AI Models are still loading. Please wait a moment.');
            setStatus('ERROR');
            setTimeout(() => setStatus('IDLE'), 3000);
            return;
        }
        
        isClockingInRef.current = false;
        setStatus('SCANNING');
        setMessage('Looking for face... Please look at the camera.');
        await startCamera();
    };

    const handleVideoPlay = () => {
        if (!videoRef.current || !canvasRef.current || status !== 'SCANNING') return;
        
        const displaySize = { 
            width: videoRef.current.videoWidth, 
            height: videoRef.current.videoHeight 
        };
        faceapi.matchDimensions(canvasRef.current, displaySize);

        scanInterval.current = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current || isClockingInRef.current) return;
            
            try {
                const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                                               .withFaceLandmarks()
                                               .withFaceDescriptor();

                const ctx = canvasRef.current.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                if (detection) {
                    const resizedDetection = faceapi.resizeResults(detection, displaySize);
                    faceapi.draw.drawDetections(canvasRef.current, resizedDetection);
                    
                    const box = resizedDetection.detection.box;
                    const faceArea = box.width * box.height;
                    const screenArea = displaySize.width * displaySize.height;
                    const ratio = faceArea / screenArea;

                    if (ratio < 0.05) {
                        setMessage('Move closer to the camera');
                    } else if (detection.detection.score < 0.7) {
                        setMessage('Hold still...');
                    } else {
                        // High confidence face detected, attempt match
                        const employees = await getEmployees();
                        let bestMatch: Employee | null = null;
                        let lowestDistance = 1.0;

                        for (const emp of employees) {
                            if (emp.faceDescriptor) {
                                const distance = faceapi.euclideanDistance(
                                    detection.descriptor,
                                    new Float32Array(emp.faceDescriptor)
                                );
                                if (distance < lowestDistance) {
                                    lowestDistance = distance;
                                    bestMatch = emp;
                                }
                            }
                        }

                        if (bestMatch && lowestDistance < 0.55) {
                            // MATCH FOUND! Trigger clock in automatically.
                            isClockingInRef.current = true;
                            stopCamera();
                            setMessage(`Match found! Hello, ${bestMatch.name}. Verifying location...`);
                            const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                            await handleClock(fakeEvent, bestMatch.id);
                        } else {
                            setMessage('Face not recognized in the system.');
                        }
                    }
                } else {
                    setMessage('No face detected. Look directly at the camera.');
                }
            } catch (err) {
                console.error(err);
            }
        }, 300); // Scan ~3 times a second
    };

    const handleClock = async (e: React.FormEvent, overrideIdentifier?: string) => {
        e.preventDefault();
        const activeIdentifier = overrideIdentifier || identifier.trim();
        if (!activeIdentifier) return;

        setStatus('LOADING');
        setMessage('Verifying location...');

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
            });

            const distance = calculateDistance(
                position.coords.latitude,
                position.coords.longitude,
                SHOP_LAT,
                SHOP_LNG
            );

            let geoStatus = 'IN_ZONE';
            if (distance > MAX_DISTANCE_FT) {
                geoStatus = `OUT_OF_ZONE (${Math.round(distance)}ft away)`;
                console.warn(`User clocked in out of zone. Distance: ${distance}ft`);
            }

            setMessage('Recording timestamp...');

            const result = await clockInOut({
                identifier: activeIdentifier,
                location: geoStatus,
                photo: null
            });

            setStatus('SUCCESS');
            setIdentifier('');
            setLastAction({ type: result.type, name: result.employeeName });
            
            speak(`${result.employeeName} clocked ${result.type.toLowerCase()} successfully`);

            setTimeout(() => {
                setStatus('IDLE');
                setLastAction(null);
            }, 4000);

        } catch (error: any) {
            console.error(error);
            setStatus('ERROR');
            setMessage(error.message || 'Clock in failed');
            speak("Clock in failed, please try again");
            setTimeout(() => {
                setStatus('IDLE');
            }, 5000);
        }
    };

    if (status === 'SCANNING') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20 }}>
                <h1 style={{ color: '#fff', marginBottom: 20, fontSize: 24, textAlign: 'center' }}>Facial Recognition Scanning</h1>
                <p style={{ color: '#94a3b8', marginBottom: 30, fontSize: 16, textAlign: 'center', minHeight: 24 }}>{message}</p>
                
                <div style={{ position: 'relative', width: 320, height: 320, borderRadius: '50%', overflow: 'hidden', border: '4px solid #3b82f6', marginBottom: 40 }}>
                    <video 
                        ref={videoRef}
                        onPlay={handleVideoPlay}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover',  }}
                    />
                    <canvas 
                        ref={canvasRef} 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',  }} 
                    />
                </div>

                <button
                    onClick={() => {
                        stopCamera();
                        setStatus('IDLE');
                    }}
                    style={{
                        padding: '15px 40px', borderRadius: 30, background: 'rgba(255,255,255,0.1)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)', fontSize: 16, fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    Cancel Scan
                </button>
            </div>
        );
    }

    if (status === 'LOADING') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
                <div className="loader" style={{ width: 50, height: 50, border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <h2 style={{ color: '#fff', marginTop: 20 }}>{message}</h2>
                <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
            </div>
        );
    }

    if (status === 'SUCCESS' && lastAction) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
                <div style={{ background: '#10b981', color: '#fff', padding: 30, borderRadius: '50%', marginBottom: 20 }}>
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h1 style={{ color: '#fff', fontSize: 36, marginBottom: 10 }}>Clocked {lastAction.type}</h1>
                <p style={{ color: '#cbd5e1', fontSize: 24 }}>{lastAction.name}</p>
                <div style={{ color: '#64748b', marginTop: 20, fontSize: 14 }}>Returning to start...</div>
            </div>
        );
    }

    if (status === 'ERROR') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20 }}>
                <div style={{ background: '#ef4444', color: '#fff', padding: 20, borderRadius: '50%', marginBottom: 20 }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <h1 style={{ color: '#fff', fontSize: 28, marginBottom: 10, textAlign: 'center' }}>Error</h1>
                <p style={{ color: '#cbd5e1', fontSize: 18, textAlign: 'center', maxWidth: 400 }}>{message}</p>
                <button 
                    onClick={() => setStatus('IDLE')}
                    style={{ marginTop: 30, padding: '12px 24px', background: 'transparent', border: '1px solid #fff', color: '#fff', borderRadius: 8, cursor: 'pointer' }}
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ background: '#1e293b', padding: '40px', borderRadius: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>

                    <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 5 }}>Kiosk Clock-in</h1>
                    <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 30 }}>Face scan or enter ID</p>

                    <button
                        onClick={handleStartScan}
                        style={{
                            width: '100%', padding: 20, borderRadius: 16, border: 'none',
                            background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 18,
                            fontWeight: 700, cursor: 'pointer', marginBottom: 20, boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                        }}
                    >
                        <span>👤</span> FACE CLOCK
                    </button>

                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 15, margin: '20px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }}></div>
                        <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>OR PIN CODE</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }}></div>
                    </div>

                    <form onSubmit={(e) => handleClock(e)} style={{ width: '100%' }}>
                        <input
                            type="password"
                            placeholder="Enter ID / PIN..."
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            style={{
                                width: '100%', padding: 18, borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)',
                                color: '#fff', fontSize: 24, textAlign: 'center', outline: 'none',
                                marginBottom: 20, letterSpacing: 4
                            }}
                        />
                        
                        <button 
                            type="submit"
                            style={{
                                width: '100%', padding: 18, borderRadius: 12, border: 'none',
                                background: '#3b82f6', color: '#fff', fontSize: 18,
                                fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            CLOCK IN / OUT
                        </button>
                    </form>
                </div>
            </div>

            <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link href="/admin/invoices/employees" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>
                    ← Back to Admin
                </Link>
                <div style={{ color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isSyncing ? (
                        <>
                            <div className="loader" style={{ width: 12, height: 12, border: '2px solid #64748b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            Syncing...
                        </>
                    ) : pendingSyncCount > 0 ? (
                        <span style={{ color: '#fbbf24' }}>● {pendingSyncCount} offline logs</span>
                    ) : (
                        <span style={{ color: '#10b981' }}>● System Online</span>
                    )}
                </div>
            </div>
        </div>
    );
}
