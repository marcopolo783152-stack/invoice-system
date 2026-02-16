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
    const [debugInfo, setDebugInfo] = useState<string>('');
    const autocompleteRef = useRef<any>(null);
    const isTypingRef = useRef(false);

    // Initial value sync and external updates
    useEffect(() => {
        if (inputRef.current && !isTypingRef.current && value !== inputRef.current.value) {
            inputRef.current.value = value;
        }
    }, [value]);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            setDebugInfo('Error: API Key missing in environment.');
            return;
        }

        let isMounted = true;
        setDebugInfo('Attempting to load Google Maps...');

        loadGoogleMapsScript(GOOGLE_MAPS_API_KEY).then(() => {
            if (!isMounted || !inputRef.current) return;

            setIsLoaded(true);
            setDebugInfo('Google Maps loaded. Initializing search...');

            if (autocompleteRef.current) return;

            try {
                // @ts-ignore
                const google = window.google;
                if (!google?.maps?.places) {
                    setDebugInfo('Error: Places library not found in Google script.');
                    return;
                }

                autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
                    types: ['address'],
                    componentRestrictions: { country: 'us' },
                    fields: ['address_components', 'formatted_address']
                });

                autocompleteRef.current.addListener('place_changed', () => {
                    const place = autocompleteRef.current?.getPlace();
                    if (place?.address_components) {
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

                        isTypingRef.current = false;
                        onAddressSelect({
                            street: finalAddress,
                            city,
                            state,
                            zip
                        });
                        onChange(finalAddress);
                    }
                });

                setDebugInfo('Search ready.');
            } catch (err: any) {
                console.error('Autocomplete Error:', err);
                setDebugInfo(`Error: ${err.message || 'Initialization failed'}`);
            }
        }).catch(err => {
            setDebugInfo('Failed to load Google script.');
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && document.querySelector('.pac-container')) {
                e.preventDefault();
            }
        };

        const handleInput = (e: any) => {
            isTypingRef.current = true;
            onChange(e.target.value);
            // After 2 seconds of no typing, allow external sync again
            const timeout = setTimeout(() => {
                isTypingRef.current = false;
            }, 2000);
            return () => clearTimeout(timeout);
        };

        const onFocus = () => { isTypingRef.current = true; };
        const onBlur = () => { isTypingRef.current = false; };

        const inputEl = inputRef.current;
        inputEl?.addEventListener('keydown', handleKeyDown);
        inputEl?.addEventListener('input', handleInput);
        inputEl?.addEventListener('focus', onFocus);
        inputEl?.addEventListener('blur', onBlur);

        return () => {
            isMounted = false;
            inputEl?.removeEventListener('keydown', handleKeyDown);
            inputEl?.removeEventListener('input', handleInput);
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

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input
                ref={inputRef}
                type="text"
                defaultValue={value}
                placeholder={isLoaded ? placeholder : "Loading address search..."}
                className={`${className} ${styles.addressInput}`}
                required={required}
                autoComplete="off"
                id="google-address-input"
                style={{
                    background: '#ffffff',
                    backgroundImage: 'none',
                    paddingRight: '30px'
                }}
            />
            {!isLoaded && (
                <div style={{
                    fontSize: '10px',
                    color: '#667eea',
                    marginTop: '4px',
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                }}>
                    ⌛
                </div>
            )}
            {debugInfo && !isLoaded && (
                <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                    {debugInfo}
                </div>
            )}
        </div>
    );
}
