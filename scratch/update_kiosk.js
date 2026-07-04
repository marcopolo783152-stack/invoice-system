const fs = require('fs');

const clockPath = 'app/(admin)/admin/invoices/clock/page.tsx';
let clockContent = fs.readFileSync(clockPath, 'utf8');

// 1. Restore scaleX(-1) in clock page
clockContent = clockContent.replace(/<video[\s\S]*?style={{ width: '100%', height: '100%', objectFit: 'cover',[\s]*}}/m, 
    "<video \n                        ref={videoRef}\n                        onPlay={handleVideoPlay}\n                        autoPlay\n                        playsInline\n                        muted\n                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}");

clockContent = clockContent.replace(/<canvas[\s\S]*?style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',[\s]*}}\s*\/>/m, 
    "<canvas \n                        ref={canvasRef} \n                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} \n                    />");

// 2. Fix geolocation in handleClock
// Currently it is:
/*
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
            });

            const distance = calculateDistance(
...
*/

// Let's replace the whole handleClock
const oldHandleClock = `    const handleClock = async (e: React.FormEvent, overrideIdentifier?: string) => {
        e.preventDefault();
        const activeIdentifier = overrideIdentifier || identifier.trim();
        if (!activeIdentifier) return;

        setStatus('LOADING');
        setMessage('Verifying location...');

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
            });

            const distance = calculateDistance(
                position.coords.latitude,
                position.coords.longitude,
                SHOP_LAT,
                SHOP_LNG
            );

            let geoStatus = 'IN_ZONE';
            if (distance > MAX_DISTANCE_FT) {
                geoStatus = \`OUT_OF_ZONE (\${Math.round(distance)}ft away)\`;
                console.warn(\`User clocked in out of zone. Distance: \${distance}ft\`);
            }

            setMessage('Recording timestamp...');

            const result = await clockInOut(
                activeIdentifier, 
                undefined, 
                undefined, 
                { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }
            );

            setStatus('SUCCESS');
            setIdentifier('');
            setLastAction({ type: result.log.type, name: result.employee.name });
            
            speak(\`\${result.employee.name} clocked \${result.log.type.toLowerCase()} successfully\`);

            setTimeout(() => {
                setStatus('IDLE');
                setLastAction(null);
            }, 4000);

        } catch (error: any) {
            console.error(error);
            setStatus('ERROR');
            setMessage(error.message || 'Clock in failed');
            speak("Clock in failed, please try again");
            setTimeout(() => {
                setStatus('IDLE');
            }, 5000);
        }
    };`;

const newHandleClock = `    const handleClock = async (e: React.FormEvent, overrideIdentifier?: string) => {
        e.preventDefault();
        const activeIdentifier = overrideIdentifier || identifier.trim();
        if (!activeIdentifier) return;

        setStatus('LOADING');
        setMessage('Verifying location...');

        let locData = { lat: 0, lng: 0, accuracy: 0 };
        let geoStatus = 'UNKNOWN_LOCATION';

        try {
            // Add a timeout so it doesn't hang forever if location is blocked
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
            });

            const distance = calculateDistance(
                position.coords.latitude,
                position.coords.longitude,
                SHOP_LAT,
                SHOP_LNG
            );

            locData = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
            geoStatus = 'IN_ZONE';

            if (distance > MAX_DISTANCE_FT) {
                geoStatus = \`OUT_OF_ZONE (\${Math.round(distance)}ft away)\`;
                console.warn(\`User clocked in out of zone. Distance: \${distance}ft\`);
            }
        } catch (geoError) {
            console.warn('Geolocation failed or timed out:', geoError);
            // Proceed anyway, we don't want to block clock in!
        }

        try {
            setMessage('Recording timestamp...');

            const result = await clockInOut(
                activeIdentifier, 
                undefined, 
                undefined, 
                locData
            );

            setStatus('SUCCESS');
            setIdentifier('');
            setLastAction({ type: result.log.type, name: result.employee.name });
            
            speak(\`\${result.employee.name} clocked \${result.log.type.toLowerCase()} successfully\`);

            setTimeout(() => {
                setStatus('IDLE');
                setLastAction(null);
            }, 4000);

        } catch (error: any) {
            console.error(error);
            setStatus('ERROR');
            setMessage(error.message || 'Clock in failed');
            speak("Clock in failed, please try again");
            setTimeout(() => {
                setStatus('IDLE');
            }, 5000);
        }
    };`;

clockContent = clockContent.replace(oldHandleClock, newHandleClock);
fs.writeFileSync(clockPath, clockContent);


// 3. Restore scaleX(-1) in FaceRegistrationModal
const modalPath = 'components/FaceRegistrationModal.tsx';
let modalContent = fs.readFileSync(modalPath, 'utf8');

modalContent = modalContent.replace(/<video[\s\S]*?style={{ width: '100%', height: '100%', objectFit: 'cover',[\s]*}}/m, 
    "<video \n                        ref={videoRef}\n                        onPlay={handleVideoPlay}\n                        autoPlay\n                        playsInline\n                        muted\n                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}");

modalContent = modalContent.replace(/<canvas[\s\S]*?style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',[\s]*}}\s*\/>/m, 
    "<canvas \n                        ref={canvasRef} \n                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} \n                    />");

fs.writeFileSync(modalPath, modalContent);
console.log('Success');
