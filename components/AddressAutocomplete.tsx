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
 * UNCONTROLLED ADDRESS AUTOCOMPLETE
 * 
 * This version uses a raw <input> that is NOT controlled by React state.
 * This GUARANTEES that React cannot steal focus or "lock" the field while typing.
 * Suggestions are also global (country restriction removed).
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
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync initial value from parent on mount
    useEffect(() => {
        if (inputRef.current && value && !inputRef.current.value) {
            inputRef.current.value = value;
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
                if (!google?.maps?.places) {
                    setError('Places API not found');
                    return;
                }

                autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
                    types: ['address'],
                    // REMOVED country restriction for global support
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
            } catch (err) {
                console.error('Autocomplete Init Error:', err);
                setError('Init Error');
            }
        }).catch(() => {
            setError('Load Error');
        });

        return () => { isMounted = false; };
    }, []);

    const handleBlur = () => {
        if (inputRef.current) {
            onChange(inputRef.current.value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            // Prevent Enter from submitting the form if a suggestion box is open
            if (document.querySelector('.pac-container')) {
                e.preventDefault();
            }
            if (inputRef.current) {
                onChange(inputRef.current.value);
            }
        }
    };

    return (
        <div style={{ width: '100%', position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                defaultValue={value}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={isLoaded ? placeholder : "Finding addresses..."}
                className={className}
                required={required}
                autoComplete="off"
                id="google-address-input"
                style={{
                    backgroundImage: 'none !important',
                    background: '#ffffff',
                    width: '100%'
                }}
            />
            {error && (
                <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '2px' }}>
                    {error}
                </div>
            )}
            {!isLoaded && !error && (
                <div style={{ position: 'absolute', right: '10px', top: '12px', fontSize: '12px' }}>
                    ⌛
                </div>
            )}
        </div>
    );
}
