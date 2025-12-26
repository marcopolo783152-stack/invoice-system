/**
 * SIGNATURE PAD COMPONENT
 * 
 * Touch-enabled signature capture for customer signatures
 * Works on touch screens, tablets, and mouse
 */

'use client';

import React, { useRef, useState, useEffect } from 'react';
import styles from './SignaturePad.module.css';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
  variant?: 'modal' | 'inline';
  existingSignature?: string;
}

export default function SignaturePad({ onSave, onCancel, existingSignature, variant = 'modal' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on container or default
    const container = canvas.parentElement;
    canvas.width = container ? container.clientWidth : 600;
    canvas.height = 200;

    // Configure drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load existing signature if provided
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setIsEmpty(false);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      // Touch event
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      // Mouse event
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      // Touch event
      e.preventDefault(); // Prevent scrolling while drawing
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      // Mouse event
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isEmpty) {
      alert('Please provide a signature before saving.');
      return;
    }

    // Convert canvas to base64 image
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  const content = (
    <div className={variant === 'modal' ? styles.modal : styles.inlineContainer}>
      <h2>Customer Signature</h2>
      <p className={styles.instructions}>
        Please sign in the box below using your finger (touch screen) or mouse
      </p>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={clearSignature}
          className={styles.clearBtn}
        >
          🗑️ Clear
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelBtn}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={saveSignature}
          className={styles.saveBtn}
        >
          ✓ Save Signature
        </button>
      </div>
    </div>
  );

  if (variant === 'inline') {
    return content;
  }

  return (
    <div className={styles.overlay}>
      {content}
    </div>
  );
}
