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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const [status, setStatus] = useState<string>('Initializing AI...');
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isReadyToCapture, setIsReadyToCapture] = useState(false);
    const [detectedDescriptor, setDetectedDescriptor] = useState<number[] | null>(null);
    
    // Interval ref for continuous scanning
    const scanInterval = useRef<any>(null);
    const cameraStream=useRef<MediaStream|null>(null),processing=useRef(false),samples=useRef(0);
    const generation=useRef(0);

    // 1. Load Models
    useEffect(() => {
        if (!isOpen) return;
        setIsReadyToCapture(false);setDetectedDescriptor(null);samples.current=0;

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
        
        return () => stopCamera();
    }, [isOpen]);

    // 2. Start Camera
    useEffect(() => {
        if (!isOpen || !isModelsLoaded) return;

        const cameraGeneration=generation.current;
        const startCamera = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if(cameraGeneration!==generation.current){s.getTracks().forEach(t=>t.stop());return;}
                cameraStream.current=s;
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
    }, [isOpen, isModelsLoaded]);

    const handleVideoPlay = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        // Match canvas to video dimensions
        const displaySize = { 
            width: videoRef.current.videoWidth, 
            height: videoRef.current.videoHeight 
        };
        faceapi.matchDimensions(canvasRef.current, displaySize);

        if(scanInterval.current)clearInterval(scanInterval.current);
        const scanGeneration=generation.current;
        scanInterval.current = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current || processing.current) return;
            processing.current=true;
            
            try {
                const faces = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.75 }))
                                               .withFaceLandmarks()
                                               .withFaceDescriptors();

                if(generation.current!==scanGeneration)return;
                const detection=faces.length===1?faces[0]:null;
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                if (detection) {
                    const resizedDetection = faceapi.resizeResults(detection, displaySize);
                    faceapi.draw.drawDetections(canvasRef.current, resizedDetection);
                    
                    const box = resizedDetection.detection.box;
                    const faceArea = box.width * box.height;
                    const screenArea = displaySize.width * displaySize.height;
                    const ratio = faceArea / screenArea;

                    if (ratio < 0.08) {
                        setStatus('Move closer to the camera');
                        setIsReadyToCapture(false);samples.current=0;setDetectedDescriptor(null);
                    } else if (detection.detection.score < 0.85) {
                        setStatus('Hold still. Finding clear image...');
                        setIsReadyToCapture(false);samples.current=0;setDetectedDescriptor(null);
                    } else {
                        samples.current++;
                        setStatus(samples.current>=4?'Clear face confirmed. Check the employee name, then capture.':'Hold still for a clear registration…');
                        setIsReadyToCapture(samples.current>=4);
                        setDetectedDescriptor(Array.from(detection.descriptor));
                    }
                } else {
                    setStatus('No face detected. Look directly at the camera.');
                    setIsReadyToCapture(false);samples.current=0;setDetectedDescriptor(null);
                }
            } catch (err) {
                console.error(err);setIsReadyToCapture(false);samples.current=0;setDetectedDescriptor(null);
            }finally{processing.current=false;}
        }, 300); // scan ~3 times a second
    };

    const stopCamera = () => {
        generation.current++;samples.current=0;
        cameraStream.current?.getTracks().forEach(t=>t.stop());cameraStream.current=null;
        if (scanInterval.current) clearInterval(scanInterval.current);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (!detectedDescriptor || !isReadyToCapture) return;
        
        setStatus('Face successfully registered!');
        stopCamera();
        setTimeout(() => {
            onSuccess(detectedDescriptor);
            onClose();
        }, 1000);
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
                <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: 14, fontWeight: 700, minHeight: 20 }}>{status}</p>

                <div style={{
                    width: 320, height: 320, borderRadius: 16, overflow: 'hidden',
                    background: '#e2e8f0', marginBottom: 20, position: 'relative',
                    border: isReadyToCapture ? '4px solid #10b981' : '4px solid #94a3b8'
                }}>
                    <video 
                        ref={videoRef}
                        onPlay={handleVideoPlay}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                    />
                    <canvas 
                        ref={canvasRef} 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} 
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
                        disabled={!isReadyToCapture}
                        style={{
                            flex: 2, padding: 15, borderRadius: 12, border: 'none',
                            background: isReadyToCapture ? '#10b981' : '#94a3b8', color: '#fff', 
                            fontSize: 16, fontWeight: 600, cursor: isReadyToCapture ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Capture Face
                    </button>
                </div>
            </div>
        </div>
    );
}
