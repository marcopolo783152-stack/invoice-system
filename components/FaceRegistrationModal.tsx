'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (descriptor: number[]) => void;
    employeeName: string;
}

export default function FaceRegistrationModal({ isOpen, onClose, onSuccess, employeeName }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState<string>('Initializing AI...');
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // 1. Load Models
    useEffect(() => {
        if (!isOpen) return;

        const loadModels = async () => {
            try {
                setStatus('Loading AI models (this might take a few seconds)...');
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                setIsModelsLoaded(true);
                setStatus('AI Ready. Requesting camera...');
            } catch (error) {
                console.error("Failed to load models:", error);
                setStatus('Failed to load AI models. Make sure they exist in /models.');
            }
        };

        loadModels();
    }, [isOpen]);

    // 2. Start Camera
    useEffect(() => {
        if (!isOpen || !isModelsLoaded) return;

        const startCamera = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }
                setStatus('Please look directly at the camera.');
            } catch (error) {
                console.error("Camera error:", error);
                setStatus('Failed to access camera. Please allow camera permissions.');
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, isModelsLoaded]);

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current || !isModelsLoaded) return;

        setStatus('Analyzing face...');
        
        try {
            // Detect single face and compute descriptor
            const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                                           .withFaceLandmarks()
                                           .withFaceDescriptor();

            if (!detection) {
                setStatus('No face detected. Please ensure your face is clearly visible and try again.');
                return;
            }

            // Convert Float32Array to standard number array for Firebase storage
            const descriptorArray = Array.from(detection.descriptor);
            
            setStatus('Face successfully registered!');
            stopCamera();
            setTimeout(() => {
                onSuccess(descriptorArray);
                onClose();
            }, 1000);

        } catch (error) {
            console.error("Capture error:", error);
            setStatus('Error analyzing face. Try again.');
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 20
        }}>
            <div style={{
                background: '#fff', borderRadius: 20, padding: 30, maxWidth: 500, width: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
            }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: 24, color: '#1e293b' }}>Face Setup for {employeeName}</h2>
                <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: 14 }}>{status}</p>

                <div style={{
                    width: 300, height: 300, borderRadius: '50%', overflow: 'hidden',
                    background: '#e2e8f0', marginBottom: 20, position: 'relative',
                    border: '4px solid #10b981'
                }}>
                    <video 
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 15, width: '100%' }}>
                    <button
                        onClick={() => { stopCamera(); onClose(); }}
                        style={{
                            flex: 1, padding: 15, borderRadius: 12, border: '1px solid #e2e8f0',
                            background: '#f8fafc', color: '#64748b', fontSize: 16, fontWeight: 600, cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCapture}
                        disabled={!isModelsLoaded}
                        style={{
                            flex: 2, padding: 15, borderRadius: 12, border: 'none',
                            background: isModelsLoaded ? '#10b981' : '#94a3b8', color: '#fff', 
                            fontSize: 16, fontWeight: 600, cursor: isModelsLoaded ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Capture Face
                    </button>
                </div>
            </div>
        </div>
    );
}
