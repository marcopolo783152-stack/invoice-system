/**
 * Utility to load the Google Maps JavaScript API script.
 */

let isLoading = false;
let isLoaded = false;
const callbacks: (() => void)[] = [];

export const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
    return new Promise((resolve) => {
        if (isLoaded) {
            resolve();
            return;
        }

        callbacks.push(resolve);

        if (isLoading) return;

        isLoading = true;

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            isLoaded = true;
            isLoading = false;
            callbacks.forEach(cb => cb());
        };
        script.onerror = () => {
            console.error('Failed to load Google Maps script');
            isLoading = false;
        };
        document.head.appendChild(script);
    });
};
