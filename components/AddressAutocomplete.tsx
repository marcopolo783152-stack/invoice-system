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
    placeholder = "Start typing address...",
    className = "",
    required = false
}: AddressAutocompleteProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const autocompleteRef = useRef<any>(null);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            console.warn('Google Maps API Key is missing. Address Autocomplete will not work.');
            return;
        }

        loadGoogleMapsScript(GOOGLE_MAPS_API_KEY).then(() => {
            if (!inputRef.current) return;

            setIsLoaded(true);

            // Avoid double initialization
            if (autocompleteRef.current) return;

            // @ts-ignore - google is defined by the script
            autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
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

                    onAddressSelect({
                        street: street || place.formatted_address || '',
                        city,
                        state,
                        zip
                    });
                }
            });
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && document.querySelector('.pac-container')) {
                e.preventDefault();
            }
        };

        inputRef.current?.addEventListener('keydown', handleKeyDown);

        return () => {
            inputRef.current?.removeEventListener('keydown', handleKeyDown);
            if (autocompleteRef.current) {
                // @ts-ignore
                window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
        };
    }, []);

    return (
        <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isLoaded ? placeholder : "Loading address search..."}
            className={`${className} ${styles.addressInput}`}
            required={required}
            autoComplete="off"
        />
    );
}
