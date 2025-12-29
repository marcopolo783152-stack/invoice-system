'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('INVOICE PAGE CRASHED:', error);
    }, [error]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: 20,
            fontFamily: 'system-ui, sans-serif'
        }}>
            <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: 30,
                borderRadius: 16,
                maxWidth: 500,
                textAlign: 'center',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}>
                <AlertTriangle size={48} style={{ marginBottom: 16 }} />
                <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Something went wrong!</h2>
                <p style={{ marginBottom: 24 }}>{error.message || 'An unexpected error occurred while loading invoices.'}</p>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button
                        onClick={() => reset()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 20px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCw size={18} />
                        Try again
                    </button>

                    <button
                        onClick={() => window.location.href = '/'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 20px',
                            background: 'white',
                            color: '#333',
                            border: '1px solid #ddd',
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Home size={18} />
                        Go Dashboard
                    </button>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <pre style={{ marginTop: 24, padding: 12, background: 'white', borderRadius: 8, textAlign: 'left', overflow: 'auto', fontSize: 12 }}>
                        {error.stack}
                    </pre>
                )}
            </div>
        </div>
    );
}
