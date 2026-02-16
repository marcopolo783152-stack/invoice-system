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
 * STATE-ISOLATED ADDRESS AUTOCOMPLETE
 * 
 * This version uses local state for typing and only informs the parent
 * on blur or selection. This completely prevents the "locking" sensation
 * caused by heavy parent re-renders.
 */
export default function AddressAutocomplete({
    value,
    onChange,
    onAddressSelect,
    placeholder = "Enter street address",
    className = "",
    required = false
}: AddressAutocompleteProps) {
    // 1. Local state for what the user sees while they type
    const [localValue, setLocalValue] = useState(value);

    // 2. Refs to handle Google Maps and avoid re-render cycles
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync local state when parent value changes externally (but NOT while typing)
    useEffect(() => {
        if (!document.activeElement || document.activeElement !== inputRef.current) {
            setLocalValue(value || '');
        }
    }, [value]);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            setError('API Key is missing');
            return;
        }

        let isMounted = true;

        loadGoogleMapsScript(GOOGLE_MAPS_API_KEY).then(() => {
            if (!isMounted || !inputRef.current) return;

            setIsLoaded(true);

            if (autocompleteRef.current) return;

            try {
                // @ts-ignore
                const google = window.google;
                if (!google || !google.maps || !google.maps.places) {
                    setError('Places API not enabled');
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

                        setLocalValue(finalAddress);

                        onAddressSelect({
                            street: finalAddress,
                            city,
                            state,
                            zip
                        });

                        // Tell parent about the change
                        onChange(finalAddress);
                    }
                });
            } catch (err) {
                console.error('Google Maps Init Error:', err);
                setError('Initialization error');
            }
        }).catch(err => {
            console.error('Script load error:', err);
            setError('Failed to load Google Maps');
        });

        return () => {
            isMounted = false;
            if (autocompleteRef.current) {
                try {
                    // @ts-ignore
                    window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
                } catch (e) { }
            }
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        // We DO NOT call onChange(val) here to prevent parent from re-rendering
        // until the user is done or selects an address.
    };

    const handleBlur = () => {
        // Sync to parent when user finishes typing
        onChange(localValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            // Prevent Enter from submitting the form if a suggestion box is open
            if (document.querySelector('.pac-container')) {
                e.preventDefault();
            }
            // Force sync on Enter
            onChange(localValue);
        }
    };

    return (
        <div style={{ width: '100%', position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={isLoaded ? placeholder : "Finding addresses..."}
                className={className}
                required={required}
                autoComplete="off"
                style={{
                    backgroundImage: 'none !important',
                    background: '#ffffff'
                }}
            />
            {error && (
                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                    {error}
                </div>
            )}
            {!isLoaded && !error && (
                <div style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '12px', color: '#667eea' }}>
                    ⌛
                </div>
            )}
        </div>
    );
}
