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
 * CUSTOM UI ADDRESS AUTOCOMPLETE
 * 
 * Instead of relying on Google's buggy/deprecated built-in dropdown, 
 * this component fetches predictions manually and renders a custom 
 * premium-styled dropdown. This is 100% immune to CSS issues and 
 * Google UI standard changes.
 */
export default function AddressAutocomplete({
    value,
    onChange,
    onAddressSelect,
    placeholder = "Enter street address",
    className = "",
    required = false
}: AddressAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value || '');
    const [predictions, setPredictions] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const autocompleteService = useRef<any>(null);
    const placesService = useRef<any>(null);
    const sessionToken = useRef<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync input value if parent value changes (and we aren't typing)
    useEffect(() => {
        if (value !== undefined && value !== inputValue && !showDropdown) {
            setInputValue(value);
        }
    }, [value]);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            setError('API Key is missing');
            return;
        }

        let isMounted = true;

        const initGoogle = async () => {
            try {
                // @ts-ignore
                if (!window.google) {
                    const script = document.createElement('script');
                    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`;
                    script.async = true;
                    script.defer = true;

                    const scriptPromise = new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = () => reject(new Error('Script failed to load'));
                    });

                    document.head.appendChild(script);
                    await scriptPromise;
                }

                if (!isMounted) return;

                // @ts-ignore
                const google = window.google;
                const { AutocompleteService, PlacesService } = await google.maps.importLibrary("places") as any;

                autocompleteService.current = new AutocompleteService();

                // PlacesService needs an HTML element for attribution, but we use it for data
                const dummyDiv = document.createElement('div');
                placesService.current = new PlacesService(dummyDiv);

                // @ts-ignore
                sessionToken.current = new google.maps.places.AutocompleteSessionToken();

                setIsLoaded(true);
                console.log('✅ Custom Autocomplete Service Initialized');
            } catch (err: any) {
                console.error('API Init Error:', err);
                setError(`API Error: ${err.message || 'Check Billing'}`);
            }
        };

        initGoogle();
        return () => { isMounted = false; };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        onChange(val);

        if (!val || val.length < 2 || !autocompleteService.current) {
            setPredictions([]);
            setShowDropdown(false);
            return;
        }

        autocompleteService.current.getPlacePredictions(
            {
                input: val,
                sessionToken: sessionToken.current,
                // No country restriction for global support
            },
            (results: any, status: any) => {
                // @ts-ignore
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    setPredictions(results);
                    setShowDropdown(true);
                } else {
                    setPredictions([]);
                    setShowDropdown(false);
                }
            }
        );
    };

    const handleSelectPrediction = (prediction: any) => {
        setInputValue(prediction.description);
        setShowDropdown(false);
        setPredictions([]);

        if (!placesService.current) return;

        placesService.current.getDetails(
            {
                placeId: prediction.place_id,
                fields: ['address_components', 'formatted_address'],
                sessionToken: sessionToken.current,
            },
            (place: any, status: any) => {
                // @ts-ignore
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
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

                    console.log('📍 Selected Address Details:', { street: finalAddress, city, state, zip });

                    setInputValue(finalAddress);

                    onAddressSelect({
                        street: finalAddress,
                        city,
                        state,
                        zip
                    });

                    onChange(finalAddress);

                    // Reset session token for next search
                    // @ts-ignore
                    sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
                }
            }
        );
    };

    return (
        <div style={{ width: '100%', position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder={isLoaded ? placeholder : "Initializing Autocomplete..."}
                className={className}
                required={required}
                autoComplete="off"
                id="google-address-input"
                style={{
                    backgroundImage: 'none !important',
                    background: '#ffffff',
                    display: 'block',
                    width: '100%',
                    borderColor: error ? '#ef4444' : undefined
                }}
            />

            {/* Premium Custom Dropdown */}
            {showDropdown && predictions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    marginTop: '8px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    zIndex: 99999,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    animation: 'slideUpFade 0.2s ease-out'
                }}>
                    {predictions.map((p, i) => (
                        <div
                            key={p.place_id}
                            onClick={() => handleSelectPrediction(p)}
                            style={{
                                padding: '12px 16px',
                                borderTop: i === 0 ? 'none' : '1px solid #f1f5f9',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: '#1a1f3c',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                            <span style={{ marginRight: '10px' }}>📍</span>
                            <div>
                                <div style={{ fontWeight: 600 }}>{p.structured_formatting.main_text}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{p.structured_formatting.secondary_text}</div>
                            </div>
                        </div>
                    ))}
                    <div style={{ padding: '8px 16px', fontSize: '10px', color: '#cbd5e1', textAlign: 'right', borderTop: '1px solid #f1f5f9' }}>
                        Powered by Google
                    </div>
                </div>
            )}

            {error && (
                <div style={{
                    color: '#ef4444',
                    fontSize: '11px',
                    marginTop: '4px',
                    padding: '8px',
                    background: '#fef2f2',
                    borderRadius: '8px',
                    border: '1px solid #fee2e2'
                }}>
                    {error}
                </div>
            )}

            {!isLoaded && !error && (
                <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '14px'
                }}>
                    ⌛
                </div>
            )}
        </div>
    );
}

// Ensure the animation exists
if (typeof document !== 'undefined' && !document.getElementById('custom-dropdown-styles')) {
    const style = document.createElement('style');
    style.id = 'custom-dropdown-styles';
    style.innerHTML = `
        @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}
