const fs = require('fs');

const path = 'app/(admin)/admin/invoices/clock/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Imports
content = content.replace(
    "import Link from 'next/link';",
    "import Link from 'next/link';\nimport * as faceapi from 'face-api.js';"
);

// 2. State
content = content.replace(
    "const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);",
    "const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);\n    const [isModelsLoaded, setIsModelsLoaded] = useState(false);"
);

// 3. useEffect Models
content = content.replace(
    "// Start Camera",
    `// Load face-api models
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                setIsModelsLoaded(true);
            } catch (error) {
                console.error("Failed to load models:", error);
            }
        };
        loadModels();

        // Start Camera`
);

// 4. handleBiometricClock
const newBiometric = `const handleBiometricClock = async () => {
        if (!isModelsLoaded) {
            setMessage('AI Models are still loading. Please wait a moment.');
            setStatus('ERROR');
            setTimeout(() => setStatus('IDLE'), 3000);
            return;
        }

        if (!videoRef.current) return;

        try {
            setStatus('LOADING');
            setMessage('Analyzing face...');

            const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                throw new Error("No face detected. Please look directly at the camera.");
            }

            const employees = await getEmployees();
            
            // Find the closest match
            let bestMatch: Employee | null = null;
            let lowestDistance = 1.0;

            for (const emp of employees) {
                if (emp.faceDescriptor) {
                    const distance = faceapi.euclideanDistance(
                        detection.descriptor,
                        new Float32Array(emp.faceDescriptor)
                    );
                    if (distance < lowestDistance) {
                        lowestDistance = distance;
                        bestMatch = emp;
                    }
                }
            }

            // Threshold for Face Match (0.6 is standard for face-api.js)
            if (bestMatch && lowestDistance < 0.55) {
                setMessage(\`Match found! Hello, \${bestMatch.name}. Verifying location...\`);
                setIdentifier(bestMatch.id);
                
                // Proceed to the normal clock-in process
                const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                await handleClock(fakeEvent, bestMatch.id);
            } else {
                throw new Error("Face not recognized in the system.");
            }

        } catch (error: any) {
            console.error("Biometric Clock Error:", error);
            setStatus('ERROR');
            setMessage(error.message || 'Face authentication failed.');
            speak("Authentication failed, please try again");
            setTimeout(() => setStatus('IDLE'), 5000);
        }
    };`;

content = content.replace(
    /const handleBiometricClock = async \(\) => \{[\s\S]*?\}\s+catch \(error: any\) \{[\s\S]*?\}\s+\};/,
    newBiometric
);

// 5. Button Text
content = content.replace(
    /disabled={status === 'LOADING'}.*?\s+style={{[\s\S]*?display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10[\s\S]*?}}\s+>\s+.*FACE \/ FINGERPRINT CLOCK/,
    `disabled={status === 'LOADING' || !isModelsLoaded}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.5)',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#10b981', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                }}
                            >
                                👤 {isModelsLoaded ? 'FACE RECOGNITION CLOCK' : 'LOADING AI...'}`
);

fs.writeFileSync(path, content);
console.log('Success');
