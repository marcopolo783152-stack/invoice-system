import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    useEffect(() => {
        // Config
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        const scanner = new Html5QrcodeScanner(
            "reader",
            config,
      /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                // Success
                console.log("Scanned:", decodedText);
                scanner.clear().then(() => {
                    onScan(decodedText);
                }).catch(err => console.error("Failed to clear scanner", err));
            },
            (errorMessage) => {
                // Error (ignore scan failures)
            }
        );

        return () => {
            // Cleanup
            // html5-qrcode can be tricky with cleanup reacting to strict mode
            // We wrap in try-catch
            try {
                scanner.clear().catch(() => { });
            } catch (e) {
                // ignore
            }
        };
    }, []); // Empty dependency array to run once

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '500px', position: 'relative' }}>
                <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#1a1f3c' }}>Scan Rug SKU</h3>
                <div id="reader" style={{ borderRadius: '8px', overflow: 'hidden' }}></div>
                <button
                    onClick={onClose}
                    style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default BarcodeScanner;
