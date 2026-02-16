'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsScript } from '@/lib/google-maps-loader';
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
 * Bulletproof Address Autocomplete
 * 
 * Synchronizes with parent state ONLY when not focused to prevent typing "locks".
 * Uses a native input for best compatibility with the Google Maps library.
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
    const [isLoaded, setIsLoaded] = useState(false);
    const [status, setStatus] = useState<string>('initializing');
    const autocompleteRef = useRef<any>(null);
    const isFocusedRef = useRef(false);

    // Sync from parent to input - ONLY when not focused
    useEffect(() => {
        if (inputRef.current && !isFocusedRef.current && value !== inputRef.current.value) {
            inputRef.current.value = value;
        }
    }, [value]);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            setStatus('error-config');
            return;
        }

        let isMounted = true;
        setStatus('loading-script');

        loadGoogleMapsScript(GOOGLE_MAPS_API_KEY).then(() => {
            if (!isMounted || !inputRef.current) return;

            setIsLoaded(true);
            setStatus('ready');

            if (autocompleteRef.current) return;

            try {
                // @ts-ignore
                const google = window.google;
                if (!google?.maps?.places) {
                    setStatus('error-places');
                    return;
                }

                autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
                    types: ['address'],
                    componentRestrictions: { country: 'us' },
                    fields: ['address_components', 'formatted_address']
                });

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
                console.error('Google Autocomplete initialization error:', err);
                setStatus('error-init');
            }
        }).catch(() => {
            if (isMounted) setStatus('error-load');
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && document.querySelector('.pac-container')) {
                e.preventDefault();
            }
        };

        const onFocus = () => { isFocusedRef.current = true; };
        const onBlur = (e: any) => {
            isFocusedRef.current = false;
            onChange(e.target.value);
        };

        const inputEl = inputRef.current;
        inputEl?.addEventListener('keydown', handleKeyDown);
        inputEl?.addEventListener('focus', onFocus);
        inputEl?.addEventListener('blur', onBlur);

        return () => {
            isMounted = false;
            inputEl?.removeEventListener('keydown', handleKeyDown);
            inputEl?.removeEventListener('focus', onFocus);
            inputEl?.removeEventListener('blur', onBlur);
            if (autocompleteRef.current) {
                try {
                    // @ts-ignore
                    window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
                } catch (e) { }
            }
        };
    }, []);

    const getStatusText = () => {
        switch (status) {
            case 'loading-script': return '⏳ Connecting to Google...';
            case 'error-config': return '❌ Configuration missing (API Key)';
            case 'error-places': return '❌ Google Places API not enabled';
            case 'error-load': return '❌ Failed to connect to Google (Check network)';
            case 'ready': return '';
            default: return '';
        }
    };

    return (
        <div style={{ width: '100%', position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                defaultValue={value}
                placeholder={isLoaded ? placeholder : "Finding address search..."}
                className={`${className} ${styles.addressInput}`}
                required={required}
                autoComplete="off"
                id="google-address-input"
                style={{
                    background: '#ffffff',
                    backgroundImage: 'none',
                    paddingRight: '35px'
                }}
            />
            {status !== 'ready' && status !== '' && (
                <div style={{
                    fontSize: '11px',
                    color: status.startsWith('error') ? '#ef4444' : '#3b82f6',
                    marginTop: '4px',
                    fontWeight: 500
                }}>
                    {getStatusText()}
                </div>
            )}
            {!isLoaded && status === 'loading-script' && (
                <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    fontSize: '14px'
                }}>
                    ⌛
                </div>
            )}
        </div>
    );
}
