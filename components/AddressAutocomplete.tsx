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
 * Uses an uncontrolled input approach for typing to prevent 
 * browser "locking" caused by heavy parent re-renders.
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
    const autocompleteRef = useRef<any>(null);

    // Initial value sync - only once on mount or if value changes significantly from outside
    useEffect(() => {
        if (inputRef.current && value !== inputRef.current.value) {
            inputRef.current.value = value;
        }
    }, [value]);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) return;

        let isMounted = true;

        loadGoogleMapsScript(GOOGLE_MAPS_API_KEY).then(() => {
            if (!isMounted || !inputRef.current) return;

            setIsLoaded(true);
            if (autocompleteRef.current) return;

            try {
                // @ts-ignore
                const google = window.google;
                if (!google?.maps?.places) return;

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
                console.error('Autocomplete initialization failed:', err);
            }
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent Enter from submitting form when selecting from autocomplete
            if (e.key === 'Enter' && document.querySelector('.pac-container')) {
                e.preventDefault();
            }
        };

        const handleInput = (e: any) => {
            // Sync current typing to parent (debounced if necessary, but here we just pass it)
            onChange(e.target.value);
        };

        const inputEl = inputRef.current;
        inputEl?.addEventListener('keydown', handleKeyDown);
        inputEl?.addEventListener('input', handleInput);

        return () => {
            isMounted = false;
            inputEl?.removeEventListener('keydown', handleKeyDown);
            inputEl?.removeEventListener('input', handleInput);
            if (autocompleteRef.current) {
                try {
                    // @ts-ignore
                    window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
                } catch (e) { }
            }
        };
    }, []);

    return (
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
                backgroundImage: 'none'
            }}
        />
    );
}
