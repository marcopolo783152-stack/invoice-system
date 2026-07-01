// Simple ArrayBuffer to Base64URL and vice-versa
export function bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const charCode of bytes) {
        str += String.fromCharCode(charCode);
    }
    const base64String = btoa(str);
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64urlToBuffer(base64url: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
    
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
}

export async function registerBiometric(employeeId: string, employeeName: string) {
    if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser.");
    }
    
    // Generate a random challenge
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    
    // Generate a unique user ID
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
            name: "Marco Polo Oriental Rugs",
            id: window.location.hostname
        },
        user: {
            id: userId,
            name: employeeName,
            displayName: employeeName
        },
        pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" }
        ],
        authenticatorSelection: {
            userVerification: "preferred"
        },
        timeout: 60000,
        attestation: "none"
    };

    const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential;
    
    if (!credential) {
        throw new Error("Failed to create credential");
    }

    // Return the credential ID to save in the database
    return credential.id;
}

export async function authenticateBiometric() {
    if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser.");
    }
    
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        userVerification: "preferred",
        timeout: 60000
    };

    const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
    }) as PublicKeyCredential;

    if (!assertion) {
        throw new Error("Authentication failed");
    }

    return assertion.id;
}
