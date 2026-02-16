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
    const [localValue, setLocalValue] = useState(value);
    const autocompleteRef = useRef<any>(null);

    // Sync local value with parent value (prop) only when prop changes externally
    useEffect(() => {
        if (value !== localValue) {
            setLocalValue(value);
        }
    }, [value]);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            console.warn('Google Maps API Key is missing.');
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
                if (!google || !google.maps || !google.maps.places) return;

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
                    }
                });
            } catch (err) {
                console.error('Error initializing Autocomplete:', err);
            }
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && document.querySelector('.pac-container')) {
                // Prevent form submission if the user presses enter to select a suggestion
                e.preventDefault();
            }
        };

        inputRef.current?.addEventListener('keydown', handleKeyDown);

        return () => {
            isMounted = false;
            inputRef.current?.removeEventListener('keydown', handleKeyDown);
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
        onChange(val);
    };

    return (
        <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleChange}
            placeholder={isLoaded ? placeholder : "Finding addresses..."}
            className={`${className} ${styles.addressInput}`}
            required={required}
            autoComplete="off"
            style={{
                background: '#ffffff',
                backgroundImage: 'none'
            }}
        />
    );
}
