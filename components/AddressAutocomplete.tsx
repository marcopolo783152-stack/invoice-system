'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './InvoiceForm.module.css';

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onAddressSelect: (address: {
        street: string;
        city: string;
        state: string;
        zip: string;
    }) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/**
 * MODERN DYNAMIC ADDRESS AUTOCOMPLETE
 * 
 * Uses the latest google.maps.importLibrary pattern for better reliability.
 */
export default function AddressAutocomplete({
    value,
    onChange,
    onAddressSelect,
    placeholder = "Enter street address",
    className = "",
    required = false
}: AddressAutocompleteProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const [status, setStatus] = useState<string>('idle');
    const [error, setError] = useState<string | null>(null);

    // Sync initial value from parent on mount
    useEffect(() => {
        if (inputRef.current && value && !inputRef.current.value) {
            inputRef.current.value = value;
        }
    }, [value]);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            setError('API Key is missing in Environment Variables');
            return;
        }

        let isMounted = true;
        setStatus('loading');

        // Modern Dynamic Loader
        const loadAutocomplete = async () => {
            try {
                // @ts-ignore
                if (!window.google) {
                    const script = document.createElement('script');
                    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`;
                    script.async = true;
                    script.defer = true;

                    const scriptPromise = new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = () => reject(new Error('Script load failed'));
                    });

                    document.head.appendChild(script);
                    await scriptPromise;
                }

                if (!isMounted) return;

                // @ts-ignore
                const { Autocomplete } = await google.maps.importLibrary("places") as any;

                if (!inputRef.current) return;

                autocompleteRef.current = new Autocomplete(inputRef.current, {
                    fields: ['address_components', 'formatted_address'],
                    // No country restriction for maximum flexibility
                });

                console.log('✅ Google Autocomplete Initialized Successfully (Modern)');
                setStatus('ready');

                autocompleteRef.current.addListener('place_changed', () => {
                    const place = autocompleteRef.current?.getPlace();
                    if (place && place.address_components) {
                        const components = place.address_components;

                        let streetNumber = '';
                        let route = '';
                        let city = '';
                        let state = '';
                        let zip = '';

                        for (const component of components) {
                            const types = component.types;
                            if (types.includes('street_number')) streetNumber = component.long_name;
                            if (types.includes('route')) route = component.long_name;
                            if (types.includes('locality')) city = component.long_name;
                            if (types.includes('administrative_area_level_1')) state = component.short_name;
                            if (types.includes('postal_code')) zip = component.long_name;
                        }

                        const street = `${streetNumber} ${route}`.trim();
                        const finalAddress = street || place.formatted_address || '';

                        if (inputRef.current) {
                            inputRef.current.value = finalAddress;
                        }

                        onAddressSelect({
                            street: finalAddress,
                            city,
                            state,
                            zip
                        });

                        onChange(finalAddress);
                    }
                });
            } catch (err: any) {
                console.error('Autocomplete Error:', err);
                setError(`Google Error: ${err.message || 'Check Console'}`);
                setStatus('error');
            }
        };

        loadAutocomplete();

        return () => { isMounted = false; };
    }, []);

    const handleBlur = () => {
        if (inputRef.current) {
            onChange(inputRef.current.value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (document.querySelector('.pac-container')) {
                e.preventDefault();
            }
            if (inputRef.current) {
                onChange(inputRef.current.value);
            }
        }
    };

    // Helper to manually trigger focus if it feels "locked" (even though it shouldn't be now)
    const handleClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div style={{ width: '100%', position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                defaultValue={value}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onClick={handleClick}
                placeholder={status === 'ready' ? placeholder : "Initializing Google Maps..."}
                className={className}
                required={required}
                autoComplete="off"
                id="google-address-input"
                style={{
                    backgroundImage: 'none !important',
                    background: '#ffffff',
                    width: '100%',
                    borderColor: error ? '#ef4444' : undefined
                }}
            />

            {/* Status Indicators */}
            <div style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                pointerEvents: 'none'
            }}>
                {status === 'loading' && <span style={{ animation: 'spin 1s linear infinite' }}>⌛</span>}
                {status === 'ready' && <span style={{ color: '#10b981', fontSize: '12px' }}>●</span>}
                {status === 'error' && <span style={{ color: '#ef4444', fontSize: '12px' }}>✖</span>}
            </div>

            {error && (
                <div style={{
                    color: '#ef4444',
                    fontSize: '11px',
                    marginTop: '4px',
                    fontWeight: 500,
                    padding: '2px 4px',
                    background: '#fef2f2',
                    borderRadius: '4px',
                    border: '1px solid #fee2e2'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {status === 'ready' && (
                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                    Powered by Google Cloud
                </div>
            )}
        </div>
    );
}

// Add keyframe for spin if not in globals
if (typeof document !== 'undefined' && !document.getElementById('spin-animation')) {
    const style = document.createElement('style');
    style.id = 'spin-animation';
    style.innerHTML = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}
